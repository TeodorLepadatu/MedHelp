def predict_disease(FILE_NAME, disease_name):
    import torch
    import torch.nn as nn
    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt
    import json
    from sklearn.preprocessing import MinMaxScaler
    from torch.utils.data import DataLoader, TensorDataset
    from torch.optim.lr_scheduler import CosineAnnealingLR

    LOOK_BACK = 15
    BATCH_SIZE = 16
    EPOCHS = 100
    LEARNING_RATE = 0.001

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def process_jsonl_data(file_path, target_country=None):
        print(f"Processing {file_path}...")
        records = []

        with open(file_path, 'r') as f:
            for line in f:
                try:
                    patient = json.loads(line)
                    country = patient.get('country')

                    if target_country and country != target_country:
                        continue

                    if 'previous_conversations' in patient:
                        for conv in patient['previous_conversations']:
                            diagnosis = conv.get('final_diagnostic', {}).get('most_probable_diagnostic', '')
                            # We want Influenza cases
                            if disease_name in diagnosis:
                                report_date = conv.get('report_date')
                                if report_date:
                                    records.append({'date': report_date})
                except json.JSONDecodeError:
                    continue

        if not records:
            raise ValueError(f"No {disease_name} records found. The file might be empty or the country name is incorrect.")

        df_raw = pd.DataFrame(records)
        df_raw['date'] = pd.to_datetime(df_raw['date'], utc=True)

        df_raw = df_raw.sort_values('date')

        # Aggregate to Weekly counts
        df_weekly = df_raw.groupby(pd.Grouper(key='date', freq='W-MON')).size().reset_index(name='cases')

        df_weekly.set_index('date', inplace=True)
        full_idx = pd.date_range(start=df_weekly.index.min(), end=df_weekly.index.max(), freq='W-MON')
        df_weekly = df_weekly.reindex(full_idx, fill_value=0)

        df_weekly['cases'] = df_weekly['cases'].rolling(window=4, min_periods=1).mean()

        df_weekly.reset_index(inplace=True)
        df_weekly.rename(columns={'index': 'date'}, inplace=True)

        return df_weekly


    try:
        df_country = process_jsonl_data(FILE_NAME)
        print(f"Data loaded. Total weeks: {len(df_country)}")
    except Exception as e:
        print(f"Error: {e}")
        exit()

    df_country.set_index('date', inplace=True)
    raw_values = df_country['cases'].values.reshape(-1, 1)

    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(raw_values)

    def create_sequences(data, seq_length):
        xs, ys = [], []
        if len(data) <= seq_length:
            return np.array([]), np.array([])

        for i in range(len(data) - seq_length):
            x = data[i:(i + seq_length)]
            y = data[i + seq_length]
            xs.append(x)
            ys.append(y)
        return np.array(xs), np.array(ys)


    X, y = create_sequences(scaled_data, LOOK_BACK)

    if len(X) < 10:
        print("ERROR: Not enough data points to train.")
        exit()

    X_tensor = torch.from_numpy(X).float()
    y_tensor = torch.from_numpy(y).float()

    split_idx = int(len(X_tensor) * 0.8)
    X_train, X_test = X_tensor[:split_idx], X_tensor[split_idx:]
    y_train, y_test = y_tensor[:split_idx], y_tensor[split_idx:]

    train_loader = DataLoader(TensorDataset(X_train, y_train), shuffle=True, batch_size=BATCH_SIZE)
    test_loader = DataLoader(TensorDataset(X_test, y_test), batch_size=BATCH_SIZE)


    class InfluenzaLSTM(nn.Module):
        def __init__(self, input_size=1, hidden_size=64, output_size=1):
            super(InfluenzaLSTM, self).__init__()
            self.lstm = nn.LSTM(input_size, hidden_size, num_layers=2, batch_first=True, dropout=0.2)
            self.linear = nn.Linear(hidden_size, output_size)

        def forward(self, x):
            out, _ = self.lstm(x)
            last_step = out[:, -1, :]
            prediction = self.linear(last_step)
            return prediction


    model = InfluenzaLSTM().to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE)
    scheduler = CosineAnnealingLR(optimizer, T_max=EPOCHS)

    print("\nStarting Training...")
    train_loss_history = []

    for epoch in range(EPOCHS):
        model.train()
        batch_losses = []
        for seq, label in train_loader:
            seq, label = seq.to(device), label.to(device)
            optimizer.zero_grad()
            output = model(seq)
            loss = criterion(output, label)
            loss.backward()
            optimizer.step()
            batch_losses.append(loss.item())

        scheduler.step()
        epoch_loss = np.mean(batch_losses) if batch_losses else 0
        train_loss_history.append(epoch_loss)

        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch + 1} | Loss: {epoch_loss:.6f}")

    model.eval()
    predictions = []
    with torch.no_grad():
        for seq, _ in test_loader:
            seq = seq.to(device)
            pred = model(seq)
            predictions.append(pred.cpu().numpy())

    if predictions:
        predictions = np.concatenate(predictions)

        y_test_real = scaler.inverse_transform(y_test.numpy())
        predictions_real = scaler.inverse_transform(predictions)

        test_dates = df_country.index[split_idx + LOOK_BACK:]

        # can be deleted
        plt.figure(figsize=(12, 6))
        plt.plot(test_dates, y_test_real, label='Actual (Smoothed)', color='#1f77b4', linewidth=2)
        plt.plot(test_dates, predictions_real, label='AI Prediction', color='#ff7f0e', linestyle='--', linewidth=2)
        plt.title("Diseease Forecasting: Actual vs AI Prediction (Smoothed Data)")
        plt.xlabel("Date")
        plt.ylabel("Weekly Cases (4-week Avg)")
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.savefig("disease_forecast_smoothed.png")
        plt.show()

    last_sequence = scaled_data[-LOOK_BACK:]
    input_tensor = torch.tensor(last_sequence).float().unsqueeze(0).to(device)

    with torch.no_grad():
        next_week_scaled = model(input_tensor)
        next_week_cases = scaler.inverse_transform(next_week_scaled.cpu().numpy())

    return next_week_cases[0][0]

import torch
import torch.nn as nn
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from torch.utils.data import DataLoader, TensorDataset
from torch.optim.lr_scheduler import CosineAnnealingLR

FILE_NAME = "influenza_weekly.csv"
TARGET_COUNTRY = "Romania"
LOOK_BACK = 15
BATCH_SIZE = 16
EPOCHS = 100
LEARNING_RATE = 0.001

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {device}")


print(f"Loading data from {FILE_NAME}...")
df = pd.read_csv(FILE_NAME)

df_country = df[df['Country'] == TARGET_COUNTRY].copy()
df_country = df_country[['SDATE', 'ALL_INF']]
df_country['SDATE'] = pd.to_datetime(df_country['SDATE'])
df_country = df_country.rename(columns={'SDATE': 'date', 'ALL_INF': 'cases'})
df_country = df_country.sort_values('date')

df_country.set_index('date', inplace=True)
full_idx = pd.date_range(start=df_country.index.min(), end=df_country.index.max(), freq='W-MON')
df_country = df_country.reindex(full_idx, fill_value=0)
df_country['cases'] = df_country['cases'].fillna(0)

raw_values = df_country['cases'].values.reshape(-1, 1)
scaler = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(raw_values)

def create_sequences(data, seq_length):
    xs, ys = [], []
    for i in range(len(data) - seq_length):
        x = data[i:(i + seq_length)]
        y = data[i + seq_length]
        xs.append(x)
        ys.append(y)
    return np.array(xs), np.array(ys)

X, y = create_sequences(scaled_data, LOOK_BACK)

X_tensor = torch.from_numpy(X).float()
y_tensor = torch.from_numpy(y).float()

split_idx = int(len(X_tensor) * 0.8)
X_train, X_test = X_tensor[:split_idx], X_tensor[split_idx:]
y_train, y_test = y_tensor[:split_idx], y_tensor[split_idx:]

train_loader = DataLoader(TensorDataset(X_train, y_train), shuffle=True, batch_size=BATCH_SIZE)
test_loader = DataLoader(TensorDataset(X_test, y_test), batch_size=BATCH_SIZE)

print(f" Training Samples: {len(X_train)} | Test Samples: {len(X_test)}")

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
scheduler = CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)

print("\n  Starting Training...")

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
    epoch_loss = np.mean(batch_losses) if batch_losses else 0.0
    train_loss_history.append(epoch_loss)
    current_lr = optimizer.param_groups[0]['lr']
    if (epoch + 1) % 10 == 0 or epoch == 0:
        print(f"   Epoch {epoch + 1}/{EPOCHS} | Loss: {epoch_loss:.6f} | LR: {current_lr:.6e}")

print("\n Evaluating...")
model.eval()
predictions = []

with torch.no_grad():
    for seq, _ in test_loader:
        seq = seq.to(device)
        pred = model(seq)
        predictions.append(pred.cpu().numpy())

if predictions:
    predictions = np.concatenate(predictions)
else:
    predictions = np.zeros((len(y_test), 1))

# Inverse Scale
y_test_real = scaler.inverse_transform(y_test.numpy())
predictions_real = scaler.inverse_transform(predictions)

test_dates = df_country.index[split_idx + LOOK_BACK:]

plt.figure(figsize=(12, 6))
plt.plot(test_dates, y_test_real, label='Actual Cases', color='#1f77b4', linewidth=2)
plt.plot(test_dates, predictions_real, label='AI Prediction', color='#ff7f0e', linestyle='--', linewidth=2)
plt.title(f"Influenza Weekly Forecast: {TARGET_COUNTRY}")
plt.xlabel("Date")
plt.ylabel("Weekly Cases")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()

plt.figure(figsize=(8, 4))
plt.plot(range(1, len(train_loss_history)+1), train_loss_history, label='Train Loss')
plt.xlabel("Epoch")
plt.ylabel("MSE Loss")
plt.title("Training Loss")
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()


last_sequence = scaled_data[-LOOK_BACK:]
input_tensor = torch.tensor(last_sequence).float().unsqueeze(0).to(device)

with torch.no_grad():
    next_week_scaled = model(input_tensor)
    next_week_cases = scaler.inverse_transform(next_week_scaled.cpu().numpy())

print(f"\n FORECAST for Next Week in {TARGET_COUNTRY}:")
print(f"   {int(next_week_cases[0][0])} predicted cases")
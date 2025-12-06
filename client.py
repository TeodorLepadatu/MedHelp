import requests
import json
import sys

SERVER_URL = "http://127.0.0.1:8000/triage_step"
MAX_QUESTIONS = 5
TOP_K_OUTPUT = 3


def serve_loop():
    print("\n--- Medical Symptom Triage (Pure AI) ---")

    user_text = input("Describe your symptoms:\n> ").strip()

    conversation_history = f"Patient initial complaint: {user_text}"

    # We use this variable to ensure we always have data for the final print
    last_ai_content = {}

    for qn in range(MAX_QUESTIONS):
        print(f"\n... Analyzing (Round {qn + 1}) ...")

        try:
            payload = {"history": conversation_history}
            resp = requests.post(SERVER_URL, json=payload)
            data = resp.json()

            if "error" in data:
                print(f"Error: {data['error']}")
                break

            ai_content = json.loads(data["gpt_json"])
            last_ai_content = ai_content

            # --- 1. DISPLAY CURRENT HYPOTHESES ---
            candidates = ai_content.get("candidates", [])
            candidates.sort(key=lambda x: x['probability'], reverse=True)

            print(f"\nTop Suspected Conditions:")
            for item in candidates[:TOP_K_OUTPUT]:
                print(f"  🔹 {item['condition']}: {item['probability']:.2f}")

            # --- 2. CHECK IF AI IS DONE ---
            question = ai_content.get("next_question", "")
            if question == "DIAGNOSIS_COMPLETE":
                #print("\n(AI has enough information to conclude.)")
                break

            # --- 3. ASK USER (WITH EXIT OPTION) ---
            print(f"\nAI Question: {question}")

            # UPDATED: Explicit instruction to type 'report'
            ans = input("Answer (or type 'report' to finish immediately):\n> ").strip()

            # UPDATED: Check for exit keywords
            # If user types these, we BREAK the loop, which sends them to the "Final Report" section below.
            if ans.lower() in ['report', 'done', 'stop', 'exit', 'quit', 'q']:
                print("\n>> Stopping interview and generating report...")
                break

            conversation_history += f" | Question: {question} Answer: {ans}"

        except Exception as e:
            print(f"Connection Error: {e}")
            break

    # === FINAL REPORT SECTION ===
    # This runs whenever the loop finishes (either naturally or via 'break')
    print("\n" + "=" * 60)
    print(" 📋 FINAL MEDICAL ANALYSIS")
    print("=" * 60)

    if last_ai_content:
        # 1. Probabilities Table
        candidates = last_ai_content.get("candidates", [])
        candidates.sort(key=lambda x: x['probability'], reverse=True)

        print(f"{'CONDITION':<30} | {'CONFIDENCE':<10}")
        print("-" * 45)
        for item in candidates[:TOP_K_OUTPUT]:
            print(f"{item['condition']:<30} | {int(item['probability'] * 100)}%")

        # 2. Recommendation
        print("-" * 60)
        print(f"\nADVICE:\n> {last_ai_content.get('top_recommendation')}")
        print("=" * 60)
    else:
        print("No analysis data available.")


if __name__ == "__main__":
    serve_loop()
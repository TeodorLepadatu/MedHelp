import requests
import json
import sys

SERVER_URL = "http://127.0.0.1:8000"
TOP_K_OUTPUT = 3
MAX_QUESTIONS = 10

def ingest_mode():
    print("\n--- Knowledge Ingestion Mode ---")
    url = input("Enter a valid medical URL to ingest:\n> ").strip()
    if not url: return
    
    print("⏳ Ingesting...")
    try:
        resp = requests.post(f"{SERVER_URL}/ingest_url", json={"url": url})
        if resp.status_code == 200:
            print(f"✅ Success: {resp.json().get('message')}")
        else:
            print(f"❌ Error: {resp.text}")
    except Exception as e:
        print(f"Connection Failed: {e}")

def show_index_info():
    try:
        resp = requests.get(f"{SERVER_URL}/index_info")
        data = resp.json()
        print(f"\n📊 Current RAG Index Status:")
        print(f"   - Total Text Chunks: {data.get('num_chunks')}")
        print(f"   - FAISS Optimized: {data.get('has_faiss')}")
    except Exception as e:
        print(f"Could not fetch info: {e}")

def serve_loop():
    print("\n" + "="*60)
    print(" 🏥 MedHelp AI Triage + RAG ")
    print("="*60)
    print("Commands: /ingest (add data) | /info (check DB) | or just type symptoms.")

    user_input = input("\nDescribe your symptoms (or command):\n> ").strip()

    turn_counter = 1
    
    # Command Handling
    if user_input.startswith("/ingest"):
        ingest_mode()
        return serve_loop()
    elif user_input.startswith("/info"):
        show_index_info()
        return serve_loop()
    
    # Start Triage Session
    current_conv_id = None # Start new chat
    current_message = user_input
    
    while True:
        print(f"\n🔄 Analyzing...")

        payload = {
            "message": current_message,
            "conversation_id": current_conv_id
        }

        try:
            resp = requests.post(f"{SERVER_URL}/chat_step", json=payload)
            data = resp.json()

            if "error" in data:
                print(f"Server Error: {data['error']}")
                break

            # Parse the inner JSON string containing the medical analysis
            ai_data = json.loads(data["gpt_json"])
            current_conv_id = data["conversation_id"]

            # --- 1. RAG Feedback ---
            if ai_data.get("evidence_used"):
                print(f"📚 RAG Evidence Used: YES")
                print(f"   Reasoning: {ai_data.get('evidence_reasoning')}")
                retrieved = ai_data.get("_retrieved", [])
                if retrieved:
                    print(f"   Sources: {', '.join([r['source_title'][:20] + '...' for r in retrieved])}")
            else:
                print("⚠️  No specific RAG evidence found/used for this step.")

            # --- 2. Current Probabilities ---
            candidates = ai_data.get("candidates", [])
            if candidates:
                print(f"\n🔍 Top Hypotheses:")
                candidates.sort(key=lambda x: x['probability'], reverse=True)
                for c in candidates[:TOP_K_OUTPUT]:
                    print(f"   • {c['condition']}: {int(c['probability']*100)}%")

            # --- 3. Check for Completion ---
            next_q = ai_data.get("next_question", "")
            
            if next_q == "DIAGNOSIS_COMPLETE":
                print("\n" + "="*60)
                print(" 📋 FINAL REPORT")
                print("="*60)
                
                # Re-display final candidates cleanly
                print(f"{'CONDITION':<30} | CONFIDENCE")
                print("-" * 45)
                for c in candidates[:TOP_K_OUTPUT]:
                    print(f"{c['condition']:<30} | {int(c['probability']*100)}%")
                
                print("\n💡 ADVICE:")
                print(ai_data.get("top_recommendation"))
            
            
                retrieved = ai_data.get("_retrieved", [])
                if retrieved:
                    print("\n📚 REFERENCE SOURCES:")
                    print("-" * 45)
                    for i, r in enumerate(retrieved, 1):
                        title = r.get('source_title', 'Medical Source')
                        url = r.get('url', '#')
                        print(f"{i}. {title}")
                        print(f"   🔗 {url}")
                else:
                    print("\n(No specific medical sources were cited for this diagnosis)")

                break
            
            # --- 4. Next Question Loop ---
            print(f"\n🤖 AI: {next_q}")
            
            ans = input("\nYour Answer (or 'exit'):\n> ").strip()
            if ans.lower() in ['exit', 'quit', 'stop']:
                break
            
            
            turn_counter += 1
            current_message = ans

        except Exception as e:
            print(f"Client Exception: {e}")
            break

if __name__ == "__main__":
    serve_loop()
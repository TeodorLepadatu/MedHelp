import os
import json
import time
import pickle
import requests
import numpy as np
from datetime import datetime
from typing import List, Tuple, Optional
from bson import ObjectId
from bs4 import BeautifulSoup

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from pymongo import MongoClient

MAX_QUESTIONS = 10

# Optional FAISS for faster search
try:
    import faiss
    _HAS_FAISS = True
except ImportError:
    faiss = None
    _HAS_FAISS = False

# 1. Setup & Config
load_dotenv("backend/sourceCode/.env") # Keep your existing path

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MONGO_URI = os.getenv("MONGO_CONNECTION_STRING")
EMBED_MODEL = "text-embedding-3-small"
INDEX_PKL = "rag_index.pkl"
SIMILARITY_THRESHOLD = 0.25
TOP_K = 3

if not OPENAI_API_KEY:
    print("CRITICAL: OPENAI_API_KEY not found in .env")

client = OpenAI(api_key=OPENAI_API_KEY)

# MongoDB Setup
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["medical_triage_db"]
conversations_collection = db["Conversations"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- RAG STATE ----------
# Global index to hold embeddings and metadata
index = {"embeddings": None, "metadatas": [], "dim": None}
faiss_index = None

# Trusted Default Sites
TRUSTED_SITES = [
    {"url": "https://www.cdc.gov/health/conditions", "category": "Government Health"},
    {"url": "https://www.who.int/health-topics", "category": "International Health"},
    {"url": "https://www.nhs.uk/conditions", "category": "UK Health Service"},
    {"url": "https://www.mayoclinic.org/diseases-conditions", "category": "Medical Research"},
    {"url": "https://www.medicinenet.com/conditions.htm", "category": "Medical Reference"},
    {"url": "https://www.webmd.com/a-to-z-guides/health-topics", "category": "Health Information"},
    {"url": "https://www.healthline.com/health", "category": "Health Information"},
    {"url": "https://www.nih.gov/health-information", "category": "Government Health"},
    {"url": "https://www.clevelandclinic.org/health/diseases", "category": "Medical Research"},
    {"url": "https://medlineplus.gov/encyclopedia.html", "category": "Medical Encyclopedia"},
]


# 2. Data Models
class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

class IngestRequest(BaseModel):
    url: str

class BuildIndexRequest(BaseModel):
    persist: bool = True

# 3. RAG Helper Functions






def ingest_trusted_sites():
    print("🔄 Ingesting trusted medical websites...")
    success_count = 0
    
    for site in TRUSTED_SITES:
        url = site["url"]
        category = site["category"]
        try:
            print(f"   Downloading {url}...")
            title, text = scrape_url(url)
            if not text:
                print(f"   ⚠️ No text found for {url}")
                continue

            chunks = chunk_text(text)
            embs = embed_texts(chunks)
            
            metas = [{
                "source_title": title,
                "url": url,
                "text": chunk,
                "category": category,
                "ingested_at": time.time()
            } for chunk in chunks]
            
            add_to_index(embs, metas)
            success_count += 1
            print(f"   ✅ Ingested {len(chunks)} chunks from {title}")
            
        except Exception as e:
            print(f"   ❌ Failed {url}: {e}")

    if success_count > 0:
        save_index()
        print("💾 Index saved to disk.")






def scrape_url(url: str) -> Tuple[str, str]:
    """Scrapes text content from a URL."""
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, timeout=10, headers=headers)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Cleanup
        for tag in soup(["script", "style", "nav", "footer"]):
            tag.decompose()
            
        title = soup.title.string.strip() if soup.title else url
        # Try to find main content, fallback to body
        content_div = soup.find("main") or soup.find("div", {"id": "content"}) or soup.body
        
        paragraphs = [p.get_text(separator=" ", strip=True) for p in content_div.find_all("p")]
        text = "\n\n".join([p for p in paragraphs if len(p) > 50])
        
        return title, text
    except Exception as e:
        print(f"Scrape error for {url}: {e}")
        return url, ""

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """Splits text into overlapping chunks."""
    text = text.strip()
    if not text: return []
    chunks = []
    i = 0
    while i < len(text):
        end = min(i + chunk_size, len(text))
        chunk = text[i:end].strip()
        if chunk:
            chunks.append(chunk)
        i += (chunk_size - overlap)
    return chunks

def embed_texts(texts: List[str]) -> np.ndarray:
    """Generates embeddings using OpenAI."""
    if not texts: return np.array([])
    embeddings = []
    # Batch processing
    for i in range(0, len(texts), 32):
        batch = texts[i:i + 32]
        try:
            res = client.embeddings.create(model=EMBED_MODEL, input=batch)
            embeddings.extend([r.embedding for r in res.data])
        except Exception as e:
            print(f"Embedding error: {e}")
    return np.array(embeddings, dtype=np.float32)

def save_index():
    """Saves the RAG index to disk."""
    with open(INDEX_PKL, "wb") as f:
        pickle.dump({
            "index": index,
            "has_faiss": _HAS_FAISS,
            # We don't serialize FAISS object directly here to keep it simple, 
            # we rely on rebuilding faiss from numpy on load or using numpy fallback
        }, f)

def load_index():
    """Loads the RAG index from disk."""
    global index, faiss_index
    if not os.path.exists(INDEX_PKL):
        return False
    try:
        with open(INDEX_PKL, "rb") as f:
            data = pickle.load(f)
        index.update(data.get("index", {}))
        # Rebuild FAISS if available
        if _HAS_FAISS and index["embeddings"] is not None:
            build_faiss_from_numpy(index["embeddings"])
        return True
    except Exception as e:
        print(f"Error loading index: {e}")
        return False

def build_faiss_from_numpy(embs: np.ndarray):
    global faiss_index
    if _HAS_FAISS and len(embs) > 0:
        d = embs.shape[1]
        idx = faiss.IndexFlatIP(d)
        faiss.normalize_L2(embs)
        idx.add(embs)
        faiss_index = idx

def add_to_index(new_embeddings: np.ndarray, new_metadatas: List[dict]):
    global index
    if len(new_embeddings) == 0: return

    if index["embeddings"] is None:
        index["embeddings"] = new_embeddings
    else:
        index["embeddings"] = np.vstack([index["embeddings"], new_embeddings])
    
    index["metadatas"].extend(new_metadatas)
    index["dim"] = index["embeddings"].shape[1]
    
    if _HAS_FAISS:
        build_faiss_from_numpy(index["embeddings"])

def retrieve(query: str, top_k: int = TOP_K) -> List[dict]:
    """Finds relevant chunks for the user query."""
    if index["embeddings"] is None or len(index["metadatas"]) == 0:
        return []

    # Create embedding for query
    try:
        q_emb = embed_texts([query])[0]
    except Exception:
        return []

    # Search logic
    if _HAS_FAISS and faiss_index is not None:
        q = q_emb.reshape(1, -1).astype(np.float32)
        faiss.normalize_L2(q)
        distances, idxs = faiss_index.search(q, top_k)
        res = []
        for i, idx in enumerate(idxs[0]):
            if idx < 0 or idx >= len(index["metadatas"]): continue
            meta = index["metadatas"][idx].copy()
            meta["score"] = float(distances[0][i])
            if meta["score"] >= SIMILARITY_THRESHOLD:
                res.append(meta)
        return res
    else:
        # Numpy Fallback (Cosine Similarity)
        embs = index["embeddings"]
        # Normalize
        norm_embs = embs / (np.linalg.norm(embs, axis=1, keepdims=True) + 1e-12)
        norm_q = q_emb / (np.linalg.norm(q_emb) + 1e-12)
        scores = np.dot(norm_embs, norm_q)
        
        top_indices = np.argsort(scores)[::-1][:top_k]
        res = []
        for idx in top_indices:
            score = float(scores[idx])
            if score >= SIMILARITY_THRESHOLD:
                meta = index["metadatas"][idx].copy()
                meta["score"] = score
                res.append(meta)
        return res

# 4. Standard Helpers
def format_conversation_for_ai(messages):
    """Reconstructs history string."""
    history_str = ""
    for msg in messages:
        sender = msg.get("sender", "")
        text = msg.get("text", "")
        if sender == "user":
            history_str += f" | Patient: {text}"
        elif sender == "bot":
            if "Final Medical Analysis" not in text:
                history_str += f" | AI Question: {text}"
    return history_str

def format_final_report(ai_data):
    """Generates the text report for storage in DB, including RAG links."""
    report = "📋 **FINAL MEDICAL ANALYSIS**\n\n"
    
    # 1. List Candidates
    if ai_data.get("candidates"):
        report += "Top Suspected Conditions:\n"
        candidates = sorted(ai_data["candidates"], key=lambda x: x['probability'], reverse=True)
        for c in candidates:
            pct = round(c['probability'] * 100)
            report += f"• {c['condition']} ({pct}%)\n"
    
    # 2. Add Advice
    report += f"\n💡 **ADVICE:**\n{ai_data.get('top_recommendation', '')}\n"

    # 3. Add Resources (The missing part)
    # We check if there are retrieved docs in the AI response
    retrieved = ai_data.get("_retrieved", [])
    if retrieved:
        report += "\n📚 **REFERENCE SOURCES:**\n"
        for i, r in enumerate(retrieved, 1):
            title = r.get('source_title', 'Medical Source')
            url = r.get('url', '#')
            # Add simple formatting for the link
            report += f"{i}. {title}\n   🔗 {url}\n"

    return report

# 5. API Endpoints

@app.on_event("startup")
def startup_event():
    if not load_index():
        print("Empty index. Run client /ingest to add data, or uncomment ingest_trusted_sites() logic.")
        # Optional: Auto-ingest on first run
        ingest_trusted_sites() 
    else:
        print(f"✅ Loaded RAG index with {len(index['metadatas'])} chunks.")

@app.post("/ingest_url")
def ingest_url_endpoint(req: IngestRequest):
    title, text = scrape_url(req.url)
    if not text:
        raise HTTPException(400, "Could not extract text from URL")
    
    chunks = chunk_text(text)
    embs = embed_texts(chunks)
    metas = [{
        "source_title": title,
        "url": req.url,
        "text": chunk,
        "category": "User Ingested",
        "ingested_at": time.time()
    } for chunk in chunks]
    
    add_to_index(embs, metas)
    save_index()
    return {"message": f"Ingested {len(chunks)} chunks from {title}"}

@app.get("/index_info")
def get_index_info():
    return {
        "num_chunks": len(index["metadatas"]),
        "has_faiss": _HAS_FAISS
    }



# ... (imports and setup remain the same) ...

MAX_QUESTIONS_LIMIT = 5  # Set your desired limit here

@app.post("/chat_step")
def chat_step(req: ChatRequest):
    """Main Handler: RAG Retrieval + History + GPT-4 Analysis"""
    
    # A. Retrieve/Create Chat
    if req.conversation_id:
        chat = conversations_collection.find_one({"_id": ObjectId(req.conversation_id)})
        if not chat: raise HTTPException(404, "Chat not found")
        conversation_id = ObjectId(req.conversation_id)
    else:
        new_chat = {
            "title": req.message[:30] + "...",
            "created_at": datetime.now(),
            "messages": []
        }
        res = conversations_collection.insert_one(new_chat)
        conversation_id = res.inserted_id
        chat = new_chat

    # B. Save User Message
    user_msg_entry = {
        "sender": "user",
        "text": req.message,
        "timestamp": datetime.now().isoformat()
    }
    conversations_collection.update_one(
        {"_id": conversation_id},
        {"$push": {"messages": user_msg_entry}}
    )

    # C. RAG RETRIEVAL
    query_text = f"{req.message} symptoms diagnosis medical"
    retrieved_docs = retrieve(query_text, top_k=3)
    
    evidence_block = ""
    if retrieved_docs:
        evidence_texts = []
        for r in retrieved_docs:
            evidence_texts.append(f"Source: {r['source_title']} (Score: {r['score']:.2f})\nContent: {r['text'][:400]}...")
        evidence_block = "\n\n=== RELEVANT MEDICAL KNOWLEDGE ===\n" + "\n---\n".join(evidence_texts) + "\n==================================\n"

    # D. Build Prompt
    # Fetch updated history to count turns
    updated_chat = conversations_collection.find_one({"_id": conversation_id})
    history_str = format_conversation_for_ai(updated_chat["messages"])

    # --- NEW: COUNT QUESTIONS ---
    # We count how many times the bot has spoken previously (excluding the final report if it exists)
    bot_turn_count = len([m for m in updated_chat["messages"] if m["sender"] == "bot"])
    
    # Base Instructions
    system_instructions = """You are a medical triage assistant. 
    Analyze the history and evidence. 
    Respond ONLY with valid JSON."""

    # Dynamic Instructions based on Turn Count
    if bot_turn_count >= MAX_QUESTIONS_LIMIT:
        system_instructions += """
        \nCRITICAL UPDATE: You have reached the maximum number of questions.
        1. You MUST set "next_question" to "DIAGNOSIS_COMPLETE".
        2. Provide your final "top_recommendation" now.
        3. Do not ask any more questions.
        """
    else:
        system_instructions += f"""
        \nThis is Question {bot_turn_count + 1} of {MAX_QUESTIONS_LIMIT}.
        If you have enough info, set "next_question" to "DIAGNOSIS_COMPLETE".
        Otherwise, ask a specific follow-up question.
        """

    system_prompt = f"""{system_instructions}

    RESPOND ONLY WITH VALID JSON IN THIS EXACT FORMAT (no markdown, no code blocks):
{{
    "candidates": [
    {{"condition": "Condition Name 1", "probability": 0.5}},
    {{"condition": "Condition Name 2", "probability": 0.3}},
    {{"condition": "Condition Name 3", "probability": 0.2}}
  ],
  "next_question": "Your follow-up question here",
  "top_recommendation": "Advice for most likely condition",
  "evidence_used": true,
  "evidence_reasoning": "Explain if/how you used the evidence"
}}

RULES:
- ALWAYS include at least 2-3 candidates
- Each candidate MUST have "condition" (string) and "probability" (number 0-1)
- Probabilities should sum to ~1.0
- Use the medical evidence if relevant
- Return ONLY the JSON, nothing else"""
    
    user_content = f"{evidence_block}\n\nPatient History: {history_str}"

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.3
        )
        gpt_json_str = response.choices[0].message.content
        ai_data = json.loads(gpt_json_str)
        
        ai_data["_retrieved"] = retrieved_docs

        # E. Determine Bot Response
        if ai_data.get("next_question") == "DIAGNOSIS_COMPLETE":
            bot_text = format_final_report(ai_data)
        else:
            bot_text = ai_data.get("next_question")

        # F. Save Bot Message
        bot_msg_entry = {
            "sender": "bot",
            "text": bot_text,
            "timestamp": datetime.now().isoformat(),
            "retrieved_sources": [d['url'] for d in retrieved_docs] if retrieved_docs else []
        }
        conversations_collection.update_one(
            {"_id": conversation_id},
            {"$push": {"messages": bot_msg_entry}}
        )

        return {
            "gpt_json": json.dumps(ai_data), 
            "conversation_id": str(conversation_id)
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}



@app.get("/conversations")
def get_conversations():
    chats = conversations_collection.find().sort("created_at", -1)
    results = []
    for chat in chats:
        results.append({
            "id": str(chat["_id"]),
            "title": chat.get("title", "New Consultation"),
            "date": chat.get("created_at")
        })
    return results

@app.get("/conversations/{conversation_id}")
def get_conversation_details(conversation_id: str):
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(400, "Invalid ID")
    chat = conversations_collection.find_one({"_id": ObjectId(conversation_id)})
    if not chat:
        raise HTTPException(404, "Chat not found")
    # Convert ObjectIds
    for msg in chat.get("messages", []):
        if isinstance(msg, dict):
            msg.pop("_id", None)
    return {"messages": chat.get("messages", [])}
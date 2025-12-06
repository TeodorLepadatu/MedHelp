import os
import json
from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI

# Make sure you set your key: export OPENAI_API_KEY="sk-..."
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app = FastAPI(title="Pure AI Triage System")


class TriageRequest(BaseModel):
    history: str


@app.post("/triage_step")
def chat_with_gpt(req: TriageRequest):
    try:
        # We still ask for 'required_specialist' so the AI can tell you WHO to see,
        # but we won't search for them on a map.
        system_prompt = (
            "You are a medical triage system. "
            "Output a JSON object with these keys:\n"
            "1. 'candidates': List of {condition, probability}.\n"
            "2. 'next_question': The next question (or 'DIAGNOSIS_COMPLETE').\n"
            "3. 'top_recommendation': Advice for the top condition.\n"
        )

        user_content = f"Patient History: {req.history}"

        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.3
        )

        # Return the raw AI analysis only
        gpt_json = response.choices[0].message.content
        return {"gpt_json": gpt_json}

    except Exception as e:
        return {"error": str(e)}
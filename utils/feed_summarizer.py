from dotenv import load_dotenv
import os
import json
from openai import OpenAI
from utils.vectorstore_utils import get_retriever
import json
import datetime

load_dotenv()

class FeedSummarizer:
    def __init__(self):
        self.api_key = os.environ.get("GROQ_API_KEY")
        self.model = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
        self.base_url = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

    def _generate_text(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        return response.choices[0].message.content.strip()

    def _extract_field(self, content: str, field: str, fallback: str = "") -> str:
        prefix = f"{field}:"
        for line in content.splitlines():
            line = line.strip()
            if line.lower().startswith(prefix.lower()):
                return line.split(":", 1)[1].strip() or fallback
        return fallback

    def generate_feed_summary(self, investor_id: str, investor_query: str, retrieved_info: str, documents=None):
        """
        Creates AI summaries of top matched pitches using actual pitch metadata.
        """
        
        # If we have documents with metadata, use the actual IDs
        if documents and len(documents) > 0:
            matches = []
            for doc in documents[:10]:  # Top 10 matches
                metadata = doc.metadata
                title = metadata.get("title") or self._extract_field(doc.page_content, "Title", "Startup Pitch")
                matches.append({
                    "pitch_id": metadata.get("pitch_id", "unknown"),
                    "entrepreneur_id": metadata.get("entrepreneur_id", "unknown"),
                    "title": title,
                    "industry": metadata.get("industry") or self._extract_field(doc.page_content, "Industry", "General"),
                    "stage": metadata.get("stage") or self._extract_field(doc.page_content, "Stage", "Early Stage"),
                    "funding_amount": metadata.get("funding_amount") or self._extract_field(doc.page_content, "Funding Amount", "Not specified"),
                    "summary": self._generate_pitch_summary(doc.page_content, investor_query),
                    "raw_content": doc.page_content[:200] + "..."  # Keep some original content
                })
            
            return {
                "investor_id": investor_id,
                "matches": matches,
                "generated_at": datetime.datetime.utcnow().isoformat()
            }
        
        # Fallback to AI generation if no documents provided
        prompt_text = f"""
You are an AI that matches investors to startup pitches.
Using the provided context (retrieved pitches), return a clean JSON array of the best 10 matches.

Each item in the array must contain:
- "pitch_id": unique id of the startup pitch
- "entrepreneur_id": id of the entrepreneur who submitted it
- "title": title of the pitch
- "summary": one concise line explaining why it matches investor interests.

⚠️ Rules:
1. Output must be VALID JSON only — no extra text or markdown.
2. Use only data from the context (do NOT make up IDs or titles).
3. Return an object in this format:

{{
  "investor_id": "{investor_id}",
  "matches": [
    {{
      "pitch_id": "...",
      "entrepreneur_id": "...",
      "title": "...",
      "summary": "..."
    }},
    ...
  ]
}}

Context (pitch data):
{retrieved_info}

Investor interest/query:
{investor_query}
"""

        try:
            response_text = self._generate_text(prompt_text)
            
            # Clean JSON extraction
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            json_str = response_text[start:end]

            data = json.loads(json_str)
            return data

        except Exception as e:
            print(f" Error generating feed summary: {e}")
            return {
                "investor_id": investor_id,
                "matches": [],
                "error": str(e)
            }
    
    def _generate_pitch_summary(self, pitch_content: str, investor_query: str) -> str:
        """Generate a concise summary explaining why this pitch matches the investor"""
        prompt = f"""
        Based on this pitch content and investor interests, create one concise sentence explaining the match.
        
        Pitch Content: {pitch_content[:500]}
        Investor Interests: {investor_query}
        
        Summary (1 sentence):
        """
        
        try:
            return self._generate_text(prompt)
        except:
            return "This startup aligns with your investment interests."

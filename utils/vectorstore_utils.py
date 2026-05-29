import os
import json
from dotenv import load_dotenv
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
from langchain.schema import Document

# ---------------------------- CONFIG ---------------------------- #
load_dotenv()
INDEX_PATH = "faiss_index"       # folder where FAISS index is stored
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# ---------------------------- INIT ---------------------------- #
embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL) 

# Load vectorstore if exists, else build a new empty one
if os.path.exists(INDEX_PATH):
    print("🔹 Loading existing FAISS index...")
    vectorstore = FAISS.load_local(INDEX_PATH, embeddings)
else:
    print("⚙️ Building new empty FAISS index...")
    dummy_doc = Document(page_content="Initializing empty index", metadata={"init": True})
    vectorstore = FAISS.from_documents([dummy_doc], embeddings)
    vectorstore.save_local(INDEX_PATH)


# ---------------------------- HELPERS ---------------------------- #
def _format_pitch_text(pitch_data: dict) -> str:
    """
    Converts structured pitch info into a single text block for embedding.
    """
    return f"""
    Title: {pitch_data.get('title', '')}
    Industry: {pitch_data.get('industry', '')}
    Stage: {pitch_data.get('stage', '')}
    Funding Amount: {pitch_data.get('funding_amount', '')}
    Elevator Pitch: {pitch_data.get('elevator_pitch', '')}
    Problem: {pitch_data.get('problem_statement', '')}
    Solution: {pitch_data.get('solution', '')}
    Target Market: {pitch_data.get('target_market', '')}
    Competitive Advantage: {pitch_data.get('competitive_advantage', '')}
    """


def add_pitch_to_vectorstore(pitch_data: dict):
    """
    Adds a new entrepreneur pitch into the FAISS vectorstore.
    Builds embedding and saves locally.
    """
    global vectorstore

    # Convert pitch to readable text
    pitch_text = _format_pitch_text(pitch_data)

    # Create a document with metadata
    doc = Document(
        page_content=pitch_text.strip(),
        metadata={
            "pitch_id": str(pitch_data.get("_id", "")),
            "entrepreneur_id": str(pitch_data.get("entrepreneur_id", "")),
            "title": pitch_data.get("title", ""),
            "industry": pitch_data.get("industry", ""),
            "stage": pitch_data.get("stage", ""),
            "funding_amount": pitch_data.get("funding_amount", "")
        }
    )

    # Add and persist
    vectorstore.add_documents([doc])
    vectorstore.save_local(INDEX_PATH)

    print(f"✅ Pitch '{pitch_data.get('title')}' added to vectorstore.")


def get_retriever():
    """
    Returns retriever object for semantic search / AI matching.
    """
    return vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 10})

import os
import sys
import json
import subprocess

# Add current project root to path if needed
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "knowledge_base.json")

# Note: In a real environment, this script would be called by the agent.
# It uses the authenticated NotebookLM skill to fetch key data.

def fetch_core_knowledge():
    """
    Fetches the latest 'Core Knowledge' from NotebookLM.
    This is a structured prompt designed to get a JSON-friendly response.
    """
    prompt = (
        "Du är en data-exporter. Sammanfatta den viktigaste informationen från din kunskapsbas "
        "som rör den svenska arbetsmarknaden 2024 och effektiva CV-strategier (t.ex. XYZ-formeln). "
        "Formatera svaret som ett rent JSON-objekt med följande struktur: "
        "{ 'last_updated': 'YYYY-MM-DD', 'market_stats': [...], 'cv_tips': [...], 'key_principles': [...] }. "
        "Svara ENDAST med JSON-objektet."
    )
    
    # This simulates calling the agent's internal notebooklm ask_question logic
    print(f"Syncing from NotebookLM...")
    
    # In practice, this script is used by the AI agent to orchestrate the skill.
    # For now, we provide the structure for the agent to fill.
    return prompt

def save_knowledge(data):
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved knowledge to {OUTPUT_FILE}")

if __name__ == "__main__":
    # Signal to the agent what the core query is
    print(fetch_core_knowledge())

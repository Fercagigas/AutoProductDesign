import os
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

def get_llm(model_name: str = "google/gemini-2.0-flash-001", temperature: float = 0.7):
    """
    Returns a ChatOpenAI instance configured for OpenRouter.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not found in environment variables.")

    return ChatOpenAI(
        model=model_name,
        openai_api_key=api_key,
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=temperature,
        default_headers={
            "HTTP-Referer": "https://autoproductdesign.local", # Required by OpenRouter
            "X-Title": "AutoProductDesign", # Required by OpenRouter
        }
    )

import os
from groq import Groq

class GroqService:
    def __init__(self):
        self.client = None

    def init_client(self):
        api_key = os.environ.get("GROQ_API_KEY")
        if api_key:
            self.client = Groq(api_key=api_key)
        else:
            self.client = None

    def get_client(self):
        return self.client

    def extract_reply(self, completion):
        choices = getattr(completion, "choices", None)
        if not choices:
            return str(completion)
        first = choices[0]
        message = getattr(first, "message", None)
        if isinstance(message, dict):
            return message.get("content") or message.get("text") or str(message)
        if message is not None:
            return getattr(message, "content", None) or getattr(message, "text", None) or str(message)
        return getattr(first, "text", None) or str(first)

groq_service = GroqService()

def split_sentences(text: str) -> tuple[list[str], str]:
    """Split text at sentence boundaries (.!?) for incremental TTS.
    Returns list of complete sentences found so far, plus any remaining fragment."""
    sentences = []
    current = []
    for char in text:
        current.append(char)
        if char in '.!?':
            sentence = ''.join(current).strip()
            if sentence:
                sentences.append(sentence)
            current = []
    remainder = ''.join(current).strip()
    return sentences, remainder

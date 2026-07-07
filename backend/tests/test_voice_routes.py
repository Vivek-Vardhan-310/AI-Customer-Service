import asyncio
import unittest
from unittest.mock import patch

from app.main import app
from app.routers import voice


class VoiceRoutesTestCase(unittest.TestCase):
    def test_voice_call_route_is_registered(self):
        paths = {route.path for route in app.routes if hasattr(route, "path")}
        self.assertIn("/api/voice", paths)
        self.assertIn("/api/voice/call", paths)
        self.assertIn("/api/voice/call/", paths)

    def test_generate_call_intro_text_uses_groq_reply(self):
        class FakeCompletion:
            class Choice:
                class Message:
                    content = "Hello from LaptopCare, how can I help today?"

                message = Message()

            choices = [Choice()]

        class FakeClient:
            class chat:
                class completions:
                    @staticmethod
                    def create(**kwargs):
                        return FakeCompletion()

        class FakeGroqService:
            def get_client(self):
                return FakeClient()

            def extract_reply(self, completion):
                return completion.choices[0].message.content

        with patch.object(voice, "groq_service", FakeGroqService()):
            text = asyncio.run(voice.generate_call_intro_text("Welcome to support"))

        self.assertEqual(text, "Hello from LaptopCare, how can I help today?")


if __name__ == "__main__":
    unittest.main()

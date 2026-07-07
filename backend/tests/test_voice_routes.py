import unittest

from app.main import app


class VoiceRoutesTestCase(unittest.TestCase):
    def test_voice_call_route_is_registered(self):
        paths = {route.path for route in app.routes if hasattr(route, "path")}
        self.assertIn("/api/voice", paths)
        self.assertIn("/api/voice/call", paths)
        self.assertIn("/api/voice/call/", paths)


if __name__ == "__main__":
    unittest.main()

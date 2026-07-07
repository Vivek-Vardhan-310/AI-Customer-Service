import asyncio
import os
import unittest
from unittest.mock import AsyncMock, patch

from app.routers import tickets


class TicketRoutesTestCase(unittest.TestCase):
    def test_delete_ticket_route_calls_db_delete(self):
        async def run_test():
            with patch.dict(os.environ, {"DATABASE_URL": "postgres://test"}, clear=False), patch.object(
                tickets.db,
                "delete_ticket_db",
                new=AsyncMock(return_value=True),
            ) as delete_mock:
                response = await tickets.delete_ticket("TKT-123")

            self.assertEqual(response, {"deleted": True, "id": "TKT-123"})
            delete_mock.assert_awaited_once_with("TKT-123")

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()

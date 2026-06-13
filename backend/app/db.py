import os
import asyncio
import asyncpg
from typing import Optional

_pool: Optional[asyncpg.pool.Pool] = None

async def connect_db():
    global _pool
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return None
    _pool = await asyncpg.create_pool(dsn=database_url, min_size=1, max_size=5)
    return _pool

async def close_db():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None

async def get_tickets_db():
    if not _pool:
        return []
    async with _pool.acquire() as conn:
        rows = await conn.fetch('SELECT id, product, category, status, priority, date, description, timeline FROM tickets ORDER BY date DESC')
        result = []
        for r in rows:
            timeline = r['timeline'] if isinstance(r['timeline'], list) else []
            result.append({
                'id': r['id'], 'product': r['product'], 'category': r['category'], 'status': r['status'],
                'priority': r['priority'], 'date': r['date'].isoformat() if hasattr(r['date'], 'isoformat') else str(r['date']),
                'description': r['description'], 'timeline': timeline
            })
        return result

async def create_ticket_db(ticket: dict):
    if not _pool:
        return None
    async with _pool.acquire() as conn:
        await conn.execute('''
            INSERT INTO tickets(id, product, category, status, priority, date, description, timeline, owner)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ''', ticket['id'], ticket['product'], ticket['category'], ticket['status'], ticket['priority'], ticket['date'], ticket['description'], ticket.get('timeline', []), ticket.get('owner'))
        return ticket

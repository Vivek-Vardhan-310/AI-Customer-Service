import json
import threading
from pathlib import Path

_lock = threading.Lock()

DB_PATH = Path(__file__).resolve().parents[1] / 'data' / 'db.json'
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

DEFAULT = {
    "tickets": [],
    "feedback": [],
    "products": [
        {
            "id": "prod-1",
            "name": "ThinkPad X1 Carbon Gen 11",
            "serial": "PF-4R2K7X",
            "warranty_days_left": 210
        }
    ]
}

def _read():
    if not DB_PATH.exists():
        _write(DEFAULT)
    with DB_PATH.open('r', encoding='utf-8') as f:
        return json.load(f)

def _write(data):
    with _lock:
        with DB_PATH.open('w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

def get_all(collection: str):
    data = _read()
    return data.get(collection, [])

def save_item(collection: str, item: dict):
    data = _read()
    coll = data.setdefault(collection, [])
    coll.append(item)
    _write(data)
    return item

def find_item(collection: str, key: str, value):
    data = _read()
    for item in data.get(collection, []):
        if item.get(key) == value:
            return item
    return None

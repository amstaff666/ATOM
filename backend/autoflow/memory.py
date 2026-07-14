"""
Luuna Autoflow Core - Memory Layer
=================================

Simple local storage for execution records.
Uses JSON file storage (dev-safe, no production DB).

Storage location: backend/.autoflow/executions.json
This path is gitignored to prevent committing execution data.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from .models import ExecutionRecord

logger = logging.getLogger(__name__)

# Default storage directory (gitignored, dev-safe)
DEFAULT_STORAGE_DIR = Path(__file__).parent.parent / ".autoflow"
DEFAULT_STORAGE_FILE = "executions.json"


class MemoryStore:
    """
    Simple local JSON storage for execution records.
    
    For development only - production should use proper DB.
    
    Storage path: backend/.autoflow/executions.json
    This is intentionally outside repo tracking to keep execution data safe.
    """
    
    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize memory store.
        
        Args:
            storage_path: Optional custom path to JSON file for storage.
                         If not provided, uses backend/.autoflow/executions.json
        """
        if storage_path:
            self.storage_path = Path(storage_path)
        else:
            # Default to backend/.autoflow/executions.json (gitignored, dev-safe)
            self.storage_path = DEFAULT_STORAGE_DIR / DEFAULT_STORAGE_FILE
        
        # Ensure directory exists
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize storage
        self._records: Dict[str, dict] = {}
        self._load()
        
        logger.info(f"[MemoryStore] Initialized at: {self.storage_path}")
    
    def _load(self) -> None:
        """Load records from disk."""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    self._records = json.load(f)
                logger.debug(f"Loaded {len(self._records)} execution records")
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to load records: {e}")
                self._records = {}
    
    def _save(self) -> None:
        """Save records to disk."""
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(self._records, f, indent=2, default=str, ensure_ascii=False)
            logger.debug(f"Saved {len(self._records)} execution records")
        except IOError as e:
            logger.error(f"Failed to save records: {e}")
    
    def store(self, record: ExecutionRecord) -> None:
        """Store an execution record."""
        self._records[record.execution_id] = record.model_dump()
        self._save()
        logger.debug(f"Stored execution record: {record.execution_id}")
    
    def get(self, execution_id: str) -> Optional[ExecutionRecord]:
        """Retrieve an execution record by ID."""
        data = self._records.get(execution_id)
        if data:
            return ExecutionRecord(**data)
        return None
    
    def update(self, record: ExecutionRecord) -> None:
        """Update an existing record."""
        record.updated_at = datetime.utcnow()
        self._records[record.execution_id] = record.model_dump()
        self._save()
        logger.debug(f"Updated execution record: {record.execution_id}")
    
    def delete(self, execution_id: str) -> bool:
        """Delete a record by ID."""
        if execution_id in self._records:
            del self._records[execution_id]
            self._save()
            return True
        return False
    
    def list_all(self) -> list:
        """List all execution records."""
        return [ExecutionRecord(**data) for data in self._records.values()]
    
    def list_by_status(self, status: str) -> List[ExecutionRecord]:
        """List records by status."""
        return [
            ExecutionRecord(**data) 
            for data in self._records.values() 
            if data.get("status") == status
        ]
    
    def clear(self) -> None:
        """Clear all records."""
        self._records = {}
        self._save()
    
    def get_storage_path(self) -> str:
        """Get the current storage path for reporting."""
        return str(self.storage_path)
    
    def count(self) -> int:
        """Return total number of stored records."""
        return len(self._records)

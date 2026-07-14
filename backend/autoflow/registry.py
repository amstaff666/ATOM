"""
Luuna Autoflow Core - Adapter Registry
======================================

Registry for managing and discovering adapters.
"""

import logging
from typing import Dict, List, Optional, Type

from .models import AdapterCapabilities, ProviderInfo
from .adapters.base import BaseAdapter

logger = logging.getLogger(__name__)


class AdapterRegistry:
    """
    Registry for managing adapters.
    
    Handles:
    - Adapter registration
    - Capability discovery
    - Provider listing
    """
    
    def __init__(self):
        self._adapters: Dict[str, BaseAdapter] = {}
        self._capabilities: Dict[str, AdapterCapabilities] = {}
    
    def register(self, adapter: BaseAdapter) -> None:
        """
        Register an adapter.
        
        Args:
            adapter: The adapter instance to register
        """
        adapter_id = adapter.capabilities.id
        
        if adapter_id in self._adapters:
            logger.warning(f"Overwriting existing adapter: {adapter_id}")
        
        self._adapters[adapter_id] = adapter
        self._capabilities[adapter_id] = adapter.capabilities
        
        logger.info(f"Registered adapter: {adapter_id} ({adapter.capabilities.name})")
    
    def unregister(self, adapter_id: str) -> bool:
        """Unregister an adapter by ID."""
        if adapter_id in self._adapters:
            del self._adapters[adapter_id]
            del self._capabilities[adapter_id]
            logger.info(f"Unregistered adapter: {adapter_id}")
            return True
        return False
    
    def get(self, adapter_id: str) -> Optional[BaseAdapter]:
        """Get an adapter by ID."""
        return self._adapters.get(adapter_id)
    
    def get_capabilities(self, adapter_id: str) -> Optional[AdapterCapabilities]:
        """Get adapter capabilities by ID."""
        return self._capabilities.get(adapter_id)
    
    def list_adapters(self) -> Dict[str, BaseAdapter]:
        """Get all registered adapters."""
        return self._adapters.copy()
    
    def list_capabilities(self) -> List[AdapterCapabilities]:
        """Get all adapter capabilities."""
        return list(self._capabilities.values())
    
    def list_providers(self) -> List[ProviderInfo]:
        """Get provider info for all adapters."""
        providers = []
        for adapter_id, caps in self._capabilities.items():
            providers.append(ProviderInfo(
                id=caps.id,
                name=caps.name,
                description=caps.description,
                domains=[d.value for d in caps.domains],
                can_execute=caps.can_execute,
                requires_approval=caps.requires_approval,
                status="available",
            ))
        return providers
    
    def find_by_domain(self, domain: str) -> List[str]:
        """Find adapters that support a domain."""
        matching = []
        for adapter_id, caps in self._capabilities.items():
            if any(d.value == domain for d in caps.domains):
                matching.append(adapter_id)
        return matching
    
    def find_executable(self) -> List[str]:
        """Find adapters that can execute."""
        return [
            adapter_id 
            for adapter_id, caps in self._capabilities.items() 
            if caps.can_execute
        ]
    
    def count(self) -> int:
        """Get number of registered adapters."""
        return len(self._adapters)
    
    def clear(self) -> None:
        """Clear all registered adapters."""
        self._adapters.clear()
        self._capabilities.clear()
        logger.info("Cleared all adapters from registry")

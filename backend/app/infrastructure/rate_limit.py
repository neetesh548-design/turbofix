"""Rate limiting for sensitive endpoints — prevents brute-force, spam, and DoS."""

from slowapi import Limiter
from slowapi.util import get_remote_address

import os

_running_tests = "pytest" in os.getenv("_", "") or os.getenv("PYTEST_CURRENT_TEST")
limiter = Limiter(key_func=get_remote_address, enabled=not _running_tests)

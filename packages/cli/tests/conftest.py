import pytest
from agentipedia.config import Config


@pytest.fixture
def config():
    return Config(api_key="agp_testkey123", server_url="https://test.agentipedia.ai")


@pytest.fixture
def unauthed_config():
    return Config(api_key=None, server_url="https://test.agentipedia.ai")

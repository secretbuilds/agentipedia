import json

from agentipedia.config import load_config, save_config


class TestLoadConfig:
    def test_returns_defaults_when_no_file_or_env(self, tmp_path, monkeypatch):
        monkeypatch.delenv("AGENTIPEDIA_API_KEY", raising=False)
        monkeypatch.delenv("AGENTIPEDIA_SERVER_URL", raising=False)
        cfg = load_config(config_dir=tmp_path / ".agentipedia")
        assert cfg.api_key is None
        assert cfg.server_url == "https://agentipedia.ai"

    def test_reads_from_config_file(self, tmp_path):
        config_dir = tmp_path / ".agentipedia"
        config_dir.mkdir()
        (config_dir / "config.json").write_text(
            json.dumps(
                {
                    "api_key": "agp_test123",
                    "server_url": "https://custom.example.com",
                }
            )
        )
        cfg = load_config(config_dir=config_dir)
        assert cfg.api_key == "agp_test123"
        assert cfg.server_url == "https://custom.example.com"

    def test_env_vars_override_config_file(self, tmp_path, monkeypatch):
        config_dir = tmp_path / ".agentipedia"
        config_dir.mkdir()
        (config_dir / "config.json").write_text(
            json.dumps(
                {
                    "api_key": "agp_from_file",
                    "server_url": "https://file.example.com",
                }
            )
        )
        monkeypatch.setenv("AGENTIPEDIA_API_KEY", "agp_from_env")
        monkeypatch.setenv("AGENTIPEDIA_SERVER_URL", "https://env.example.com")
        cfg = load_config(config_dir=config_dir)
        assert cfg.api_key == "agp_from_env"
        assert cfg.server_url == "https://env.example.com"

    def test_handles_malformed_json(self, tmp_path):
        config_dir = tmp_path / ".agentipedia"
        config_dir.mkdir()
        (config_dir / "config.json").write_text("NOT JSON")
        cfg = load_config(config_dir=config_dir)
        assert cfg.api_key is None


class TestSaveConfig:
    def test_creates_dir_and_writes_file(self, tmp_path):
        config_dir = tmp_path / ".agentipedia"
        save_config("agp_mykey", server_url="https://agentipedia.ai", config_dir=config_dir)
        data = json.loads((config_dir / "config.json").read_text())
        assert data["api_key"] == "agp_mykey"
        assert data["server_url"] == "https://agentipedia.ai"

    def test_overwrites_existing_file(self, tmp_path):
        config_dir = tmp_path / ".agentipedia"
        save_config("agp_old", config_dir=config_dir)
        save_config("agp_new", config_dir=config_dir)
        data = json.loads((config_dir / "config.json").read_text())
        assert data["api_key"] == "agp_new"

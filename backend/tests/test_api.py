"""API endpoint tests."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestHealthEndpoints:
    """Tests for health check endpoints."""
    
    def test_root(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "version" in data
    
    def test_health(self, client):
        """Test health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestVideoInfo:
    """Tests for video info endpoint."""
    
    def test_get_info_invalid_url(self, client):
        """Test with invalid URL."""
        response = client.post(
            "/api/info",
            json={"url": "not-a-valid-url"},
        )
        assert response.status_code == 400


class TestDownload:
    """Tests for download endpoints."""
    
    def test_start_download_empty_urls(self, client):
        """Test with empty URL list."""
        response = client.post(
            "/api/download",
            json={"urls": []},
        )
        assert response.status_code == 422  # Validation error
    
    def test_get_status_not_found(self, client):
        """Test status for non-existent task."""
        response = client.get("/api/status/non-existent-task-id")
        assert response.status_code == 404
    
    def test_download_file_not_found(self, client):
        """Test downloading non-existent file."""
        response = client.get("/api/download/some-task-id/some-file.mp4")
        assert response.status_code == 404

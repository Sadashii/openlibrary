"""Tests for the /partials/SearchFacets.json FastAPI endpoint."""

import json
from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture
def mock_do_search_async():
    """Mock the async Solr search call used in SearchFacetsPartial."""
    mock = AsyncMock()
    mock.return_value = type(
        "MockSearchResponse",
        (),
        {
            "facet_counts": {
                "author_key": [("OL1A", "Author A", 10)],
                "language": [("eng", "English", 5)],
            }
        },
    )()
    
    with patch(
        "openlibrary.plugins.openlibrary.partials.do_search_async",
        mock,
    ):
        yield mock


@pytest.fixture
def mock_get_current_user():
    """Mock the get_current_user call to avoid context variable LookupErrors."""
    with patch(
        "openlibrary.plugins.openlibrary.partials.get_current_user", 
        return_value=None
    ) as mock:
        yield mock

class MockTemplateResult(str):
    """Mocks a web.py Templetor object, which acts as a string but has a .title attribute."""
    @property
    def title(self):
        return "mocked - search"

@pytest.fixture
def mock_render_template():
    """Mock the template rendering to avoid loading real HTML files from disk."""
    mock_html = MockTemplateResult("<div id='mocked-template'></div>")
    
    with patch(
        "openlibrary.plugins.openlibrary.partials.render_template",
        return_value=mock_html
    ) as mock:
        yield mock   


class TestSearchFacetsPartial:
    """Tests for GET /partials/SearchFacets.json."""

    def test_happy_path(self, fastapi_client, mock_do_search_async, mock_get_current_user, mock_render_template):
        """Happy path: returns expected keys and calls async search."""

        payload = {
            "path": "/search",
            "query": "?q=python",
            "param": {"q": "python"},
        }

        response = fastapi_client.get(
            "/partials/SearchFacets.json",
            params={"data": json.dumps(payload)}, 
        )

        assert response.status_code == 200
        data = response.json()

        assert "sidebar" in data
        assert "title" in data
        assert "activeFacets" in data

        mock_do_search_async.assert_awaited_once()
        mock_render_template.assert_called()

    @pytest.mark.parametrize(
        "invalid_params",
        [
            {"data": "not-json"},
            {"data": "{invalid json"},
            {"data": '{"path": "/search", "param": "missing-quotes}'},
        ],
    )
    def test_invalid_json_returns_400(self, fastapi_client, mock_do_search_async, invalid_params):
        """Invalid JSON strings should return 400."""

        response = fastapi_client.get(
            "/partials/SearchFacets.json",
            params=invalid_params,
        )

        assert response.status_code == 400
        mock_do_search_async.assert_not_called()

    def test_missing_data_returns_422(self, fastapi_client, mock_do_search_async):
        """Missing the required 'data' query parameter should return 422."""
        
        response = fastapi_client.get("/partials/SearchFacets.json")

        assert response.status_code == 422
        mock_do_search_async.assert_not_called()
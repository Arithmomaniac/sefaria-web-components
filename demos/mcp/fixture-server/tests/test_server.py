import json
import subprocess
from pathlib import Path
from typing import Literal, cast
from zipfile import ZipFile

import httpx
import pytest
from fastmcp import Client
from fastmcp.apps import UI_EXTENSION_ID
from fastmcp.exceptions import ToolError

from sefaria_mcp_fixture.server import (
    MAX_LINKS,
    MAX_LINKS_RESPONSE_BYTES,
    MAX_TEXT_LEAVES,
    RESOURCE_URI,
    LinksWithText,
    VersionLanguage,
    _resolve_links_with_text,
    _version_params,
    create_server,
    mcp,
)

FIXTURE_ROOT = Path(__file__).parents[4] / "packages" / "client" / "test" / "fixtures"


def read_payload() -> dict[str, object]:
    return cast(
        dict[str, object],
        json.loads((FIXTURE_ROOT / "v3-text-spanning-2026-08-29.json").read_text(encoding="utf-8")),
    )


def read_links_payload() -> list[dict[str, object]]:
    return cast(
        list[dict[str, object]],
        json.loads(
            (FIXTURE_ROOT / "links-connections-preview-2026-09-06.json").read_text(encoding="utf-8")
        ),
    )


def response(status: int, payload: object) -> httpx.Response:
    return httpx.Response(
        status,
        json=payload,
        request=httpx.Request("GET", "https://www.sefaria.org/api/v3/texts/Genesis"),
    )


async def test_serves_app_tool_and_resource() -> None:
    async with Client(mcp) as client:
        tools = await client.list_tools()
        tool = next(tool for tool in tools if tool.name == "get_text")
        connections_tool = next(tool for tool in tools if tool.name == "get_links_between_texts")
        assert tool.meta is not None
        assert tool.meta["ui"]["resourceUri"] == RESOURCE_URI
        assert tool.inputSchema["required"] == ["reference"]
        assert set(tool.inputSchema["properties"]) == {"reference", "version_language"}
        assert connections_tool.meta is not None
        assert connections_tool.meta["ui"]["resourceUri"] == RESOURCE_URI
        assert connections_tool.inputSchema["required"] == ["reference"]
        assert set(connections_tool.inputSchema["properties"]) == {"reference", "with_text"}

        resources = await client.list_resources()
        assert any(str(resource.uri) == RESOURCE_URI for resource in resources)

        contents = await client.read_resource(RESOURCE_URI)
        assert len(contents) == 1
        assert contents[0].mimeType == "text/html;profile=mcp-app"
        assert "Waiting for a tool result" in contents[0].text


async def test_get_text_returns_progressive_result_and_repeated_versions() -> None:
    calls: list[tuple[str, VersionLanguage]] = []

    async def fetch_text(reference: str, version_language: VersionLanguage) -> httpx.Response:
        calls.append((reference, version_language))
        return response(200, read_payload())

    async with Client(create_server(fetch_text)) as client:
        result = await client.call_tool(
            "get_text",
            {"reference": "Genesis 1:31-2:2", "version_language": "both"},
        )

    assert calls == [("Genesis 1:31-2:2", "both")]
    assert result.structured_content == read_payload()
    assert result.content[0].text.startswith("Genesis 1:31-2:2")
    assert result.meta == {
        "sefaria/source-card": {
            "operation": "getV3Texts",
            "method": "GET",
            "path": "/api/v3/texts/{tref}",
            "status": 200,
            "request": {"tref": "Genesis 1:31-2:2"},
        }
    }


def test_version_language_maps_to_v3_query_values() -> None:
    assert _version_params("source") == [
        ("version", "primary"),
        ("return_format", "default"),
    ]
    assert _version_params("english") == [
        ("version", "translation"),
        ("return_format", "default"),
    ]
    assert _version_params("both") == [
        ("version", "primary"),
        ("version", "translation"),
        ("return_format", "default"),
    ]


class _CapabilityContext:
    def __init__(self, supports_apps: bool) -> None:
        self.supports_apps = supports_apps
        self.requested_extensions: list[str] = []

    def client_supports_extension(self, extension_id: str) -> bool:
        self.requested_extensions.append(extension_id)
        return self.supports_apps


@pytest.mark.parametrize(
    ("with_text", "supports_apps", "expected"),
    [
        (None, False, "0"),
        (None, True, "1"),
        ("0", True, "0"),
        ("1", False, "1"),
    ],
)
def test_links_text_resolution_preserves_explicit_input(
    with_text: LinksWithText | None,
    supports_apps: bool,
    expected: LinksWithText,
) -> None:
    context = _CapabilityContext(supports_apps)

    assert _resolve_links_with_text(with_text, context) == expected
    assert context.requested_extensions == ([] if with_text is not None else [UI_EXTENSION_ID])


async def test_connections_defaults_to_metadata_for_plain_clients() -> None:
    calls: list[tuple[str, LinksWithText]] = []
    payload = read_links_payload()

    async def fetch_links(reference: str, with_text: LinksWithText) -> httpx.Response:
        calls.append((reference, with_text))
        return response(200, payload)

    async with Client(create_server(fetch_links=fetch_links)) as client:
        result = await client.call_tool(
            "get_links_between_texts",
            {"reference": "Micah 6:8"},
        )

    assert calls == [("Micah 6:8", "0")]
    assert result.structured_content == {"payload": payload}
    assert result.meta == {
        "sefaria/connections": {
            "operation": "getLinks",
            "method": "GET",
            "path": "/api/links/{tref}",
            "status": 200,
            "request": {"tref": "Micah 6:8", "withText": False},
        }
    }
    assert result.content[0].text.startswith("Connections for Micah 6:8")


async def test_connections_preserves_explicit_preview_request() -> None:
    calls: list[tuple[str, LinksWithText]] = []
    payload = read_links_payload()

    async def fetch_links(reference: str, with_text: LinksWithText) -> httpx.Response:
        calls.append((reference, with_text))
        return response(200, payload)

    async with Client(create_server(fetch_links=fetch_links)) as client:
        result = await client.call_tool(
            "get_links_between_texts",
            {"reference": "Micah 6:8", "with_text": "1"},
        )

    assert calls == [("Micah 6:8", "1")]
    assert result.meta is not None
    assert result.meta["sefaria/connections"]["request"]["withText"] is True
    assert "beginning" in result.content[0].text


async def test_connections_forwards_documented_error_in_envelope() -> None:
    payload = {"error": "Invalid reference.", "ref": "Missing 1:1"}

    async def fetch_links(_reference: str, _with_text: LinksWithText) -> httpx.Response:
        return response(400, payload)

    async with Client(create_server(fetch_links=fetch_links)) as client:
        result = await client.call_tool(
            "get_links_between_texts",
            {"reference": "Missing 1:1"},
        )

    assert result.structured_content == {"payload": payload}
    assert result.meta is not None
    assert result.meta["sefaria/connections"]["status"] == 400


async def test_connections_forwards_documented_200_api_error_in_envelope() -> None:
    payload = {"error": "Could not find title in reference: Missing"}

    async def fetch_links(_reference: str, _with_text: LinksWithText) -> httpx.Response:
        return response(200, payload)

    async with Client(create_server(fetch_links=fetch_links)) as client:
        result = await client.call_tool(
            "get_links_between_texts",
            {"reference": "Missing 1:1"},
        )

    assert result.structured_content == {"payload": payload}
    assert result.meta is not None
    assert result.meta["sefaria/connections"]["status"] == 200
    assert result.content[0].text == ("Missing 1:1: Could not find title in reference: Missing")


async def test_connections_rejects_too_many_links() -> None:
    payload = [{"_id": str(index)} for index in range(MAX_LINKS + 1)]

    async def fetch_links(_reference: str, _with_text: LinksWithText) -> httpx.Response:
        return response(200, payload)

    async with Client(create_server(fetch_links=fetch_links)) as client:
        with pytest.raises(ToolError, match="too many links"):
            await client.call_tool(
                "get_links_between_texts",
                {"reference": "Genesis"},
            )


async def test_connections_rejects_oversized_decoded_response() -> None:
    payload = [{"_id": "one", "text": "x" * MAX_LINKS_RESPONSE_BYTES}]

    async def fetch_links(_reference: str, _with_text: LinksWithText) -> httpx.Response:
        return response(200, payload)

    async with Client(create_server(fetch_links=fetch_links)) as client:
        with pytest.raises(ToolError, match="larger than"):
            await client.call_tool(
                "get_links_between_texts",
                {"reference": "Genesis"},
            )


async def test_connections_rejects_blank_input_before_request() -> None:
    calls = 0

    async def fetch_links(_reference: str, _with_text: LinksWithText) -> httpx.Response:
        nonlocal calls
        calls += 1
        return response(200, [])

    async with Client(create_server(fetch_links=fetch_links)) as client:
        with pytest.raises(ToolError, match="must not be blank"):
            await client.call_tool(
                "get_links_between_texts",
                {"reference": "   "},
            )

    assert calls == 0


async def test_connections_preserves_undocumented_http_failure() -> None:
    async def fetch_links(_reference: str, _with_text: LinksWithText) -> httpx.Response:
        return httpx.Response(
            503,
            content=b"temporarily unavailable",
            request=httpx.Request("GET", "https://www.sefaria.org/api/links/Genesis"),
        )

    async with Client(create_server(fetch_links=fetch_links)) as client:
        with pytest.raises(ToolError, match="503"):
            await client.call_tool(
                "get_links_between_texts",
                {"reference": "Micah 6:8"},
            )


@pytest.mark.parametrize("status", [400, 404])
async def test_get_text_forwards_documented_http_errors(status: Literal[400, 404]) -> None:
    payload = {"error": f"HTTP {status}"}

    async def fetch_text(_reference: str, _version_language: VersionLanguage) -> httpx.Response:
        return response(status, payload)

    async with Client(create_server(fetch_text)) as client:
        result = await client.call_tool("get_text", {"reference": "Missing 1:1"})

    assert result.structured_content == payload
    assert result.meta is not None
    assert result.meta["sefaria/source-card"]["status"] == status
    assert result.is_error is False


async def test_get_text_preserves_transport_failure() -> None:
    async def fetch_text(_reference: str, _version_language: VersionLanguage) -> httpx.Response:
        raise httpx.ConnectError("offline")

    async with Client(create_server(fetch_text)) as client:
        with pytest.raises(ToolError, match="offline"):
            await client.call_tool("get_text", {"reference": "Genesis 1:1"})


async def test_get_text_rejects_payloads_too_large_for_synchronous_rendering() -> None:
    payload = read_payload()
    payload["versions"] = [
        {
            "versionTitle": "Large version",
            "text": ["segment"] * (MAX_TEXT_LEAVES + 1),
        }
    ]

    async def fetch_text(_reference: str, _version_language: VersionLanguage) -> httpx.Response:
        return response(200, payload)

    async with Client(create_server(fetch_text)) as client:
        with pytest.raises(ToolError, match="too large for the source-card App"):
            await client.call_tool("get_text", {"reference": "Genesis"})


def test_wheel_contains_staged_resources(tmp_path: Path) -> None:
    project_root = Path(__file__).parents[1]
    subprocess.run(
        [
            "uv",
            "build",
            "--wheel",
            "--out-dir",
            str(tmp_path),
        ],
        cwd=project_root,
        check=True,
    )

    wheel = next(tmp_path.glob("*.whl"))
    with ZipFile(wheel) as archive:
        packaged_files = set(archive.namelist())

    expected_files = {"sefaria_mcp_fixture/static/mcp-app.html"}
    retired_files = {
        "sefaria_mcp_fixture/static/source-card.example.json",
        "sefaria_mcp_fixture/static/source-card.schema.json",
    }
    assert expected_files <= packaged_files
    assert retired_files.isdisjoint(packaged_files)

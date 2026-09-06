import json
import subprocess
from collections.abc import Mapping
from pathlib import Path
from typing import Literal, cast
from zipfile import ZipFile

import httpx
import pytest
from fastmcp import Client
from fastmcp.exceptions import ToolError

from sefaria_mcp_fixture.server import (
    MAX_TEXT_LEAVES,
    RESOURCE_URI,
    VersionLanguage,
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


def response(status: int, payload: Mapping[str, object]) -> httpx.Response:
    return httpx.Response(
        status,
        json=payload,
        request=httpx.Request("GET", "https://www.sefaria.org/api/v3/texts/Genesis"),
    )


async def test_serves_app_tool_and_resource() -> None:
    async with Client(mcp) as client:
        tools = await client.list_tools()
        tool = next(tool for tool in tools if tool.name == "get_text")
        assert tool.meta is not None
        assert tool.meta["ui"]["resourceUri"] == RESOURCE_URI
        assert tool.inputSchema["required"] == ["reference"]
        assert set(tool.inputSchema["properties"]) == {"reference", "version_language"}

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

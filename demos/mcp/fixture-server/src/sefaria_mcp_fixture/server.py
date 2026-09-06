from __future__ import annotations

from collections.abc import Awaitable, Callable
from html.parser import HTMLParser
from importlib import resources
from typing import Any, Literal
from urllib.parse import quote

import httpx
from fastmcp import FastMCP
from fastmcp.apps import AppConfig
from fastmcp.tools import ToolResult
from mcp.types import TextContent

RESOURCE_URI = "ui://sefaria/source-card.html"
PACKAGE_NAME = "sefaria_mcp_fixture"
SEFARIA_BASE_URL = "https://www.sefaria.org"
MAX_TEXT_LEAVES = 400
VersionLanguage = Literal["source", "english", "both"]
TextFetcher = Callable[[str, VersionLanguage], Awaitable[httpx.Response]]


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def _read_static_text(name: str) -> str:
    return (
        resources.files(PACKAGE_NAME).joinpath("static").joinpath(name).read_text(encoding="utf-8")
    )


def _version_params(
    version_language: VersionLanguage,
) -> list[tuple[str, str | int | float | bool | None]]:
    versions = {
        "source": ["primary"],
        "english": ["translation"],
        "both": ["primary", "translation"],
    }[version_language]
    params: list[tuple[str, str | int | float | bool | None]] = [
        ("version", version) for version in versions
    ]
    params.append(("return_format", "default"))
    return params


async def _fetch_text(reference: str, version_language: VersionLanguage) -> httpx.Response:
    async with httpx.AsyncClient(
        base_url=SEFARIA_BASE_URL,
        headers={"User-Agent": "sefaria-web-components-mcp/0.0.0"},
        timeout=30,
    ) as client:
        return await client.get(
            f"/api/v3/texts/{quote(reference, safe='')}",
            params=_version_params(version_language),
        )


def _plain_text(value: object, limit: int) -> str:
    strings: list[str] = []

    def visit(item: object) -> None:
        if sum(len(part) for part in strings) >= limit:
            return
        if isinstance(item, str):
            parser = _TextExtractor()
            parser.feed(item)
            text = "".join(parser.parts).strip()
            if text:
                strings.append(text)
        elif isinstance(item, list):
            for child in item:
                visit(child)

    visit(value)
    return " ".join(strings)[:limit]


def _text_content(payload: dict[str, Any], reference: str) -> str:
    normalized_ref = payload.get("ref")
    heading = normalized_ref if isinstance(normalized_ref, str) else reference
    versions = payload.get("versions")
    if not isinstance(versions, list):
        error = payload.get("error")
        return f"{heading}: {error}" if isinstance(error, str) else heading

    excerpts: list[str] = []
    for version in versions[:2]:
        if not isinstance(version, dict):
            continue
        title = version.get("versionTitle")
        label = title if isinstance(title, str) else "Sefaria text"
        text = _plain_text(version.get("text"), 1_200)
        if text:
            excerpts.append(f"{label}: {text}")
    return "\n\n".join([heading, *excerpts])


def _count_text_leaves(value: object, limit: int) -> int:
    count = 0
    pending = [value]
    while pending and count <= limit:
        item = pending.pop()
        if isinstance(item, str):
            count += 1
        elif isinstance(item, list):
            pending.extend(item)
    return count


def _enforce_render_limit(payload: dict[str, Any]) -> None:
    versions = payload.get("versions")
    if not isinstance(versions, list):
        return
    text_leaf_count = sum(
        _count_text_leaves(version.get("text"), MAX_TEXT_LEAVES)
        for version in versions
        if isinstance(version, dict)
    )
    if text_leaf_count > MAX_TEXT_LEAVES:
        raise ValueError(
            f"The requested text is too large for the source-card App "
            f"({text_leaf_count} text leaves; maximum {MAX_TEXT_LEAVES})."
        )


def create_server(fetch_text: TextFetcher = _fetch_text) -> FastMCP:
    server = FastMCP("Sefaria Web Components")

    @server.resource(RESOURCE_URI)
    def mcp_app_resource() -> str:
        return _read_static_text("mcp-app.html")

    @server.tool(app=AppConfig(resourceUri=RESOURCE_URI))
    async def get_text(
        reference: str,
        version_language: VersionLanguage = "both",
    ) -> ToolResult:
        """Retrieve a Sefaria text and render it as an interactive source card."""
        response = await fetch_text(reference, version_language)
        if response.status_code not in (200, 400, 404):
            response.raise_for_status()

        payload = response.json()
        if not isinstance(payload, dict):
            raise TypeError("The Sefaria v3 texts endpoint returned a non-object JSON payload.")
        if response.status_code == 200:
            _enforce_render_limit(payload)

        return ToolResult(
            content=[
                TextContent(
                    type="text",
                    text=_text_content(payload, reference),
                )
            ],
            structured_content=payload,
            meta={
                "sefaria/source-card": {
                    "operation": "getV3Texts",
                    "method": "GET",
                    "path": "/api/v3/texts/{tref}",
                    "status": response.status_code,
                    "request": {"tref": reference},
                }
            },
        )

    return server


mcp = create_server()


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()

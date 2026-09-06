from __future__ import annotations

from collections.abc import Awaitable, Callable
from html.parser import HTMLParser
from importlib import resources
from typing import Any, Literal, Protocol
from urllib.parse import quote

import httpx
from fastmcp import Context, FastMCP
from fastmcp.apps import UI_EXTENSION_ID, AppConfig
from fastmcp.tools import ToolResult
from mcp.types import TextContent

RESOURCE_URI = "ui://sefaria/source-card.html"
PACKAGE_NAME = "sefaria_mcp_fixture"
SEFARIA_BASE_URL = "https://www.sefaria.org"
MAX_TEXT_LEAVES = 400
MAX_LINKS = 10_000
MAX_LINKS_RESPONSE_BYTES = 5 * 1024 * 1024
MAX_LINKS_TEXT_ENTRIES = 20
MAX_LINKS_TEXT_LENGTH = 8_000
VersionLanguage = Literal["source", "english", "both"]
LinksWithText = Literal["0", "1"]
TextFetcher = Callable[[str, VersionLanguage], Awaitable[httpx.Response]]
LinksFetcher = Callable[[str, LinksWithText], Awaitable[httpx.Response]]


class SupportsClientExtensions(Protocol):
    def client_supports_extension(self, extension_id: str) -> bool: ...


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


async def _fetch_links(reference: str, with_text: LinksWithText) -> httpx.Response:
    async with httpx.AsyncClient(
        base_url=SEFARIA_BASE_URL,
        headers={"User-Agent": "sefaria-web-components-mcp/0.0.0"},
        timeout=30,
    ) as client:
        return await client.get(
            f"/api/links/{quote(reference, safe='')}",
            params={"with_text": with_text, "with_sheet_links": "0"},
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


def _resolve_links_with_text(
    with_text: LinksWithText | None,
    context: SupportsClientExtensions,
) -> LinksWithText:
    if with_text is not None:
        return with_text
    return "1" if context.client_supports_extension(UI_EXTENSION_ID) else "0"


def _links_content(
    payload: list[object] | dict[str, Any],
    reference: str,
    with_text: LinksWithText,
) -> str:
    if isinstance(payload, dict):
        error = payload.get("error")
        return f"{reference}: {error}" if isinstance(error, str) else reference

    lines = [f"Connections for {reference}: {len(payload)} returned."]
    for item in payload[:MAX_LINKS_TEXT_ENTRIES]:
        if not isinstance(item, dict):
            continue
        target = item.get("sourceRef")
        if not isinstance(target, str):
            continue
        line = f"- {target}"
        if with_text == "1":
            excerpt = _plain_text([item.get("text"), item.get("he")], 300)
            if excerpt:
                line = f"{line}: {excerpt}"
        lines.append(line)

    if len(payload) > MAX_LINKS_TEXT_ENTRIES:
        lines.append(
            f"Text summary shortened to {MAX_LINKS_TEXT_ENTRIES} targets; "
            "the structured result contains the complete accepted response."
        )
    text = "\n".join(lines)
    if len(text) <= MAX_LINKS_TEXT_LENGTH:
        return text
    suffix = "\nText summary shortened; the structured result contains the complete response."
    return f"{text[: MAX_LINKS_TEXT_LENGTH - len(suffix)]}{suffix}"


def _validate_links_response(
    response: httpx.Response,
) -> list[object] | dict[str, Any]:
    if response.status_code not in (200, 400):
        response.raise_for_status()
        raise AssertionError("raise_for_status returned for an undocumented links status.")

    response_size = len(response.content)
    if response_size > MAX_LINKS_RESPONSE_BYTES:
        raise ValueError(
            f"The connections response is larger than {MAX_LINKS_RESPONSE_BYTES} decoded "
            "bytes. Request a narrower reference."
        )

    payload = response.json()
    if response.status_code == 200:
        if isinstance(payload, list):
            if len(payload) > MAX_LINKS:
                raise ValueError(
                    f"The connections response returned too many links "
                    f"({len(payload)}; maximum {MAX_LINKS}). Request a narrower reference."
                )
            return payload
        if isinstance(payload, dict):
            return payload
        raise TypeError("The Sefaria links endpoint returned an unsupported success payload.")
    if response.status_code == 400:
        if not isinstance(payload, dict):
            raise TypeError("The Sefaria links endpoint returned a non-object error payload.")
        return payload
    raise AssertionError("Validated links response had an unsupported status.")


def create_server(
    fetch_text: TextFetcher = _fetch_text,
    fetch_links: LinksFetcher = _fetch_links,
) -> FastMCP:
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

    @server.tool(app=AppConfig(resourceUri=RESOURCE_URI))
    async def get_links_between_texts(
        reference: str,
        ctx: Context,
        with_text: LinksWithText | None = None,
    ) -> ToolResult:
        """Retrieve Sefaria text connections and render an interactive panel."""
        if not reference.strip():
            raise ValueError("Connections reference must not be blank.")
        resolved_with_text = _resolve_links_with_text(with_text, ctx)
        response = await fetch_links(reference, resolved_with_text)
        payload = _validate_links_response(response)

        return ToolResult(
            content=[
                TextContent(
                    type="text",
                    text=_links_content(payload, reference, resolved_with_text),
                )
            ],
            structured_content={"payload": payload},
            meta={
                "sefaria/connections": {
                    "operation": "getLinks",
                    "method": "GET",
                    "path": "/api/links/{tref}",
                    "status": response.status_code,
                    "request": {
                        "tref": reference,
                        "withText": resolved_with_text == "1",
                    },
                }
            },
        )

    return server


mcp = create_server()


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()

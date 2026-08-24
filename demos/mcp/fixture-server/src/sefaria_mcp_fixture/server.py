from __future__ import annotations

import json
from copy import deepcopy
from importlib import resources
from typing import Any, cast

from fastmcp import FastMCP
from fastmcp.apps import AppConfig
from fastmcp.tools import ToolResult
from jsonschema import validate
from mcp.types import TextContent

RESOURCE_URI = "ui://sefaria/source-card.html"
PACKAGE_NAME = "sefaria_mcp_fixture"

mcp = FastMCP("Sefaria Web Components Fixture")


def _read_static_text(name: str) -> str:
    return (
        resources.files(PACKAGE_NAME).joinpath("static").joinpath(name).read_text(encoding="utf-8")
    )


def _source_card_payload(ref: str) -> dict[str, Any]:
    payload = cast(
        dict[str, Any],
        deepcopy(json.loads(_read_static_text("source-card.example.json"))),
    )
    payload["ref"] = ref
    for segment in cast(list[dict[str, Any]], payload["segments"]):
        segment["ref"] = ref

    schema = json.loads(_read_static_text("source-card.schema.json"))
    validate(instance=payload, schema=schema)
    return payload


@mcp.resource(RESOURCE_URI)
def source_card_resource() -> str:
    return _read_static_text("mcp-app.html")


@mcp.tool(app=AppConfig(resourceUri=RESOURCE_URI))
def preview_sefaria_source(ref: str = "Genesis 1:1") -> ToolResult:
    payload = _source_card_payload(ref)
    return ToolResult(
        content=[
            TextContent(
                type="text",
                text=f"Sefaria source card for {ref}",
            )
        ],
        structured_content=payload,
    )


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()

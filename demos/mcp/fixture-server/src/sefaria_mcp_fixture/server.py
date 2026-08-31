from __future__ import annotations

from importlib import resources

from fastmcp import FastMCP
from fastmcp.apps import AppConfig
from fastmcp.tools import ToolResult
from mcp.types import TextContent

RESOURCE_URI = "ui://sefaria/source-card.html"
PACKAGE_NAME = "sefaria_mcp_fixture"

mcp = FastMCP("Sefaria Web Components Fixture")


def _read_static_text(name: str) -> str:
    return (
        resources.files(PACKAGE_NAME).joinpath("static").joinpath(name).read_text(encoding="utf-8")
    )


@mcp.resource(RESOURCE_URI)
def mcp_app_resource() -> str:
    return _read_static_text("mcp-app.html")


@mcp.tool(app=AppConfig(resourceUri=RESOURCE_URI))
def preview_sefaria_app() -> ToolResult:
    return ToolResult(
        content=[
            TextContent(
                type="text",
                text="Sefaria MCP App scaffold",
            )
        ],
    )


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()

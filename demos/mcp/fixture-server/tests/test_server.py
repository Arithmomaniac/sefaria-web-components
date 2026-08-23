import subprocess
from pathlib import Path
from zipfile import ZipFile

from fastmcp import Client

from sefaria_mcp_fixture.server import RESOURCE_URI, mcp


async def test_serves_source_card_tool_and_resource() -> None:
    async with Client(mcp) as client:
        tools = await client.list_tools()
        tool = next(tool for tool in tools if tool.name == "preview_sefaria_source")
        assert tool.meta is not None
        assert tool.meta["ui"]["resourceUri"] == RESOURCE_URI

        result = await client.call_tool(
            "preview_sefaria_source",
            {"ref": "Exodus 20:1"},
        )
        assert result.data["ref"] == "Exodus 20:1"
        assert result.data["segments"][0]["ref"] == "Exodus 20:1"

        resources = await client.list_resources()
        assert any(str(resource.uri) == RESOURCE_URI for resource in resources)

        contents = await client.read_resource(RESOURCE_URI)
        assert len(contents) == 1
        assert contents[0].mimeType == "text/html;profile=mcp-app"
        assert "sefaria-source-card" in contents[0].text


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

    expected_files = {
        "sefaria_mcp_fixture/static/mcp-app.html",
        "sefaria_mcp_fixture/static/source-card.example.json",
        "sefaria_mcp_fixture/static/source-card.schema.json",
    }
    assert expected_files <= packaged_files

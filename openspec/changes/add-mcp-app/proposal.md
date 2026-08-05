## Why

Sefaria runs a public MCP server, so an AI assistant can already retrieve Sefaria texts. What the
reader sees is the model's account of the text rather than the text itself.

Source review found a third-party chat application that fights this problem with prose. Its system
prompt instructs the model to show the Hebrew or Aramaic beside the English translation and not to
summarize. The prompt keeps that rule even when the reader asks for a short answer:

> Do not merely summarize what the tool returned — show the substance (for example, the actual
> text, the actual translations side by side).

The developer wants faithful bilingual rendering and has no mechanism to get it. The request goes to
the model as an instruction, and the model can ignore it.

The same prompt spends about a third of its length teaching reference normalization to the model.
That teaching holds worked examples and a self-review step. No library supplies this function.

A chat pane is also the hardest place these components can run. The viewport is narrow, the host
supplies the theme, and the data arrives as a tool payload rather than a fetch. A component that
holds up here holds up in an embed anywhere.

## What Changes

- Add an MCP App that renders `<sefaria-source-card>` inside the chat client.
- Accept text through a tool payload. Make no network request from the widget for the first render.
- Adopt the theme of the host through the `--sefaria-*` properties.
- Select a layout from the available width, so that a narrow pane stacks the languages.
- Run against a self-hosted MCP server that reads public data only, so that the demonstration needs
  no authorization decision from Sefaria.

## Capabilities

### New Capabilities

- `mcp-app`: Sefaria text rendered as a widget inside an AI chat client, fed by a tool payload.

### Modified Capabilities

- `source-card`: add requirements for payload-fed rendering with no fetch, and for adopting a host
  theme that the component does not control.

## Impact

- **Demonstration**: `demos/mcp-app`. **Depends on**: `source-card` and `theming-tokens`.
- **External dependency**: MCP host support for rendered widgets. Host capability varies, and it
  changes faster than this project does.
- **Authorization**: this demonstration reads public, unauthenticated data. Sefaria has stated that
  authorization is a question they must work through internally. Public data keeps this change clear
  of that question.
- **Prior friction**: an earlier session spent most of a day on host and client setup before
  reaching a working MCP interaction, and interactive elements in the widget did not work. Treat
  host capability as the main risk in this change.
- **Not in scope**: sampling, voice navigation, returning widget state to the chat session, and the
  model re-driving the widget. An earlier storyboard covered these. This change covers the first
  step of that storyboard.

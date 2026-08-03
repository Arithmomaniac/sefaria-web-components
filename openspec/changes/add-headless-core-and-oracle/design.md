# Design: Headless core and differential oracle

## Context

This is the first change in an empty repository. The decisions here set patterns that later changes
inherit, so this document records the reasoning, not only the outcome.

Four documents came before this change:

| Document | Role |
|---|---|
| `sefaria-component-catalog-and-spec.md` | The evidence base. Playwright measurement, pinned commits, a confidence assessment, and a list of known gaps. |
| `sefaria-design-spec-for-sefaria.md` | The distillation that went to Sefaria. Published as a gist. |
| `sefaria-web-components-hackathon-description.md` | The public pitch. |
| `Supplement - Sefaria Web Components.md` | Later commentary. This change rejects most of it, for reasons below. |

A further research pass read the source of twelve third-party projects that consume the Sefaria
API. That pass replaced an inference in the catalog with measurement. The catalog said so itself:
its third-party consumption mapping came from reading project descriptions, not source.

## Goals

- Deliver the layers that have a real oracle, and prove them with a published number.
- Fix the API shapes that are cheapest to correct now and most expensive to correct later.
- Record the decisions that later changes must not re-open.

## Non-Goals

- No custom elements. Components arrive in a later change.
- No demonstration surfaces. The Linker rebuild and the MCP App arrive later.
- No source sheets, no search, no topics, no authentication.
- No published package under the `@sefaria` namespace.
- No governance process, no contributor ladder, and no telemetry.

## Decisions

### Decision 1: Two independent options, not a three-state mode

**Decision.** Model diacritic removal as one option for cantillation marks and one option for vowel
points. Supply a compatibility helper that maps Sefaria's three mode names onto the two options.

**Why.** Reading the source of six codebases found eight different implementations of Hebrew
diacritic removal. No two are the same.

| Source | Behavior |
|---|---|
| Sefaria web | Removes U+0591 to U+05AF, U+05BD, U+05BF, U+05C0, U+05C4, U+05C5, U+200D |
| Sefaria mobile | The same, except U+05C0 only after whitespace, and the whitespace goes with it |
| Sefaria Linker | The web set without U+200D, applied always, with no reader control |
| bisl-torah (Rust) | The whole 0x0591 to 0x05C7 range in one pass |
| ChavrutAI | `[\u0591-\u05AF\u05B0-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]` |
| Hebrew_Blender | Separate `TEAMIM_RE` and `NIKKUD_RE`, with independent toggles |
| Hebrew_Blender | A second implementation, `stripDictNikud`, in the same project |
| Stndr (.NET) | 0x0591 to 0x05AF for cantillation, then a separate vowel set |

Two projects rejected the three-state ladder on their own. Hebrew_Blender exposes `showNikkud` and
`showCantillation` as independent switches. Stndr exposes a vowels toggle and a cantillation toggle.
Both need the state that the ladder cannot express: vowel points removed, cantillation marks kept.
A reader does not need that state. A cantillation trainer does.

The ladder remains available through the compatibility helper, so a caller that wants Sefaria's
model still gets it.

**Alternative rejected.** Keep the three-state ladder for consistency with Sefaria. Rejected because
the ladder cannot express a state that two independent projects built for themselves.

### Decision 2: PASEQ is an option with a documented default

**Decision.** Expose PASEQ handling as `always` or `after-space`, and default to `after-space`.

**Why.** The three Sefaria implementations disagree, and Sefaria has not ruled. An option makes this
library correct under either ruling. The mobile behavior is the more careful one, because a paseq
conventionally follows a space, so it is the better default. The oracle holds these cases out of the
pass rate until a ruling arrives.

### Decision 3: A fourth strategy exists, and it is not diacritic removal

**Observation.** talmud.page removes no diacritics at all. It offers the reader a choice of a
vocalized version or a version with cantillation, and lets version selection do the work.

**Consequence.** Version selection and diacritic removal are two ways to reach the same result.
`@sefaria/client` covers `/api/texts/versions/{index}`, so a caller can choose either. The library
does not force the transform path.

### Decision 4: Generate the client from the OpenAPI specification

**Decision.** Generate `@sefaria/client` from `Sefaria-Project/docs/openAPI.json`. Prune to the nine
endpoints that this project needs.

**Why.** The specification is first-party, it is OpenAPI 3.0.2, it holds 88 schemas and about 58
endpoints, and it powers `developers.sefaria.org`. Generation removes hand-written types.

**Alternatives rejected.**

- TypeSpec. It adds a layer that the first-party specification makes unnecessary.
- `DovOps/Sefaria-OpenAPI-Spec`. Last push in 2020, one star. It is unmaintained.
- Hand-writing. It costs days and differentiates nothing.

**Risk.** Sefaria marks the specification as work in progress. Test the nine endpoints against live
responses and report every difference.

### Decision 5: Plain text format and footnotes conflict

**Measurement.** A live request for `Genesis 18:1` returns this in the default format:

```
G<small>OD</small> appeared to<sup class="footnote-marker">a</sup><i class="footnote">…</i> him by
the terebinths of Mamre…
```

The same request with `return_format=text_only` returns this:

```
GOD appeared to him by the terebinths of Mamre…
```

Two losses. The footnote body is absent from the response, so no local transform can recover it.
The small capitals that mark the divine name in the JPS translation are gone, and the loss leaves
no visible sign.

**Decision.** The client reports an error when a caller requests plain text and asks to keep
footnotes.

**Consequence for Sefaria.** The catalog asked whether the mobile app removes footnotes on purpose.
This measurement suggests a different question. If the mobile app requests a plain text format, then
nobody chose to remove footnotes. The loss follows from a format choice. The question to Sefaria
becomes whether they know this happens.

**Second consequence.** The small capitals loss is the clearest example this project has of an error
that looks correct. A reader who does not read Hebrew can see it.

### Decision 6: Default theme values come from Sefaria's palettes

**Decision.** Components emit no color literals. Every color resolves through a `--sefaria-*`
property. The default values come from `ThemeWhite.js` and `ThemeBlack.js` in `Sefaria/Sefaria-Mobile`
and resolve through `prefers-color-scheme`.

**Why.** These two commitments work together. "No color literals" alone leaves a host that does
nothing with an unstyled component. Real defaults from Sefaria's own palette mean that a host that
does nothing gets a component that looks like Sefaria and follows the color scheme.

Sample values:

| Token | Light | Dark |
|---|---|---|
| `--sefaria-surface` | `#F9F9F7` | `#2d2d2b` |
| `--sefaria-fg` | `#000` | `#fff` |
| `--sefaria-fg-muted` | `#999` | `#ddd` |
| `--sefaria-border` | `#d5d5d4` | `#444` |
| `--sefaria-accent` | `#18345D` | `#18345D` |
| `--sefaria-link` | `#0B71E7` | `#0B71E7` |

**Alternative rejected.** Publish `@sefaria/tokens` in the W3C Design Tokens format, as the
supplement recommends. Rejected twice over. The `@sefaria` namespace belongs to Sefaria, so
publishing to it is not this project's decision. A published token package is also a fourth fixed
palette with better branding, which is the outcome that the no-literals rule exists to prevent.

Third-party evidence supports the mapping approach over the package approach. Every project examined
uses its own names. ChavrutAI maps Tailwind names to CSS variables. Torah Chat holds custom
properties with literal values. talmud.page discovers and edits its own variables. Hebrew_Blender
stores reader color overrides. No project uses the `--sefaria-*` names today. Every one of them can
map onto those names in one rule.

### Decision 7: Build the oracle first

**Decision.** The oracle comes before the packages it validates.

**Why.** This is a design commitment, not a testing preference. A diacritic error renders as
plausible Hebrew. Ordinary front-end practice does not catch it.

**Consequence.** The corpus and harness are useful to Sefaria whether or not this project continues.
They are not specific to these components, and they work as a regression check on Sefaria's own
rendering.

## Evidence that changed the plan

Reading source rather than descriptions corrected four beliefs.

**Sefaria's Linker is the outlier, not the norm.** The catalog reports that the Linker writes text
with raw `.innerHTML`. Third-party projects are mostly careful. Two use DOMPurify, one uses a custom
allowlist and encodes text nodes, and three avoid HTML by asking the API for plain text. One is
unsafe. The accurate claim is narrower and stronger than "everyone renders Sefaria HTML unsafely".

**The sanitizer serves a smaller market than assumed.** Three of eight projects never receive HTML.
The client must make `return_format` easy to reach.

**Calendars matter more than links.** Four of eight projects call `/api/calendars`. Fewer call
`/api/links`. Daily study is the most common use, so the client covers calendars even though this
project builds no calendar component.

**Attribution is the least contested claim in the corpus.** One project of eight attributes each
quotation. Hebrew_Blender goes further and filters out versions whose license is not clearly
redistributable. Every other project ships a "Powered by Sefaria" logo and no per-quotation credit.

## Risks

| Risk | Mitigation |
|---|---|
| The oracle depends on a live site that this project does not control. | Report an unavailable state as distinct from a failure. Cache responses for repeated runs. |
| The OpenAPI specification is work in progress and can be wrong. | Test the nine endpoints against live responses. Report differences to Sefaria. |
| Sefaria rules against the PASEQ default. | The option makes either ruling correct. Only the default changes. |
| Effort estimates come from the catalog and carry medium confidence. | The catalog states this itself. Treat the estimates as ordering, not as a schedule. |

## Open Questions

- Does `accessibility-baseline` become its own capability, or do accessibility requirements sit in
  each component spec? This change does not settle it, because this change adds no components. The
  catalog and the design spec both treat accessibility as acceptance criteria per component.
- Does the connections panel stay a stretch goal? Four of eight projects render connections, and
  `/api/link-summary` does the grouping work on the server. The evidence is stronger than the
  stretch label suggests.
- The catalog observed 957 commentary links for `Genesis 1:1` through the interface. The
  `/api/link-summary` endpoint reports 1400 for the same reference. The cause is probably the
  deduplication rule that the interface applies. This project must resolve the difference before
  either number appears in a document.

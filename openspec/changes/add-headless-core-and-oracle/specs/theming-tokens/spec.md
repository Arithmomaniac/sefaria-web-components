## ADDED Requirements

### Requirement: Components emit no color literals

Every component SHALL resolve color through a CSS custom property. No component SHALL hold a color
literal in its internal styles.

Sefaria's web reader, mobile app, and Linker each hold their own palette, and each holds it in a
different way. An embedder cannot re-skin any of them. A component library that ships its own light
and dark themes becomes a fourth fixed palette. The useful commitment is narrower. A host must be
able to override in one rule without a fork.

#### Scenario: No literal in component styles

- **WHEN** a developer inspects the styles of any component
- **THEN** every color value is a CSS custom property reference

#### Scenario: Host overrides one token

- **WHEN** a host sets one `--sefaria-*` property on an ancestor element
- **THEN** every component beneath that element uses the new value

### Requirement: Default values come from Sefaria's own palettes

The default value of each color token SHALL come from Sefaria's own light and dark palettes, which
`ThemeWhite.js` and `ThemeBlack.js` in `Sefaria/Sefaria-Mobile` hold. The project SHALL NOT invent
default colors.

A host that does nothing must get a component that looks like Sefaria, not a component that looks
like a generic library. The mobile palettes are the right source because they already carry a light
and a dark variant of every value.

#### Scenario: Host does nothing

- **WHEN** a host places a component on a page and sets no properties
- **THEN** the component renders with Sefaria's own colors

#### Scenario: Values traceable to source

- **WHEN** a developer reads the token defaults
- **THEN** each default names the Sefaria palette entry that it comes from

### Requirement: Defaults respond to the color scheme

The default token values SHALL resolve through `prefers-color-scheme`. A host that sets no
properties SHALL get the light palette under a light scheme and the dark palette under a dark
scheme.

Sefaria's Linker popup holds no dark mode and no supported way to add one. Its colors are literals
in an injected stylesheet, and `linker.v3` holds no `prefers-color-scheme` rule.

#### Scenario: Dark scheme

- **WHEN** the host environment reports a dark color scheme and the host sets no properties
- **THEN** the component uses the dark palette values

#### Scenario: Light scheme

- **WHEN** the host environment reports a light color scheme and the host sets no properties
- **THEN** the component uses the light palette values

#### Scenario: Host overrides the scheme

- **WHEN** a host sets token values directly
- **THEN** those values apply under both color schemes

### Requirement: The token set is small and named

The library SHALL expose these color tokens: `--sefaria-surface`, `--sefaria-fg`,
`--sefaria-fg-muted`, `--sefaria-border`, `--sefaria-accent`, and `--sefaria-link`. The library
SHALL also expose `--sefaria-font-scale`, a Hebrew font family token, and an English font family
token.

#### Scenario: Token documented

- **WHEN** a developer reads the token documentation
- **THEN** each token names its purpose, its light default, and its dark default

### Requirement: Font size derives from one scale value

The library SHALL size text through a single scale value on the container, and every size beneath
SHALL derive from that value through `em`.

Sefaria's web reader already works this way. It sets an inline percentage on the reader content
element, and the value cascades. Measurement of the live site shows the value moving from 62.5% to
71.875% when the reader changes the text size.

#### Scenario: One property changes every size

- **WHEN** a host changes `--sefaria-font-scale`
- **THEN** every text size within the component changes in proportion

### Requirement: The library ships no token package

The project SHALL ship the token defaults as a stylesheet and a mapping guide. The project SHALL
NOT publish a token package to the `@sefaria` namespace.

The `@sefaria` namespace belongs to Sefaria. Publishing to it is Sefaria's decision, not this
project's decision. A stylesheet and a guide deliver the same value to a host.

#### Scenario: Host maps its own design system

- **WHEN** a host holds its own design tokens
- **THEN** the guide shows how to map them onto the `--sefaria-*` properties in one rule

### Requirement: Encapsulation does not block theming

Components SHALL use a shadow root, and the token contract SHALL work across that boundary.

CSS custom properties inherit through shadow boundaries by design. The shadow root stops style leak
in both directions and leaves the deliberate channel open. Sefaria's Linker lacks this property. It
uses `<style scoped>`, which the HTML standard removed, so its styles apply to the whole host page.

#### Scenario: Host page styles do not leak in

- **WHEN** a host page holds a rule that matches a class name that a component uses
- **THEN** the component styles do not change

#### Scenario: Component styles do not leak out

- **WHEN** a component renders on a host page
- **THEN** no host page element changes appearance

#### Scenario: Tokens cross the boundary

- **WHEN** a host sets a `--sefaria-*` property outside the component
- **THEN** the value applies inside the shadow root

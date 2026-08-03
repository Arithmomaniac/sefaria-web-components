## ADDED Requirements

### Requirement: Diacritic removal has two independent options

The library SHALL model Hebrew diacritic removal as two independent boolean options, one for
cantillation marks (ta'amim) and one for vowel points (nikud). The library SHALL NOT model
diacritic removal as a single three-state mode.

Sefaria's web reader, mobile app, and Linker each use a three-state ladder. That ladder cannot
express the state "vowel points removed, cantillation marks kept". A reading application does not
need this state. A cantillation trainer does need it.

#### Scenario: Both options keep the marks

- **WHEN** a caller removes neither cantillation marks nor vowel points
- **THEN** the function returns the input string unchanged

#### Scenario: Cantillation marks removed alone

- **WHEN** a caller removes cantillation marks and keeps vowel points
- **THEN** the function removes U+0591 to U+05AF, U+05BD, U+05BF, U+05C4, U+05C5, and U+200D
- **AND** the function keeps U+05B0 to U+05BC

#### Scenario: Vowel points removed alone

- **WHEN** a caller removes vowel points and keeps cantillation marks
- **THEN** the function removes U+05B0 to U+05BC, U+05C1, U+05C2, U+05C3, and U+05C7
- **AND** the function keeps U+0591 to U+05AF

#### Scenario: Both options remove the marks

- **WHEN** a caller removes both cantillation marks and vowel points
- **THEN** the function removes both sets of code points

#### Scenario: The three-state ladder still works

- **WHEN** a caller uses the compatibility helper with a Sefaria mode name
- **THEN** the helper maps the mode name onto the two boolean options
- **AND** the result matches the output of the matching Sefaria implementation

### Requirement: PASEQ behavior is an explicit option

The library SHALL expose U+05C0 PASEQ handling as a separate option with the values `always` and
`after-space`. The default value SHALL be `after-space`.

Sefaria's web reader always removes this mark. The mobile app removes it only after whitespace, and
removes the whitespace with it. The Linker always removes it. These three behaviors disagree, and
Sefaria has not yet ruled on which one is correct. An explicit option means that this library is
correct under either ruling.

#### Scenario: PASEQ removed after whitespace

- **WHEN** the option value is `after-space` and a PASEQ follows a space
- **THEN** the function removes the PASEQ and the space before it

#### Scenario: PASEQ kept when no whitespace precedes it

- **WHEN** the option value is `after-space` and a PASEQ does not follow a space
- **THEN** the function keeps the PASEQ

#### Scenario: PASEQ always removed

- **WHEN** the option value is `always`
- **THEN** the function removes every PASEQ and keeps the whitespace

### Requirement: Transform functions are pure

Every function in this package SHALL be pure. These functions SHALL NOT access the DOM, SHALL NOT
access the network, and SHALL NOT hold state between calls.

Four of the twelve third-party projects that this research examined cannot use a web component at
all. They are a Rust terminal application, a Python Discord bot, a bash and Python command line
tool, and a .NET desktop application. All of them do diacritic work or HTML work, or both. This
package must be usable without a renderer.

#### Scenario: Same input gives same output

- **WHEN** a caller calls a transform function twice with the same input and the same options
- **THEN** both calls return the same result

#### Scenario: No DOM dependency

- **WHEN** the package runs in an environment with no DOM
- **THEN** every function works correctly

### Requirement: Sanitization uses an allowlist

The `sanitize` function SHALL allow only these elements: `b`, `strong`, `i`, `em`, `big`, `small`,
`sup`, `br`, `span`, and `a`. The function SHALL allow only these attributes: `class` from a fixed
list of class names, `data-ref`, `data-slug`, `data-range`, `data-commentator`, and `data-order`.
The function SHALL remove every other element and every other attribute.

Sefaria's own Linker plugin writes API text into third-party pages with `.innerHTML` and no
sanitization. Most third-party projects are more careful than this. Two use DOMPurify, one uses a
custom allowlist, and three avoid HTML altogether.

#### Scenario: Allowed markup survives

- **WHEN** the input contains `<big>`, `<small>`, `<b>`, `<i>`, `<sup>`, `<br>`, `<span>`, or `<a>`
- **THEN** the function keeps these elements

#### Scenario: Script content is removed

- **WHEN** the input contains a `script` element or an `on*` attribute
- **THEN** the function removes it

#### Scenario: Style attributes are removed

- **WHEN** the input contains a `style` attribute
- **THEN** the function removes the attribute and keeps the element

#### Scenario: Nested markup survives

- **WHEN** the input contains `<b>` inside `<big>`, which Talmud text contains
- **THEN** the function keeps both elements and their nesting

#### Scenario: Unbalanced markup does not corrupt output

- **WHEN** the input contains an unclosed element
- **THEN** the function returns valid markup

### Requirement: Diacritic removal runs after parsing, not on raw markup

The library SHALL apply diacritic removal to text content only. The library SHALL NOT apply
diacritic removal to raw markup.

A code point range that matches Hebrew marks can also match characters inside an attribute value.

#### Scenario: Attribute values are not damaged

- **WHEN** the input contains an element with an attribute value and the caller removes diacritics
- **THEN** the attribute value is unchanged

### Requirement: Footnote handling is an option

The library SHALL expose footnote handling as an option with the values `keep`, `hide`, and
`remove`. The library SHALL NOT choose one behavior for every caller.

Sefaria's mobile app removes footnotes on every request. The web reader hides footnote bodies and
shows them when the reader activates a marker. Of the third-party projects examined, one extracts
footnotes and offers a toggle, one removes them, and the others ignore them. No single behavior
serves all of these callers.

#### Scenario: Footnotes kept

- **WHEN** the option value is `keep`
- **THEN** the output contains the footnote marker and the footnote body

#### Scenario: Footnotes hidden

- **WHEN** the option value is `hide`
- **THEN** the output contains the footnote body in a hidden state
- **AND** a caller can show the body without a new request

#### Scenario: Footnotes removed

- **WHEN** the option value is `remove`
- **THEN** the output contains neither the marker nor the body

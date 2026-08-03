## ADDED Requirements

### Requirement: Reference parsing has no global state

The `parseRef` function SHALL accept the book list as an injected argument. The function SHALL NOT
read a global object.

Sefaria's own implementation reads `Sefaria.booksDict`, which a 3,800 line singleton holds. That
dependency makes the logic hard to reuse outside the web application.

#### Scenario: Book list supplied by the caller

- **WHEN** a caller passes a book list and a reference string
- **THEN** the function parses the reference against that book list

#### Scenario: No global object is read

- **WHEN** the package runs with no global Sefaria object present
- **THEN** every function works correctly

### Requirement: Reference strings parse into a structured result

The `parseRef` function SHALL return a result that holds the book name, the index title, the
section numbers, and the end section numbers. When the function cannot parse the reference, it
SHALL return an error result.

#### Scenario: Simple verse reference

- **WHEN** the input is `Genesis 1:1`
- **THEN** the book is `Genesis`, the sections are `1` and `1`, and the end sections are `1` and `1`

#### Scenario: Range within one chapter

- **WHEN** the input is `Genesis 1:1-5`
- **THEN** the sections are `1` and `1`, and the end sections are `1` and `5`

#### Scenario: Range across chapters

- **WHEN** the input is `Genesis 1:31-2:3`
- **THEN** the result spans both chapters

#### Scenario: Talmud page reference

- **WHEN** the input is `Berakhot 2a`
- **THEN** the section is `2a`

#### Scenario: Commentary reference

- **WHEN** the input is `Rashi on Genesis 1:1:1`
- **THEN** the index title is `Rashi on Genesis` and the result has three levels

#### Scenario: Unknown book

- **WHEN** the book name is not in the supplied book list
- **THEN** the function returns an error result

#### Scenario: Malformed section

- **WHEN** the section part of the reference is not valid
- **THEN** the function returns an error result

### Requirement: Two normalized forms exist

The library SHALL supply a URL form and a display form. The URL form SHALL replace spaces with
underscores and colons with periods. The display form SHALL use spaces and colons.

A third-party chat application currently teaches these rules to a language model in its system
prompt. That prompt holds worked examples and a self-review step. No library supplies these rules
today.

#### Scenario: URL form

- **WHEN** the input is `Genesis 1:1`
- **THEN** the URL form is `Genesis_1.1`

#### Scenario: Display form

- **WHEN** the input is `Genesis_1.1`
- **THEN** the display form is `Genesis 1:1`

#### Scenario: Range in URL form

- **WHEN** the input is `Deuteronomy 6:4-9`
- **THEN** the URL form is `Deuteronomy.6.4-9`

### Requirement: Ranging references split into single references

The `splitRangingRef` function SHALL return one reference for each segment in the range.

#### Scenario: Range within one chapter

- **WHEN** the input is `Genesis 1:1-2`
- **THEN** the result is `Genesis 1:1` and `Genesis 1:2`

#### Scenario: Reference that is not a range

- **WHEN** the input names one segment
- **THEN** the result holds that one reference

### Requirement: Talmud page references compare numerically

The library SHALL convert Talmud page notation to an integer for comparison.

#### Scenario: Page order

- **WHEN** a caller compares `Berakhot 2a` and `Berakhot 2b`
- **THEN** `2a` sorts before `2b`

#### Scenario: Page number order

- **WHEN** a caller compares `Berakhot 2b` and `Berakhot 10a`
- **THEN** `2b` sorts before `10a`

### Requirement: Reference containment is testable

The `refContains` function SHALL report whether one reference contains another.

#### Scenario: Chapter contains verse

- **WHEN** the outer reference is `Genesis 1` and the inner reference is `Genesis 1:1`
- **THEN** the function reports that the outer reference contains the inner reference

#### Scenario: Unrelated references

- **WHEN** the outer reference is `Genesis 1` and the inner reference is `Exodus 1:1`
- **THEN** the function reports no containment

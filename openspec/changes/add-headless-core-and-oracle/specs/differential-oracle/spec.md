## ADDED Requirements

### Requirement: The harness comes before the components

The project SHALL build the differential oracle before it builds the components that the oracle
validates.

A diacritic error or a bidirectional layout error renders as plausible Hebrew. It looks correct. It
survives visual review, and it survives review by a reader who does not look for it. Character
level comparison against a known good source is the only reliable defense.

#### Scenario: Oracle exists before components

- **WHEN** a developer starts work on a component
- **THEN** the oracle already runs against the layer beneath that component

### Requirement: sefaria.org is the source of expected results

The oracle SHALL compare library output against the output of sefaria.org for the same reference.

#### Scenario: Output matches

- **WHEN** the library output equals the sefaria.org output for a reference
- **THEN** the oracle records a pass

#### Scenario: Output differs

- **WHEN** the library output differs from the sefaria.org output
- **THEN** the oracle records a failure and reports the differing code points

### Requirement: The corpus samples across categories

The corpus SHALL hold references from Tanakh with full cantillation, Mishnah, Talmud, commentary
with nested references, poetry, and texts with footnotes. The corpus SHALL sample across
categories rather than sample many segments from one book.

Fifty segments chosen across categories exercise more code paths than one thousand verses of
Genesis.

#### Scenario: Every category is present

- **WHEN** a developer inspects the corpus
- **THEN** the corpus holds at least one reference from each named category

#### Scenario: New category added

- **WHEN** the project finds a text type that the corpus does not hold
- **THEN** the project adds a reference of that type to the corpus

### Requirement: Failures report at the code point level

The oracle SHALL report the differing code points when a comparison fails. The oracle SHALL NOT
report only that two strings differ.

A difference of one combining mark is not visible in a string comparison result.

#### Scenario: One mark differs

- **WHEN** the output differs from the expected result by one combining mark
- **THEN** the report names the code point, its position, and both values

### Requirement: The pass rate is a published number

The oracle SHALL publish a pass rate for each package that it validates. The project SHALL NOT
describe correctness without this number.

#### Scenario: Pass rate published

- **WHEN** the oracle finishes a run
- **THEN** the run writes a pass rate for each validated package

### Requirement: Known divergences are held out of the pass rate

When the library behavior differs from sefaria.org on purpose, the oracle SHALL mark those cases as
known divergences. The oracle SHALL hold them out of the pass rate. The oracle SHALL NOT move the
expected result to match the library.

The PASEQ default is the first such case. When the default value is `after-space`, the output does
not match sefaria.org on text that holds a PASEQ. This difference is a design decision, not an
error. Sefaria has not yet ruled on the question.

#### Scenario: Known divergence encountered

- **WHEN** a comparison fails on a case that the project marked as a known divergence
- **THEN** the oracle records it separately and holds it out of the pass rate

#### Scenario: Ruling arrives

- **WHEN** Sefaria rules on a known divergence
- **THEN** the project removes the mark and the case counts toward the pass rate

### Requirement: The oracle states where no oracle exists

The project SHALL record which layers the oracle validates and which layers it does not.

Layer 0 and Layer 1 have a real oracle. Rendered components do not, because a custom element cannot
be compared against a React tree in a meaningful way. Those layers get structural assertions and
visual baselines, which are weaker.

#### Scenario: Coverage reported

- **WHEN** the oracle publishes a pass rate
- **THEN** the report names the layers that the oracle does not cover

### Requirement: Oracle unavailability differs from test failure

When the live site is unreachable, the oracle SHALL report an unavailable state. The oracle SHALL
NOT report a test failure.

#### Scenario: Network unavailable

- **WHEN** the oracle cannot reach sefaria.org
- **THEN** the run reports an unavailable state and no pass rate

### Requirement: The corpus and harness work without the components

The corpus and the harness SHALL work as a regression check on any implementation, not only on this
library.

#### Scenario: Third-party implementation checked

- **WHEN** another implementation supplies output for a corpus reference
- **THEN** the harness compares that output and reports a pass rate

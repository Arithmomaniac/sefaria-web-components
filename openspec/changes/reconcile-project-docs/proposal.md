## Why

Three public or shared documents describe this project, and they disagree with each other. The
repository readme is the only one of the three that is public on GitHub today, and it carries a
claim that later research retracted.

The claim is that the Sefaria Linker popup "is not reachable by keyboard". The research that
followed corrected this. The Linker popup sets `role="dialog"` and moves focus into the dialog when
it opens. It restores focus to the triggering link when it closes. The Escape key closes it.

The real defect is narrower. The popup calls `preventDefault()` on the Tab key, which disables tab
movement rather than trapping it. The close control is a `div` element with no accessible name.

The corrected account reached the document that went to Sefaria. It did not reach the readme. A
project whose credibility rests on precision must not carry an overstatement about another
organization's code.

## What Changes

- Correct the keyboard access claim in the readme. Name the real defect.
- Align the readme description of Layer 4 with the design specification. The specification calls
  Layer 4 "Demonstrations" and states that these are "demonstrations, not products". The readme
  calls it "Views and adapters" and names `@sefaria/mcp-app` as a package.
- Correct the hackathon description. It lists a connections list as core scope. Later scoping made
  the connections panel a stretch goal.
- Correct the hackathon description claim that a component will run "dropped into the existing
  Sefaria site". The design specification states that "nothing here depends on you changing your
  application".
- Record that the Linker rebuild replaced the third demonstration surface. This decision reached no
  document.

## Capabilities

### New Capabilities

None. This change corrects documents. It adds no behavior.

### Modified Capabilities

None. No requirement changes.

## Impact

- **Files**: `README.md`, and the hackathon description that lives outside this repository.
- **Audience**: the readme is public. The hackathon description is the project entry that
  stakeholders read.
- **Dependency**: none. This change can happen at any time and blocks nothing.
- **Risk**: none to code. The risk of not making this change is that a public document misstates a
  finding about Sefaria's own work.

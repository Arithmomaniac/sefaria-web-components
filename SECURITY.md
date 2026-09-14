> Created/edited by GitHub Copilot; pending human review.

# Security

This is an experimental, unpublished project with no support guarantee. The toolkit is not deployed and is not an official Sefaria or Microsoft product or service.

## Reporting a vulnerability

Do not include vulnerability details, exploit code, credentials, or private data in a public GitHub issue. GitHub private vulnerability reporting is not enabled for this repository.

Use a private contact method currently published on the [maintainer's GitHub profile](https://github.com/Arithmomaniac) to request a secure reporting channel. No response-time commitment or external corporate incident-response process applies to this repository.

## Security-relevant surfaces in this project

Two areas of this library are security-relevant by nature, and changes to them
warrant extra scrutiny:

- **HTML sanitization.** Sefaria's API returns text containing markup such as footnotes, citation links, and formatting spans. This library sanitizes that markup before rendering. Weakening the sanitizer can create a cross-site scripting risk for consumers.
- **Third-party host embedding.** These components can run inside pages the project does not control, including AI chat clients and third-party websites. Style and script isolation in both directions is a correctness requirement.

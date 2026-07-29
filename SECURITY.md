# Security

This is an experimental hackathon project with no support guarantee. It is not
deployed anywhere and is not part of any Microsoft product or service.

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues.

If you believe you have found a security vulnerability in this repository,
report it to the Microsoft Security Response Center (MSRC) at
[https://msrc.microsoft.com/create-report](https://aka.ms/opensource/security/create-report).
If you prefer not to log in, send email to
[secure@microsoft.com](mailto:secure@microsoft.com). If possible, encrypt your
message with the PGP key available at
[https://aka.ms/opensource/security/pgpkey](https://aka.ms/opensource/security/pgpkey).

You should receive a response within 24 hours. Please include as much of the
following as you can: the type of issue, the affected source files, how to
reproduce, proof-of-concept code, and the impact of the issue.

More information is available at
[https://aka.ms/opensource/security/definition](https://aka.ms/opensource/security/definition).

## Security-relevant surfaces in this project

Two areas of this library are security-relevant by nature, and changes to them
warrant extra scrutiny:

- **HTML sanitization.** Sefaria's API returns text containing markup — footnotes,
  citation links, formatting spans. This library sanitizes that markup before
  rendering. Sefaria's own existing clients assign it via `innerHTML`. Any
  weakening of the sanitizer is a cross-site scripting vector for every consumer.
- **Third-party host embedding.** These components are designed to run inside
  pages the project does not control, including AI chat clients and arbitrary
  third-party websites. Style and script isolation in both directions is a
  correctness requirement, not a convenience.

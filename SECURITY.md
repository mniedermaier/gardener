# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in Gardener, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly or use [GitHub's private vulnerability reporting](https://github.com/mniedermaier/gardener/security/advisories/new)
3. Include a description of the vulnerability, steps to reproduce, and potential impact

We will respond within 48 hours and work on a fix promptly.

## Security Considerations

Gardener is a client-side application that stores all data in the browser's localStorage. No data is sent to external servers unless the user explicitly configures a backend URL.

- **No authentication required** for the static site (data is local to the browser)
- **Weather API keys** are stored in localStorage and only sent to the configured weather API
- **Backend (Docker)** is optional and intended for local/private network use. It does not include authentication and should not be exposed to the public internet without additional security measures.
- **SVG rendering** uses hardcoded static assets only, no user-supplied SVG content

## Dependencies

We use Dependabot to monitor and update dependencies automatically. Critical security updates are applied as soon as possible.

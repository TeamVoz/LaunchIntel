# Security Policy

## Supported Versions

LaunchIntel is an actively developed open-source project. We are committed to ensuring its security and reliability. The table below indicates which versions are currently receiving security updates.

| Version | Supported          |
| :------ | :----------------- |
| 3.x.x   | :white_check_mark: |
| 2.x.x   | :x:                |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

We take all security vulnerabilities seriously. If you discover a security issue, please report it to us privately to protect the project and its users. We appreciate your efforts to disclose your findings responsibly.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to **`security@teamvoz.com`** with the subject line "Vulnerability Report: LaunchIntel".

In your report, please include the following information:

-   A clear and concise description of the vulnerability.
-   The version of LaunchIntel affected.
-   Steps to reproduce the vulnerability, including any proof-of-concept code.
-   The potential impact of the vulnerability.

## Our Commitment

Upon receiving a vulnerability report, we will:

1.  **Acknowledge**: We will acknowledge receipt of your report within 48 hours.
2.  **Investigate**: We will promptly investigate the issue to confirm the vulnerability.
3.  **Communicate**: We will maintain an open line of communication with you, providing updates on our progress.
4.  **Remediate**: Once confirmed, we will work to release a patch as quickly as possible, typically within 14-30 days, depending on the complexity of the issue.
5.  **Credit**: We will publicly credit you for your discovery (unless you prefer to remain anonymous).

## Security Best Practices

-   **Environment Variables**: Never hardcode sensitive information like API keys or channel IDs directly in the source code. Use environment variables (`.env` file or system-level) to manage secrets.
-   **Dependencies**: This project intentionally uses zero external `npm` dependencies to minimize the attack surface. Any future dependencies must be carefully vetted.
-   **Permissions**: Run the skill with the minimum necessary permissions. Avoid running as a root user.

# DigiProtect Workspace Rules

## Project Overview
DigiProtect is a secure digital evidence management platform for legal teams.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS (client/)
- **Backend**: Node.js + Express (server/)
- **Database**: SQLite via better-sqlite3
- **Auth**: JWT + bcrypt
- **Encryption**: AES-256-GCM
- **Integrity**: SHA-256

## Conventions
1. All API routes are prefixed with `/api/`
2. Authentication uses Bearer JWT tokens
3. Passwords are hashed with bcrypt (cost factor 12)
4. Evidence files are encrypted with AES-256-GCM before storage
5. SHA-256 hashes are computed from original file content BEFORE encryption
6. The encryption key is loaded from environment variables only — never stored in SQLite
7. All significant actions create audit log entries
8. Backend performs all authorization checks — never rely on frontend alone
9. Legal Officers can only access their own cases and evidence
10. Admin has read-only visibility across the system
11. Seeds must be idempotent — safe to run multiple times
12. No secrets in frontend code or git history

## Error Handling
- Fix root cause, not symptoms
- Don't randomly rewrite unrelated files
- Test after every fix
- Check for regressions

## Dependencies
- Keep dependencies minimal
- No ORMs, no cloud services, no external auth providers
- Only add what is absolutely necessary

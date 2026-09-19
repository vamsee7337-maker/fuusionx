# DigiProtect Development Workflow

## Build Order
1. Backend core: Express server + SQLite + schema + seed + health endpoint
2. Backend auth: Register + Login + JWT middleware + role authorization
3. Backend API: Officers, Cases, Evidence, Audit endpoints
4. Frontend core: Vite + React + Tailwind + routing + auth context
5. Frontend pages: Login, Register, Admin dashboard, Officer dashboard
6. Documentation: README, ARCHITECTURE, API, SECURITY docs
7. End-to-end testing

## Testing Protocol
- Start backend and verify health endpoint
- Test each API endpoint with curl or equivalent
- Start frontend and verify UI renders
- Test complete workflows end-to-end
- Test error cases and unauthorized access

## Incremental Verification
- After each phase, run and test before proceeding
- Never claim a feature works without executing it
- Fix failures at root cause before continuing

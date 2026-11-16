# E-Gate Admin Panel

Internal panel for the E-Gate team. New companies that register on E-Gate start as **Pending** and
cannot log in until someone approves them here.

| Status    | Can log in? | What the panel can do        |
|-----------|-------------|------------------------------|
| Pending   | No          | Approve, Reject (with reason) |
| Approved  | Yes         | Suspend (with reason)         |
| Rejected  | No          | Approve                       |
| Suspended | No          | Reactivate                    |

Rejecting or suspending logs everyone in that company out at once (dashboard, gate and pre-invite).
The company admin gets an email on every change, and active Admin Panel users get an email when a new
company registers. Companies that existed before this feature were marked Approved automatically.

## Setup

1. Backend (`../E-Gate-Backend`) must be running. The simplest way to get a login is the backend `.env`:

   ```env
   ADMIN_PANEL_EMAIL=you@company.com
   ADMIN_PANEL_PASSWORD=at-least-8-characters
   ```

   On every start the backend creates this admin, or resets its password to the one in `.env`
   (so a password changed in the panel goes back to the `.env` one after a restart).

   Or create logins from the command line:

   ```bash
   npm run create-admin -- --email you@company.com --name "Your Name"
   ```

   It asks for a password (8+ characters). Running it again for the same email resets the password.
   More admins can be added later from **Admin users** in the panel.

2. Optional, in the backend `.env`: `AdminPanelUrl=http://localhost:5174/eGate-admin` so the
   "new registration" email links to the company in this panel.

3. Here:

   ```bash
   cp .env.example .env   # point VITE_API / VITE_IMG at the backend
   npm install
   npm run dev            # http://localhost:5174/eGate-admin/
   ```

`npm run build` writes `dist/`, to be served under `/eGate-admin/`.

## Backend pieces

- `src/routes/platformAdmin.js`, `src/controllers/platformAdmin.js`: the `/admin/*` API
- `src/middleware/checkPlatformAdmin.js`: Admin Panel tokens (separate from company logins)
- `src/models/platformAdmin.js`: admin users (scrypt-hashed passwords)
- `src/utils/companyStatus.js`: approval statuses and the login check used by every company login

# ANNATOR / AI MONEY FLOW ARCHITECTURE

## Locked roles

### 1. Client frontend
URL: https://aimoneyflow.netlify.app/
Role: Public client-facing portal.
Purpose:
- represent the loan service professionally
- explain AI Money Flow
- show how multiple financing paths are found
- allow user registration/login
- collect client intake data
- show client-side application progress and AI results

This is not the admin panel.

### 2. Admin / ATOM frontend
URL candidate: https://agent-6a3d410d82ea71451c677472--annator.netlify.app/marketplace
Role: Manager/operator UI for Tom, Olli and internal users.
Purpose:
- view client applications
- view risk scores
- view AI analysis
- view missing documents
- compare lender paths
- manage workflows
- use ATOM tools, agents and marketplace

This is not the public client landing page.

### 3. Backend API
Host candidate: Hugging Face Docker Space: techprotrade/annator
Role: Server-side application layer.
Purpose:
- receive frontend requests
- handle auth/session logic
- validate intake data
- run AI/risk analysis
- calculate possible lender flows
- write and read data from Neon
- keep secrets out of browser

### 4. Database
Provider: Neon PostgreSQL
Role: Main structured database.
Stores:
- users
- profiles
- loan applications
- personal applicant data
- company applicant data
- income/obligations/assets
- bank checklist state
- document metadata
- AI analysis results
- risk scores
- lender routes
- admin notes
- audit logs

Frontend must not connect directly to Neon.

## Main data flow

Client:
aimoneyflow frontend -> backend API -> Neon -> backend API -> client dashboard

Admin:
ATOM admin frontend -> backend API -> Neon -> backend API -> case dashboard

## Product flow

1. Visitor opens aimoneyflow.netlify.app
2. Visitor reads professional loan service landing page
3. Visitor clicks "Alusta laenuteekonda"
4. Visitor creates account or logs in
5. Client fills intake:
   - personal data
   - requested amount
   - loan purpose
   - income
   - liabilities
   - assets/collateral
   - bank checklist
   - documents
6. Backend saves application to Neon
7. AI evaluates risk and missing data
8. AI creates several possible financing paths
9. Client sees status and next steps
10. Admin sees the case in ATOM UI

## Important rules

- aimoneyflow is client-facing.
- ATOM / Annator is admin-facing.
- Neon is database only.
- Backend owns all secrets.
- Frontend never uses localhost in production.
- Frontend never connects directly to Neon.
- Local ATOM is for development only.
- Live ATOM admin should run as a web UI.

# Factory Memory OS

**Every Machine. Every Material. Every Production Record. Connected.**  
*The Digital Memory of Manufacturing*

Factory Memory OS is a full-stack, role-based manufacturing operations and industrial memory platform built with React, TypeScript, Tailwind CSS, Express, Firebase Authentication, Cloud Firestore, Gemini (`@google/genai`), and Progressive Web App (PWA) offline support.

---

## Core Modules

1. **Overview (`/`)**: Plant-wide KPIs (shift production, downtime, open electrical/mechanical incidents, material holds, preventive alerts, recent activity, and one-click sample pilot workspace seeding).
2. **Production (`/production`)**: Shift production run logging, planned vs. actual efficiency tracking, defect rates, hourly logs, CSV export, and bulk CSV import.
3. **Materials (`/materials`)**: Raw material master inventory, supplier details, reorder thresholds, incoming inspection checks (moisture, contamination, color, physical integrity), material movements, and consumption logs.
4. **Machines (`/machines`)**: Equipment master registry, operational state tracking (`Running`, `Idle`, `Under Maintenance`, `Faulted`, `Decommissioned`), runtime hours, and maintenance history linkage.
5. **Machine Incidents (`/incidents`)**: Rapid breakdown reporting routed to Electrical or Mechanical Maintenance teams with automatic downtime entry and priority alerting.
6. **Electrical & Mechanical Maintenance (`/electrical-maintenance`, `/mechanical-maintenance`)**: Discipline-specific digital maintenance logbooks, repeated fault history, spare parts tracking, and Shift-End reports submitted for Maintenance Head review.
7. **Preventive Maintenance (`/preventive-maintenance`)**: Scheduled lubrication, calibration, belt inspection, and panel servicing calendars with overdue highlighting and completion sign-off.
8. **Downtime (`/downtime`)**: Automatic and manual downtime breakdown logging categorized by electrical fault, mechanical breakdown, material shortage, changeover, or operator absence.
9. **Quality Control (`/quality-control`)**: Incoming raw material checks, in-process inspections, finished batch QC sign-offs, and defect categorization (`Approved`, `Hold`, `Rejected`).
10. **Shift Reports (`/shift-reports`)**: Unified Production, Electrical Maintenance, and Mechanical Maintenance shift handovers with approval workflows and audit traceability.
11. **Document Archive (`/document-archive`)**: Searchable index of digitized SOPs, manuals, calibration certificates, and handover attachments.
12. **Factory Memory AI (`/factory-ai`)**: Server-side grounded natural-language retrieval (`/api/ai/query`) over authorized factory records with explicit record citations, separation of Recorded Facts vs. AI Analytical Observations, Data Gaps, and industrial safety boundaries.
13. **Analytics (`/analytics`)**: Interactive Recharts dashboards for production trends, downtime pareto by category, machine fault ranking, and material wastage.
14. **Notifications (`/notifications`)**: Real-time alerts for critical breakdowns, low-stock materials, preventive maintenance due dates, and pending Maintenance Head reviews.
15. **User Management (`/user-management`)**: RBAC directory across 11 plant roles plus Maintenance Head designation and live permission matrix.
16. **Settings (`/settings`)**: Plant profile, shift configuration, production lines, fault categories, notification thresholds, and database connectivity verification.

---

## Security & Role-Based Access Control (RBAC)

- **Authentication**: Firebase Authentication (Google Sign-In with email verification enforced in security rules).
- **Database Isolation**: Cloud Firestore scoped under `/factories/{factoryId}/*` with per-document `accessUids`, server timestamp validation (`createdAt`/`updatedAt == request.time`), immutable `auditLogs`, and strict PII separation under `/users/{userId}/private/info`.
- **11 Plant Roles**:
  - `super_admin`, `factory_admin`, `factory_manager`, `production_manager`, `production_supervisor`, `electrical_maintenance`, `mechanical_maintenance`, `material_checker`, `storekeeper`, `quality_control`, `machine_operator` (plus optional `isMaintenanceHead` designation).

---

## PWA & Offline Queue

- Configured via `vite-plugin-pwa` with generated PNG/SVG manifest icons and runtime caching (excluding `/api/*`).
- Offline-queued operational records persist in IndexedDB (`src/lib/offlineQueue.ts`) with idempotency keys (`clientRequestId`) and automatically sync with conflict detection when connectivity returns.

---

## Environment Variables

Configure secrets via `.env` or your hosting environment (see `.env.example`):

- `GEMINI_API_KEY`: Required server-side by `/api/ai/query` for Factory Memory AI. Never exposed to the client.
- `PORT`: Server port (defaults to `3000`).

Firebase web configuration is read from `/firebase-applet-config.json`.

---

## Commands

```bash
# Install dependencies
npm install

# Run development server (Express + Vite middleware on port 3000)
npm run dev

# Build production bundle
npm run build

# Typecheck
npm run lint

# Run production server
npm start
```

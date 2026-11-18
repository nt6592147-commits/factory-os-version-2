# Factory Memory OS — Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Tenant (Factory) Isolation**: Every operational record belongs to exactly one `factoryId` under `factories/{factoryId}/...` and carries immutable `factoryId`, `factoryOwnerUid`, and `createdByUid` fields. Cross-factory reads and writes are impossible.
2. **PII Isolation**: User email addresses and phone numbers live exclusively in `users/{userId}/private/info` and are readable/writable only by that exact authenticated `userId` (`email_verified == true`) or the bootstrapped platform admin. Operational member records (`factories/{factoryId}/members/{memberUid}`) contain zero PII.
3. **Role-Based Access Control (RBAC)**: Roles (`super_admin`, `factory_admin`, `factory_manager`, `production_manager`, `production_supervisor`, `electrical_maintenance`, `mechanical_maintenance`, `material_checker`, `storekeeper`, `quality_control`, `machine_operator`) are stored in trusted `factories/{factoryId}/members/{uid}` documents and cannot be self-assigned or escalated by non-admin users.
4. **Temporal & Identity Integrity**: `createdAt` and `updatedAt` must equal `request.time` on creation; `createdAt`, `createdByUid`, `factoryId`, and `factoryOwnerUid` are immutable after creation.
5. **Audit Log Immutability**: Records in `factories/{factoryId}/auditLogs/{logId}` are append-only (`allow update, delete: if false;`).
6. **List Query Safety**: All `allow list` rules evaluate `resource.data` directly against `request.auth.uid` (no blanket `allow list: if isSignedIn()` and zero `get()`/`exists()` inside `allow list`).

## 2. "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read**: Anonymous client attempts `getDoc` on `/factories/factory_pilot_01/machines/m1` -> `PERMISSION_DENIED`.
2. **Cross-Tenant List**: Authenticated user of Factory B queries `/factories/factory_pilot_01/productionRecords` without matching `accessUids`/`factoryOwnerUid` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Create**: User A submits `createdByUid: "user_B"` in `machineIncidents` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection ("Ghost Field")**: User adds `isAdminApproved: true` or `bypassAudit: true` to a `shiftReports` payload -> rejected by `keys().hasOnly(...)`.
5. **Self-Role Escalation**: `machine_operator` updates their own `members/{uid}` document changing `role` to `super_admin` -> `PERMISSION_DENIED`.
6. **Email Spoofing (`email_verified: false`)**: Unverified token claiming admin email attempts admin write -> `PERMISSION_DENIED`.
7. **PII Harvesting**: Authenticated coworker reads `/users/otherUid/private/info` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Client writes document with 500-char ID or invalid characters `../admin` -> rejected by `isValidId()`.
9. **Resource Exhaustion (1MB String)**: Client submits 200,000-char string in `description` -> rejected by `.size() <= MAX`.
10. **Immutable Field Tampering**: User updates `createdAt` or `factoryId` on an existing `downtimeRecords` entry -> `PERMISSION_DENIED`.
11. **Terminal State Bypass**: Technician updates an already `approved` `shiftReports` record -> `PERMISSION_DENIED` unless admin.
12. **Audit Log Erasure**: Factory user attempts `deleteDoc` or `updateDoc` on `auditLogs/{logId}` -> `PERMISSION_DENIED`.

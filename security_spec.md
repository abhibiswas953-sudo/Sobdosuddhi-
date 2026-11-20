# Sobdosuddhi.1.0 Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Author Privacy (PII & Literary IP Isolation):**
   - `users/{userId}` contains PII (`email`). Only the authenticated owner (`request.auth.uid == userId`) can `get`, `create`, `update`, or `delete`. Listing `users` is completely forbidden.
   - `manuscripts/{manuscriptId}` contains private unpublished literary manuscripts. Only `ownerId == request.auth.uid` can read, list, create, update, or delete.
   - `manuscripts/{manuscriptId}/revisions/{revisionId}` inherits ownership from its parent manuscript (`Master Gate` via `get()` on single-doc operations, and `resource.data.ownerId == request.auth.uid` on list queries).
2. **Verified Identity:**
   - All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Immutability & Temporal Integrity:**
   - `uid`, `ownerId`, `manuscriptId`, and `createdAt` are strictly immutable after creation.
   - `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
4. **Terminal State Locking:**
   - Once a manuscript `status` is set to `'সুরক্ষিত'` (Locked Final), all subsequent `update` writes are denied.
5. **Volumetric & Schema Enforcement:**
   - All document IDs match `^[a-zA-Z0-9_\-]+$` and `<= 128` chars.
   - Every string field enforces explicit `.size()` bounds matching `firebase-blueprint.json`.
   - `issues` array is strictly bounded to `<= 200` items and checked for map element type.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Ghost Field Injection (Shadow Create on User):** Creating `/users/{uid}` with extra field `{ "isAdmin": true }`.
2. **Ghost Field Injection (Shadow Update on Manuscript):** Updating `/manuscripts/{id}` with extra field `{ "verifiedBadge": true }`.
3. **Unverified Email Spoof:** Writing `/manuscripts/{id}` with `email_verified: false`.
4. **PII Cross-User Read:** Authenticated User B attempting `get` on `/users/{userA}`.
5. **Users Collection Scraping:** Authenticated User attempting `list` on `/users`.
6. **Cross-User Manuscript List Scraping:** Unscoped `list` query on `/manuscripts` without `where('ownerId', '==', uid)`.
7. **Owner Hijack on Create:** User A creating `/manuscripts/{id}` with `ownerId: "userB"`.
8. **Immutable Owner Mutation:** User A updating `ownerId` or `createdAt` on their own manuscript.
9. **Client Timestamp Forgery:** Creating a manuscript with a backdated client timestamp instead of `request.time`.
10. **ID Poisoning Attack:** Creating `/manuscripts/invalid..$id#payload` or a 200-character document ID.
11. **Terminal State Bypass:** Updating `content` on a manuscript whose existing `status == 'সুরক্ষিত'`.
12. **Orphaned / Cross-Owner Revision Creation:** Creating `/manuscripts/{nonExistentOrOtherUserId}/revisions/{revId}` or injecting an oversized `issues` array (`> 200` elements) or oversized string (`> 100000` chars).

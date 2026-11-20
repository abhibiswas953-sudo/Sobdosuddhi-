/**
 * Phase 0 Security Rules Verification Specification for Sobdosuddhi.1.0
 * Documents all 12 Dirty Dozen adversarial payloads expected to fail with PERMISSION_DENIED
 * against firestore.rules when executed in the Firebase Rules Unit Testing emulator.
 */

export interface AdversarialCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const dirtyDozenCases: AdversarialCase[] = [
  {
    id: 1,
    name: 'Shadow Create with Ghost Field on UserProfile',
    operation: 'create',
    path: 'users/authorA',
    auth: { uid: 'authorA', email_verified: true },
    payload: {
      uid: 'authorA',
      displayName: 'রবীন্দ্র',
      email: 'a@example.com',
      spellingStandard: 'bangla_academy',
      literaryStrictness: 'balanced',
      preservePoeticLicense: true,
      preserveRegionalDialects: true,
      autoSave: true,
      darkMode: false,
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Update with Ghost Field on Manuscript',
    operation: 'update',
    path: 'manuscripts/ms01',
    auth: { uid: 'authorA', email_verified: true },
    payload: { title: 'নতুন শিরোনাম', ghostFlag: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write Attempt',
    operation: 'create',
    path: 'manuscripts/ms02',
    auth: { uid: 'authorA', email_verified: false },
    payload: { ownerId: 'authorA', title: 'কবিতা', category: 'কবিতা' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Cross-User Profile Read',
    operation: 'get',
    path: 'users/authorA',
    auth: { uid: 'authorB', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Users Collection List Enumeration',
    operation: 'list',
    path: 'users',
    auth: { uid: 'authorA', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Cross-User Manuscript Read',
    operation: 'get',
    path: 'manuscripts/msOwnedByA',
    auth: { uid: 'authorB', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Owner UID Spoofing on Manuscript Create',
    operation: 'create',
    path: 'manuscripts/ms03',
    auth: { uid: 'authorA', email_verified: true },
    payload: { ownerId: 'authorB', title: 'গল্প', category: 'গল্প' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable ownerId Mutation on Update',
    operation: 'update',
    path: 'manuscripts/ms01',
    auth: { uid: 'authorA', email_verified: true },
    payload: { ownerId: 'authorB' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Forged Client Timestamp on Create',
    operation: 'create',
    path: 'manuscripts/ms04',
    auth: { uid: 'authorA', email_verified: true },
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Poisoning with Illegal Characters',
    operation: 'create',
    path: 'manuscripts/bad..$id#hack',
    auth: { uid: 'authorA', email_verified: true },
    payload: { ownerId: 'authorA', title: 'গল্প' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Terminal State Bypass on Locked Manuscript',
    operation: 'update',
    path: 'manuscripts/msLocked',
    auth: { uid: 'authorA', email_verified: true },
    payload: { content: 'পরিবর্তিত পাঠ্য' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned Revision on Unowned Parent Manuscript',
    operation: 'create',
    path: 'manuscripts/msOwnedByB/revisions/rev01',
    auth: { uid: 'authorA', email_verified: true },
    payload: { ownerId: 'authorA', manuscriptId: 'msOwnedByB' },
    expected: 'PERMISSION_DENIED',
  },
];

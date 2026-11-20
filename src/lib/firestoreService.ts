import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  BLUEPRINT_LIMITS,
  type Manuscript,
  type ManuscriptCategory,
  type ManuscriptStatus,
  type ProofreadIssue,
  type ProofreadRevision,
  type UserPreferences,
  type UserProfile,
} from '../types';
import { countWords } from './bengali';

const DEFAULT_PREFERENCES: UserPreferences = {
  spellingStandard: 'bangla_academy',
  literaryStrictness: 'balanced',
  preservePoeticLicense: true,
  preserveRegionalDialects: true,
  autoSave: true,
  darkMode: false,
};

function toDateOrNull(val: unknown): Date | null {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return null;
}

function generateSafeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  const id = `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_\-]/g, '');
  return id.slice(0, BLUEPRINT_LIMITS.ID_MAX_LEN);
}

function sanitizeIssues(issues: ProofreadIssue[]): ProofreadIssue[] {
  return issues.slice(0, BLUEPRINT_LIMITS.ISSUES_MAX).map((iss) => ({
    id: String(iss.id || generateSafeDocId('iss')).slice(0, 80),
    original: String(iss.original || '').slice(0, 500),
    suggestion: String(iss.suggestion || '').slice(0, 500),
    category: String(iss.category || 'বাংলা বানান ভুল').slice(0, 120),
    severity:
      iss.severity === 'definite' || iss.severity === 'warning' || iss.severity === 'style'
        ? iss.severity
        : 'warning',
    explanation: String(iss.explanation || '').slice(0, 600),
    contextSnippet: String(iss.contextSnippet || '').slice(0, 240),
    status:
      iss.status === 'accepted' || iss.status === 'rejected' || iss.status === 'pending'
        ? iss.status
        : 'pending',
    chapterTitle: iss.chapterTitle ? String(iss.chapterTitle).slice(0, 150) : '',
  }));
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: data.uid || user.uid,
        displayName: data.displayName || user.displayName || 'লেখক',
        email: data.email || user.email || '',
        photoURL: data.photoURL || user.photoURL || '',
        spellingStandard: data.spellingStandard || DEFAULT_PREFERENCES.spellingStandard,
        literaryStrictness: data.literaryStrictness || DEFAULT_PREFERENCES.literaryStrictness,
        preservePoeticLicense:
          typeof data.preservePoeticLicense === 'boolean'
            ? data.preservePoeticLicense
            : DEFAULT_PREFERENCES.preservePoeticLicense,
        preserveRegionalDialects:
          typeof data.preserveRegionalDialects === 'boolean'
            ? data.preserveRegionalDialects
            : DEFAULT_PREFERENCES.preserveRegionalDialects,
        autoSave:
          typeof data.autoSave === 'boolean' ? data.autoSave : DEFAULT_PREFERENCES.autoSave,
        darkMode:
          typeof data.darkMode === 'boolean' ? data.darkMode : DEFAULT_PREFERENCES.darkMode,
        createdAt: toDateOrNull(data.createdAt),
        updatedAt: toDateOrNull(data.updatedAt),
      };
    }

    const fallbackProfile: UserProfile = {
      uid: user.uid,
      displayName: (user.displayName || user.email?.split('@')[0] || 'লেখক').slice(
        0,
        BLUEPRINT_LIMITS.DISPLAY_NAME_MAX
      ),
      email: (user.email || 'author@sobdosuddhi.local').slice(0, BLUEPRINT_LIMITS.EMAIL_MAX),
      photoURL: (user.photoURL || '').slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX),
      ...DEFAULT_PREFERENCES,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Only write to Firestore if email is verified (enforced by firestore.rules)
    if (!user.emailVerified) {
      return fallbackProfile;
    }

    const payload: Record<string, unknown> = {
      uid: user.uid,
      displayName: fallbackProfile.displayName,
      email: fallbackProfile.email,
      spellingStandard: fallbackProfile.spellingStandard,
      literaryStrictness: fallbackProfile.literaryStrictness,
      preservePoeticLicense: fallbackProfile.preservePoeticLicense,
      preserveRegionalDialects: fallbackProfile.preserveRegionalDialects,
      autoSave: fallbackProfile.autoSave,
      darkMode: fallbackProfile.darkMode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (fallbackProfile.photoURL) {
      payload.photoURL = fallbackProfile.photoURL;
    }

    await setDoc(ref, payload);
    return fallbackProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfileSettings(
  uid: string,
  updates: Partial<UserPreferences & { displayName: string; photoURL?: string }>
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof updates.displayName === 'string' && updates.displayName.trim().length > 0) {
    payload.displayName = updates.displayName.trim().slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
  }
  if (typeof updates.photoURL === 'string') {
    payload.photoURL = updates.photoURL.slice(0, BLUEPRINT_LIMITS.PHOTO_URL_MAX);
  }
  if (updates.spellingStandard) {
    payload.spellingStandard = updates.spellingStandard;
  }
  if (updates.literaryStrictness) {
    payload.literaryStrictness = updates.literaryStrictness;
  }
  if (typeof updates.preservePoeticLicense === 'boolean') {
    payload.preservePoeticLicense = updates.preservePoeticLicense;
  }
  if (typeof updates.preserveRegionalDialects === 'boolean') {
    payload.preserveRegionalDialects = updates.preserveRegionalDialects;
  }
  if (typeof updates.autoSave === 'boolean') {
    payload.autoSave = updates.autoSave;
  }
  if (typeof updates.darkMode === 'boolean') {
    payload.darkMode = updates.darkMode;
  }

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeUserManuscripts(
  uid: string,
  onData: (manuscripts: Manuscript[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'manuscripts';
  const q = query(collection(db, path), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Manuscript[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: d.ownerId || uid,
          title: d.title || 'শিরোনামহীন পান্ডুলিপি',
          category: (d.category as ManuscriptCategory) || 'গল্প',
          originalText: d.originalText || '',
          content: d.content || '',
          wordCount: typeof d.wordCount === 'number' ? d.wordCount : countWords(d.content || ''),
          charCount: typeof d.charCount === 'number' ? d.charCount : (d.content || '').length,
          errorsFound: typeof d.errorsFound === 'number' ? d.errorsFound : 0,
          errorsResolved: typeof d.errorsResolved === 'number' ? d.errorsResolved : 0,
          status: (d.status as ManuscriptStatus) || 'খসড়া',
          issues: Array.isArray(d.issues) ? (d.issues as ProofreadIssue[]) : [],
          sourceFileName: d.sourceFileName || '',
          createdAt: toDateOrNull(d.createdAt),
          updatedAt: toDateOrNull(d.updatedAt),
        };
      });
      items.sort((a, b) => {
        const tA = a.updatedAt ? a.updatedAt.getTime() : 0;
        const tB = b.updatedAt ? b.updatedAt.getTime() : 0;
        return tB - tA;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function createManuscript(
  ownerId: string,
  data: {
    title: string;
    category: ManuscriptCategory;
    content: string;
    originalText?: string;
    sourceFileName?: string;
  }
): Promise<string> {
  const manuscriptId = generateSafeDocId('ms');
  const path = `manuscripts/${manuscriptId}`;
  const safeContent = data.content.slice(0, BLUEPRINT_LIMITS.TEXT_MAX);
  const safeOriginal = (data.originalText ?? safeContent).slice(0, BLUEPRINT_LIMITS.TEXT_MAX);
  const safeTitle = (data.title.trim() || 'নতুন পান্ডুলিপি').slice(0, BLUEPRINT_LIMITS.TITLE_MAX);

  const payload: Record<string, unknown> = {
    ownerId,
    title: safeTitle,
    category: data.category,
    originalText: safeOriginal,
    content: safeContent,
    wordCount: Math.min(countWords(safeContent), BLUEPRINT_LIMITS.TEXT_MAX),
    charCount: safeContent.length,
    errorsFound: 0,
    errorsResolved: 0,
    status: 'খসড়া' as ManuscriptStatus,
    issues: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (data.sourceFileName) {
    payload.sourceFileName = data.sourceFileName.slice(0, BLUEPRINT_LIMITS.SOURCE_FILENAME_MAX);
  }

  try {
    await setDoc(doc(db, 'manuscripts', manuscriptId), payload);
    return manuscriptId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveManuscript(
  manuscriptId: string,
  data: {
    title: string;
    category: ManuscriptCategory;
    originalText?: string;
    content: string;
    issues: ProofreadIssue[];
    status: ManuscriptStatus;
    sourceFileName?: string;
  }
): Promise<void> {
  const path = `manuscripts/${manuscriptId}`;
  const safeContent = data.content.slice(0, BLUEPRINT_LIMITS.TEXT_MAX);
  const safeTitle = (data.title.trim() || 'শিরোনামহীন পান্ডুলিপি').slice(
    0,
    BLUEPRINT_LIMITS.TITLE_MAX
  );
  const safeIssues = sanitizeIssues(data.issues);
  const resolvedCount = safeIssues.filter((i) => i.status !== 'pending').length;

  const payload: Record<string, unknown> = {
    title: safeTitle,
    category: data.category,
    content: safeContent,
    wordCount: Math.min(countWords(safeContent), BLUEPRINT_LIMITS.TEXT_MAX),
    charCount: safeContent.length,
    errorsFound: Math.min(safeIssues.length, 10000),
    errorsResolved: Math.min(resolvedCount, 10000),
    issues: safeIssues,
    status: data.status,
    updatedAt: serverTimestamp(),
  };

  if (typeof data.originalText === 'string') {
    payload.originalText = data.originalText.slice(0, BLUEPRINT_LIMITS.TEXT_MAX);
  }

  if (typeof data.sourceFileName === 'string') {
    payload.sourceFileName = data.sourceFileName.slice(0, BLUEPRINT_LIMITS.SOURCE_FILENAME_MAX);
  }

  try {
    await updateDoc(doc(db, 'manuscripts', manuscriptId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function lockManuscriptFinal(manuscriptId: string): Promise<void> {
  const path = `manuscripts/${manuscriptId}`;
  try {
    await updateDoc(doc(db, 'manuscripts', manuscriptId), {
      status: 'সুরক্ষিত',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteManuscript(manuscriptId: string): Promise<void> {
  const path = `manuscripts/${manuscriptId}`;
  try {
    await deleteDoc(doc(db, 'manuscripts', manuscriptId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createRevisionSnapshot(
  ownerId: string,
  manuscriptId: string,
  data: {
    chapterTitle: string;
    originalText: string;
    correctedText: string;
    issuesCount: number;
    acceptedCount: number;
    rejectedCount: number;
    note: string;
  }
): Promise<string> {
  const revisionId = generateSafeDocId('rev');
  const path = `manuscripts/${manuscriptId}/revisions/${revisionId}`;
  const safeOriginal = data.originalText.slice(0, BLUEPRINT_LIMITS.TEXT_MAX);
  const safeCorrected = data.correctedText.slice(0, BLUEPRINT_LIMITS.TEXT_MAX);

  try {
    await setDoc(doc(db, 'manuscripts', manuscriptId, 'revisions', revisionId), {
      ownerId,
      manuscriptId,
      chapterTitle: (data.chapterTitle || 'সম্পূর্ণ পান্ডুলিপি').slice(0, BLUEPRINT_LIMITS.TITLE_MAX),
      originalText: safeOriginal,
      correctedText: safeCorrected,
      wordCount: Math.min(countWords(safeCorrected), BLUEPRINT_LIMITS.TEXT_MAX),
      issuesCount: Math.min(Math.max(0, Math.floor(data.issuesCount)), 10000),
      acceptedCount: Math.min(Math.max(0, Math.floor(data.acceptedCount)), 10000),
      rejectedCount: Math.min(Math.max(0, Math.floor(data.rejectedCount)), 10000),
      note: (data.note || 'প্রুফরিডিং সংস্করণ সংরক্ষিত').slice(0, BLUEPRINT_LIMITS.NOTE_MAX),
      createdAt: serverTimestamp(),
    });
    return revisionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchAllRevisionsForUser(
  uid: string,
  manuscripts: Manuscript[]
): Promise<ProofreadRevision[]> {
  const results: ProofreadRevision[] = [];

  for (const ms of manuscripts.slice(0, 25)) {
    const revPath = `manuscripts/${ms.id}/revisions`;
    try {
      const q = query(
        collection(db, 'manuscripts', ms.id, 'revisions'),
        where('ownerId', '==', uid)
      );
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        results.push({
          id: docSnap.id,
          ownerId: d.ownerId || uid,
          manuscriptId: d.manuscriptId || ms.id,
          manuscriptTitle: ms.title,
          chapterTitle: d.chapterTitle || 'সম্পূর্ণ পান্ডুলিপি',
          originalText: d.originalText || '',
          correctedText: d.correctedText || '',
          wordCount: typeof d.wordCount === 'number' ? d.wordCount : 0,
          issuesCount: typeof d.issuesCount === 'number' ? d.issuesCount : 0,
          acceptedCount: typeof d.acceptedCount === 'number' ? d.acceptedCount : 0,
          rejectedCount: typeof d.rejectedCount === 'number' ? d.rejectedCount : 0,
          note: d.note || '',
          createdAt: toDateOrNull(d.createdAt),
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, revPath);
    }
  }

  return results.sort((a, b) => {
    const tA = a.createdAt ? a.createdAt.getTime() : 0;
    const tB = b.createdAt ? b.createdAt.getTime() : 0;
    return tB - tA;
  });
}

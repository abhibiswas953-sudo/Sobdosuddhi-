export type ManuscriptCategory = 'কবিতা' | 'গল্প' | 'উপন্যাস' | 'প্রবন্ধ' | 'অন্যান্য';

export type ManuscriptStatus = 'খসড়া' | 'প্রুফরিড সম্পন্ন' | 'সুরক্ষিত';

export type IssueSeverity = 'definite' | 'warning' | 'style';

export type IssueStatus = 'pending' | 'accepted' | 'rejected';

export type SpellingStandard = 'bangla_academy' | 'paschimbanga_academy' | 'rabindrik_sahitya';

export type LiteraryStrictness = 'conservative' | 'balanced' | 'thorough';

export type EditorFontSize = 'sm' | 'md' | 'lg' | 'xl';

export type AppView = 'home' | 'editor' | 'results' | 'manuscripts' | 'history' | 'settings';

export const MANUSCRIPT_CATEGORIES: ManuscriptCategory[] = [
  'কবিতা',
  'গল্প',
  'উপন্যাস',
  'প্রবন্ধ',
  'অন্যান্য',
];

// Primary Material 3 writing modes mapping cleanly onto Firestore-validated categories
export const PRIMARY_WRITING_MODES: {
  label: string;
  subtitle: string;
  category: ManuscriptCategory;
}[] = [
  {
    label: 'বাংলা কবিতা',
    subtitle: 'ছন্দ, চিত্রকল্প ও কাব্যিক স্বাধীনতা সুরক্ষিত',
    category: 'কবিতা',
  },
  {
    label: 'বাংলা গল্প ও উপন্যাস',
    subtitle: 'ব্যাকরণ, সংলাপ ও গদ্যশৈলী সংরক্ষিত',
    category: 'গল্প',
  },
];

export function formatCategoryDisplay(cat: ManuscriptCategory): string {
  if (cat === 'কবিতা') return 'বাংলা কবিতা';
  if (cat === 'গল্প' || cat === 'উপন্যাস') return 'বাংলা গল্প ও উপন্যাস';
  return cat;
}

// Synchronized verbatim with firebase-blueprint.json volumetric constraints
export const BLUEPRINT_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  ID_MAX_LEN: 128,
  DISPLAY_NAME_MAX: 120,
  EMAIL_MAX: 200,
  PHOTO_URL_MAX: 500,
  TITLE_MAX: 200,
  TEXT_MAX: 100000,
  SOURCE_FILENAME_MAX: 255,
  ISSUES_MAX: 200,
  NOTE_MAX: 500,
} as const;

export interface ProofreadIssue {
  id: string;
  original: string;
  suggestion: string;
  category: string;
  severity: IssueSeverity;
  explanation: string;
  contextSnippet?: string;
  status: IssueStatus;
  chapterTitle?: string;
}

export interface UserPreferences {
  spellingStandard: SpellingStandard;
  literaryStrictness: LiteraryStrictness;
  preservePoeticLicense: boolean;
  preserveRegionalDialects: boolean;
  autoSave: boolean;
  darkMode: boolean;
}

export interface UserProfile extends UserPreferences {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Manuscript {
  id: string;
  ownerId: string;
  title: string;
  category: ManuscriptCategory;
  originalText: string;
  content: string;
  wordCount: number;
  charCount: number;
  errorsFound: number;
  errorsResolved: number;
  status: ManuscriptStatus;
  issues: ProofreadIssue[];
  sourceFileName?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ProofreadRevision {
  id: string;
  ownerId: string;
  manuscriptId: string;
  manuscriptTitle?: string;
  chapterTitle: string;
  originalText: string;
  correctedText: string;
  wordCount: number;
  issuesCount: number;
  acceptedCount: number;
  rejectedCount: number;
  note: string;
  createdAt: Date | null;
}

export interface ChapterSegment {
  id: string;
  index: number;
  title: string;
  startOffset: number;
  endOffset: number;
  text: string;
  wordCount: number;
}

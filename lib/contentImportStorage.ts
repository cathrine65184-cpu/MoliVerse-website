import type { ContentType, RightsStatus, Visibility } from './contentLibrary';

export type ImportedContentDraft = {
  id: string;
  version: number;
  ownerId: string;
  title: string;
  contentType: ContentType;
  language: string;
  locale: string;
  suggestedAgeRange: string;
  proficiencyLevel: string;
  themes: string[];
  learningObjectives: string[];
  source: string;
  author: string;
  edition: string;
  rightsStatus: RightsStatus;
  rightsNotes: string;
  visibility: Visibility;
  processingStatus: 'processing' | 'ready' | 'partial' | 'failed';
  processingMessage: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  text: string;
  pageTexts?: Array<{ page: number; text: string }>;
  pageCount?: number;
  fileBlob?: Blob;
  audioBlob?: Blob;
  updatedAt: string;
};

const DB_NAME = 'moliverse-content-library';
const STORE = 'drafts';

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('ownerId', 'ownerId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveImportedDraft(draft: ImportedContentDraft) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listImportedDrafts(ownerId: string) {
  const db = await openDb();
  const rows = await new Promise<ImportedContentDraft[]>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).index('ownerId').getAll(ownerId);
    request.onsuccess = () => resolve(request.result as ImportedContentDraft[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

import {
  DEFAULT_AGENCY_SETTINGS,
  DEFAULT_FORM_TEMPLATES,
  DEFAULT_PEOPLE_RECORDS,
} from '../data/defaultTemplates';
import {
  AgencySettings,
  DocumentBatchRecord,
  FormTemplate,
  PersonRecord,
} from '../types/document';

const DB_NAME = 'saraban_form_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv_store';

const KEYS = {
  TEMPLATES: 'templates',
  PEOPLE: 'people',
  DOCUMENTS: 'documents',
  SETTINGS: 'settings',
} as const;

function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readKV<T>(key: string, fallback: T): Promise<T> {
  const db = await openIDB();
  if (db) {
    try {
      const val = await new Promise<T | undefined>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => resolve(undefined);
      });
      if (val !== undefined) return val;
    } catch {
      // fall through to localStorage
    }
  }

  try {
    const raw = window.localStorage.getItem(`saraban_${key}`);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {
    // ignore parse errors
  }

  return fallback;
}

async function writeKV<T>(key: string, value: T): Promise<void> {
  try {
    window.localStorage.setItem(`saraban_${key}`, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }

  const db = await openIDB();
  if (db) {
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // ignore idb write errors
    }
  }
}

export interface AppDatabaseSnapshot {
  templates: FormTemplate[];
  people: PersonRecord[];
  documents: DocumentBatchRecord[];
  settings: AgencySettings;
  exportedAt: string;
}

export const storageService = {
  async getTemplates(): Promise<FormTemplate[]> {
    const stored = await readKV<FormTemplate[] | null>(KEYS.TEMPLATES, null);
    if (!stored || stored.length === 0) {
      await writeKV(KEYS.TEMPLATES, DEFAULT_FORM_TEMPLATES);
      return DEFAULT_FORM_TEMPLATES;
    }
    const existingIds = new Set(stored.map((t) => t.id));
    const missingDefaults = DEFAULT_FORM_TEMPLATES.filter(
      (def) => !existingIds.has(def.id)
    );
    if (missingDefaults.length > 0) {
      const merged = [...stored, ...missingDefaults];
      await writeKV(KEYS.TEMPLATES, merged);
      return merged;
    }
    return stored;
  },

  async saveTemplates(templates: FormTemplate[]): Promise<void> {
    await writeKV(KEYS.TEMPLATES, templates);
  },

  async getPeople(): Promise<PersonRecord[]> {
    const stored = await readKV<PersonRecord[] | null>(KEYS.PEOPLE, null);
    if (!stored) {
      await writeKV(KEYS.PEOPLE, DEFAULT_PEOPLE_RECORDS);
      return DEFAULT_PEOPLE_RECORDS;
    }
    return stored;
  },

  async savePeople(people: PersonRecord[]): Promise<void> {
    await writeKV(KEYS.PEOPLE, people);
  },

  async getDocuments(): Promise<DocumentBatchRecord[]> {
    return readKV<DocumentBatchRecord[]>(KEYS.DOCUMENTS, []);
  },

  async saveDocuments(documents: DocumentBatchRecord[]): Promise<void> {
    await writeKV(KEYS.DOCUMENTS, documents);
  },

  async getSettings(): Promise<AgencySettings> {
    const stored = await readKV<AgencySettings | null>(KEYS.SETTINGS, null);
    if (!stored) {
      await writeKV(KEYS.SETTINGS, DEFAULT_AGENCY_SETTINGS);
      return DEFAULT_AGENCY_SETTINGS;
    }
    return stored;
  },

  async saveSettings(settings: AgencySettings): Promise<void> {
    await writeKV(KEYS.SETTINGS, settings);
  },

  async exportSnapshot(): Promise<AppDatabaseSnapshot> {
    const [templates, people, documents, settings] = await Promise.all([
      this.getTemplates(),
      this.getPeople(),
      this.getDocuments(),
      this.getSettings(),
    ]);
    return {
      templates,
      people,
      documents,
      settings,
      exportedAt: new Date().toISOString(),
    };
  },

  async importSnapshot(snapshot: Partial<AppDatabaseSnapshot>): Promise<void> {
    if (Array.isArray(snapshot.templates)) {
      await this.saveTemplates(snapshot.templates);
    }
    if (Array.isArray(snapshot.people)) {
      await this.savePeople(snapshot.people);
    }
    if (Array.isArray(snapshot.documents)) {
      await this.saveDocuments(snapshot.documents);
    }
    if (snapshot.settings) {
      await this.saveSettings(snapshot.settings);
    }
  },
};

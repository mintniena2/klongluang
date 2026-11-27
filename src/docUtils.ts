import React, { useEffect, useState } from 'react';
import {
  AgencySettings,
  CommitteeMember,
  DEFAULT_AGENCY_SETTINGS,
  DEFAULT_FORM_TEMPLATES,
  DEFAULT_PEOPLE_RECORDS,
  DocumentBatchRecord,
  FormTemplate,
  PersonRecord,
  PrintMode,
} from './templates';

// ==========================================
// 1. Local Database (IndexedDB + localStorage)
// ==========================================
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

// ==========================================
// 2. Comma Parser & Template Variable Engine
// ==========================================
function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function findInRegistry(
  nameCandidate: string,
  codeCandidate: string,
  registry: PersonRecord[]
): PersonRecord | undefined {
  const normName = normalizeText(nameCandidate);
  const normCode = codeCandidate.trim();

  return registry.find((p) => {
    if (normCode && (p.studentCode.trim() === normCode || p.nationalId.trim() === normCode)) {
      return true;
    }
    const regName = normalizeText(p.fullName);
    return regName === normName || (normName.length >= 4 && regName.includes(normName));
  });
}

export function parseMultiPersonInput(
  rawText: string,
  registry: PersonRecord[],
  existingPeople: PersonRecord[] = []
): PersonRecord[] {
  const tokens = rawText
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (tokens.length === 0) return [];

  const existingByName = new Map(
    existingPeople.map((p) => [normalizeText(p.fullName), p])
  );
  const existingByCode = new Map(
    existingPeople
      .filter((p) => p.studentCode.trim())
      .map((p) => [p.studentCode.trim(), p])
  );

  return tokens.map((token, idx) => {
    if (token.includes('|')) {
      const parts = token.split('|').map((p) => p.trim());
      const code = parts[0] || '';
      const name = parts[1] || parts[0] || `รายชื่อที่ ${idx + 1}`;
      const matched = findInRegistry(name, code, registry);
      return {
        id: matched?.id || `batch-person-${idx}-${Date.now()}`,
        studentCode: code || matched?.studentCode || '',
        nationalId: matched?.nationalId || '',
        fullName: name,
        qualification: parts[2] || matched?.qualification || '',
        graduationYear: parts[3] || matched?.graduationYear || '',
        previousSchool: parts[4] || matched?.previousSchool || '',
        address: parts[5] || matched?.address || '',
        note: matched?.note || '',
        createdAt: matched?.createdAt || new Date().toISOString(),
      };
    }

    const matchedRegistry = findInRegistry(token, token, registry);
    if (matchedRegistry) {
      const prior = existingByName.get(normalizeText(matchedRegistry.fullName));
      return {
        ...matchedRegistry,
        note: prior?.note ?? matchedRegistry.note,
      };
    }

    const prior =
      existingByName.get(normalizeText(token)) || existingByCode.get(token);
    if (prior) {
      return prior;
    }

    const looksLikeNumericId = /^\d{3,13}$/.test(token);
    return {
      id: `inline-person-${idx}-${normalizeText(token).slice(0, 12)}`,
      studentCode: looksLikeNumericId && token.length < 13 ? token : '',
      nationalId: looksLikeNumericId && token.length === 13 ? token : '',
      fullName: looksLikeNumericId ? `ผู้เรียนรหัส ${token}` : token,
      qualification: '',
      graduationYear: '',
      previousSchool: '',
      address: '',
      note: '',
      createdAt: new Date().toISOString(),
    };
  });
}

export function resolveTemplateText(
  text: string,
  fieldValues: Record<string, string>,
  person?: PersonRecord,
  template?: FormTemplate
): string {
  if (!text) return '';

  const tokenMap: Record<string, string> = {
    ...fieldValues,
    ส่วนราชการ: fieldValues.department || fieldValues.agencyName || '',
    หน่วยงาน: fieldValues.agencyName || fieldValues.department || '',
    ที่: fieldValues.docNumber || '',
    วันที่: fieldValues.docDate || '',
    เรื่อง: fieldValues.subject || '',
    เรียน: fieldValues.recipient || '',
    ผู้ลงนาม: fieldValues.signerName || '',
    ตำแหน่งผู้ลงนาม: fieldValues.signerPosition || '',
    'ชื่อ-นามสกุล': person?.fullName || '............................................',
    ชื่อนามสกุล: person?.fullName || '............................................',
    รหัสประจำตัว: person?.studentCode || '-',
    เลขบัตรประชาชน: person?.nationalId || '-',
    วุฒิการศึกษา: person?.qualification || '-',
    ปีที่จบ: person?.graduationYear || '-',
    สถานศึกษาเดิม: person?.previousSchool || '-',
    ที่อยู่: person?.address || '-',
    หมายเหตุ: person?.note || '-',
  };

  if (template) {
    for (const f of template.fields) {
      if (!(f.key in tokenMap) && f.defaultValue) {
        tokenMap[f.key] = f.defaultValue;
      }
      if (f.label && !(f.label in tokenMap)) {
        tokenMap[f.label] = fieldValues[f.key] ?? f.defaultValue ?? '';
      }
    }
  }

  const replacePass = (input: string) =>
    input.replace(/\{\{([^}]+)\}\}/g, (_, rawKey: string) => {
      const key = rawKey.trim();
      return tokenMap[key] !== undefined ? tokenMap[key] : '';
    });

  return replacePass(replacePass(text));
}

export function formatThaiCitizenId(id: string): string {
  const digits = id.replace(/\D/g, '');
  if (digits.length !== 13) return id || '-';
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12, 13)}`;
}

// ==========================================
// 3. Garuda Emblem (GitHub URL / Upload / SVG)
// ==========================================
interface GarudaEmblemProps {
  sizeCm?: number;
  imageUrl?: string;
  className?: string;
}

export const GARUDA_SVG_PATHS = `
  <g fill="#111111" stroke="none">
    <path d="M100 10 L104 26 L108 28 L104 34 L108 42 L92 42 L96 34 L92 28 L96 26 Z" />
    <path d="M90 43 C94 38 106 38 110 43 L112 49 L88 49 Z" />
    <path d="M91 49 C88 53 89 60 94 63 C97 65 103 65 106 63 C111 60 112 53 109 49 Z" />
    <path d="M97 56 L106 58 L100 62 Z" fill="#ffffff" />
    <path d="M88 46 C83 45 81 51 85 55 L89 53 Z" />
    <path d="M112 46 C117 45 119 51 115 55 L111 53 Z" />
    <path d="M86 64 C84 74 86 88 92 98 L108 98 C114 88 116 74 114 64 C107 68 93 68 86 64 Z" />
    <path d="M92 67 L108 67 L105 82 L95 82 Z" fill="#ffffff" opacity="0.22" />
    <path d="M85 65 C68 50 42 48 16 60 C25 65 34 67 45 68 C31 70 21 75 15 80 C28 82 40 81 52 79 C39 83 28 89 22 95 C35 95 49 91 61 86 C51 92 42 98 37 104 C50 102 64 96 76 87 C80 82 84 75 85 65 Z" />
    <path d="M84 68 C70 57 49 55 27 63 C39 67 53 69 68 70 C54 73 41 76 30 80 C45 81 60 79 75 76 Z" fill="#ffffff" opacity="0.18" />
    <path d="M115 65 C132 50 158 48 184 60 C175 65 166 67 155 68 C169 70 179 75 185 80 C172 82 160 81 148 79 C161 83 172 89 178 95 C165 95 151 91 139 86 C149 92 158 98 163 104 C150 102 136 96 124 87 C120 82 116 75 115 65 Z" />
    <path d="M116 68 C130 57 151 55 173 63 C161 67 147 69 132 70 C146 73 159 76 170 80 C155 81 140 79 125 76 Z" fill="#ffffff" opacity="0.18" />
    <path d="M84 72 C74 78 65 90 61 102 C58 109 62 115 69 112 C75 109 80 100 84 92 Z" />
    <path d="M116 72 C126 78 135 90 139 102 C142 109 138 115 131 112 C125 109 120 100 116 92 Z" />
    <path d="M90 98 L110 98 L113 108 L87 108 Z" />
    <path d="M87 108 C76 116 70 128 66 144 C73 141 80 132 87 120 Z" />
    <path d="M113 108 C124 116 130 128 134 144 C127 141 120 132 113 120 Z" />
    <path d="M89 108 C83 124 76 138 72 150 C78 148 82 142 86 134 C88 142 87 150 85 156 C91 151 95 142 96 132 L98 110 Z" />
    <path d="M111 108 C117 124 124 138 128 150 C122 148 118 142 114 134 C112 142 113 150 115 156 C109 151 105 142 104 132 L102 110 Z" />
    <path d="M95 112 L105 112 L112 162 L105 154 L100 174 L95 154 L88 162 Z" />
    <path d="M91 142 L82 168 L92 158 Z" />
    <path d="M109 142 L118 168 L108 158 Z" />
  </g>
`;

export const GarudaEmblem: React.FC<GarudaEmblemProps> = ({
  sizeCm = 3,
  imageUrl,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const trimmedUrl = imageUrl?.trim();
  if (trimmedUrl && !imgError) {
    return React.createElement('img', {
      src: trimmedUrl,
      alt: 'ตราครุฑ',
      referrerPolicy: 'no-referrer',
      onError: () => setImgError(true),
      style: { height: `${sizeCm}cm`, width: 'auto', objectFit: 'contain' },
      className: `select-none ${className}`,
    });
  }

  return React.createElement('svg', {
    viewBox: '0 0 200 185',
    style: { height: `${sizeCm}cm`, width: 'auto' },
    className: `select-none ${className}`,
    'aria-label': 'ตราครุฑ',
    dangerouslySetInnerHTML: { __html: GARUDA_SVG_PATHS },
  });
};

async function imageUrlToPngDataUrl(
  imageUrl: string,
  pixelSize = 240
): Promise<string> {
  if (typeof document === 'undefined') return '';
  if (imageUrl.startsWith('data:image/')) return imageUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ratio = img.naturalHeight / Math.max(1, img.naturalWidth);
        canvas.width = pixelSize;
        canvas.height = Math.round(pixelSize * ratio);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch {
        // Fallback to raw external URL if canvas tainted by CORS
      }
      resolve(imageUrl);
    };
    img.onerror = () => resolve('');
    img.src = imageUrl;
  });
}

export async function garudaSvgToPngDataUrl(
  pixelSize = 240,
  customImageUrl?: string
): Promise<string> {
  if (typeof document === 'undefined') return '';

  const trimmed = customImageUrl?.trim();
  if (trimmed) {
    const converted = await imageUrlToPngDataUrl(trimmed, pixelSize);
    if (converted) return converted;
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 185" width="${pixelSize}" height="${Math.round(
    (pixelSize * 185) / 200
  )}">${GARUDA_SVG_PATHS}</svg>`;

  return new Promise((resolve) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelSize;
      canvas.height = Math.round((pixelSize * 185) / 200);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(pngUrl);
      } else {
        URL.revokeObjectURL(url);
        resolve('');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

// ==========================================
// 4. Word (.doc) Exporter & CSV Helpers
// ==========================================
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

function buildMemoHtml(
  template: FormTemplate,
  fieldValues: Record<string, string>,
  person: PersonRecord | undefined,
  garudaPng: string,
  includeCopyStamp: boolean,
  committeeMembers?: CommitteeMember[]
): string {
  const department = resolveTemplateText(fieldValues.department || '', fieldValues, person, template);
  const docNumber = resolveTemplateText(fieldValues.docNumber || '', fieldValues, person, template);
  const docDate = resolveTemplateText(fieldValues.docDate || '', fieldValues, person, template);
  const subject = resolveTemplateText(fieldValues.subject || '', fieldValues, person, template);
  const recipient = resolveTemplateText(fieldValues.recipient || '', fieldValues, person, template);
  const signerName = resolveTemplateText(fieldValues.signerName || '', fieldValues, person, template);
  const signerPosition = resolveTemplateText(fieldValues.signerPosition || '', fieldValues, person, template);

  const paragraphs = template.bodyParagraphs
    .map((p) => resolveTemplateText(p, fieldValues, person, template))
    .filter((p) => p.trim().length > 0);

  const personInfoBox =
    template.includePersonDetailBox && person
      ? `
      <table style="width:100%; border-collapse:collapse; margin: 10pt 0 12pt 0; font-size:15pt;">
        <tr>
          <td style="border:1pt solid #333; padding:5pt 8pt; width:28%; font-weight:bold; background:#f8fafc;">ชื่อ - นามสกุล</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; width:36%;">${escapeHtml(person.fullName || '-')}</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; width:18%; font-weight:bold; background:#f8fafc;">รหัสประจำตัว</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; width:18%;">${escapeHtml(person.studentCode || '-')}</td>
        </tr>
        <tr>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">เลขประจำตัวประชาชน</td>
          <td style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(formatThaiCitizenId(person.nationalId))}</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">ปีที่จบ</td>
          <td style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(person.graduationYear || '-')}</td>
        </tr>
        <tr>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">วุฒิการศึกษา</td>
          <td style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(person.qualification || '-')}</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">สถานศึกษาเดิม</td>
          <td style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(person.previousSchool || '-')}</td>
        </tr>
        <tr>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">ที่อยู่</td>
          <td colspan="3" style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(person.address || '-')}</td>
        </tr>
      </table>`
      : '';

  return `
  <div style="font-family:'TH Sarabun New','Sarabun',sans-serif; font-size:16pt; line-height:1.35; color:#111;">
    ${includeCopyStamp ? '<div style="text-align:center; color:#cc0000; font-size:22pt; font-weight:bold; margin-bottom:4pt;">สำเนา</div>' : ''}
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="width:20%; vertical-align:bottom;">
          ${garudaPng ? `<img src="${garudaPng}" width="54" height="50" />` : ''}
        </td>
        <td style="width:80%; text-align:center; vertical-align:bottom; font-size:29pt; font-weight:bold; padding-right:15%;">
          บันทึกข้อความ
        </td>
      </tr>
    </table>
    <p style="margin:8pt 0 2pt 0;"><b>ส่วนราชการ</b>&nbsp;&nbsp;${escapeHtml(department)}</p>
    <table style="width:100%; border-collapse:collapse; margin-bottom:2pt;">
      <tr>
        <td style="width:52%; padding:0;"><b>ที่</b>&nbsp;&nbsp;${escapeHtml(docNumber)}</td>
        <td style="width:48%; padding:0;"><b>วันที่</b>&nbsp;&nbsp;${escapeHtml(docDate)}</td>
      </tr>
    </table>
    <p style="margin:2pt 0 6pt 0; border-bottom:1pt solid #111; padding-bottom:4pt;"><b>เรื่อง</b>&nbsp;&nbsp;${escapeHtml(subject)}</p>
    <p style="margin:8pt 0 6pt 0;"><b>เรียน</b>&nbsp;&nbsp;${escapeHtml(recipient)}</p>
    ${paragraphs
      .map((p) => {
        const lines = p.split('\n');
        if (lines.length > 1 && /^\d+\./.test(lines[1].trim())) {
          return `<p style="margin:0 0 2pt 0; text-indent:2.5cm;">${escapeHtml(lines[0])}</p>${lines
            .slice(1)
            .map(
              (sub) =>
                `<p style="margin:0 0 2pt 0; padding-left:2.5cm;">${escapeHtml(sub)}</p>`
            )
            .join('')}`;
        }
        return `<p style="margin:0 0 8pt 0; text-indent:2.5cm; text-align:justify;">${escapeHtml(p)}</p>`;
      })
      .join('')}
    ${personInfoBox}
    <table style="width:100%; border-collapse:collapse; margin-top:22pt;">
      <tr>
        <td style="width:45%;"></td>
        <td style="width:55%; text-align:center;">
          ${
            template.omitMainSignatureLine
              ? '<p style="margin:0 0 18pt 0;">&nbsp;</p>'
              : '<p style="margin:0;">(ลงชื่อ).......................................................</p>'
          }
          <p style="margin:4pt 0 0 0;">(${escapeHtml(signerName || '.............................................')})</p>
          <p style="margin:2pt 0 0 0;">${escapeHtml(signerPosition)}</p>
        </td>
      </tr>
    </table>
    ${
      committeeMembers && committeeMembers.length > 0
        ? `<div style="margin-top:16pt; font-size:15pt; line-height:1.3;">
            ${committeeMembers
              .map(
                (m) => `
              <div style="margin-bottom:12pt;">
                <p style="margin:0;">ลงชื่อ......................................................${escapeHtml(m.role)}</p>
                <p style="margin:2pt 0 0 28pt;">(${escapeHtml(m.name || '............................................')})</p>
                <p style="margin:2pt 0 0 42pt;">${escapeHtml(m.position)}</p>
              </div>`
              )
              .join('')}
          </div>`
        : ''
    }
  </div>`;
}

function buildExternalLetterHtml(
  template: FormTemplate,
  fieldValues: Record<string, string>,
  person: PersonRecord | undefined,
  garudaPng: string,
  includeCopyStamp: boolean
): string {
  const docNumber = resolveTemplateText(fieldValues.docNumber || '', fieldValues, person, template);
  const agencyName = resolveTemplateText(fieldValues.agencyName || '', fieldValues, person, template);
  const agencyAddress = resolveTemplateText(fieldValues.agencyAddress || '', fieldValues, person, template);
  const docDate = resolveTemplateText(fieldValues.docDate || '', fieldValues, person, template);
  const subject = resolveTemplateText(fieldValues.subject || '', fieldValues, person, template);
  const recipient = resolveTemplateText(fieldValues.recipient || '', fieldValues, person, template);
  const attachments = resolveTemplateText(fieldValues.attachments || '', fieldValues, person, template);
  const signerName = resolveTemplateText(fieldValues.signerName || '', fieldValues, person, template);
  const signerPosition = resolveTemplateText(fieldValues.signerPosition || '', fieldValues, person, template);
  const footerUnit = resolveTemplateText(fieldValues.footerUnit || '', fieldValues, person, template);
  const footerPhone = resolveTemplateText(fieldValues.footerPhone || '', fieldValues, person, template);
  const footerEmail = resolveTemplateText(fieldValues.footerEmail || '', fieldValues, person, template);

  const paragraphs = template.bodyParagraphs
    .map((p) => resolveTemplateText(p, fieldValues, person, template))
    .filter((p) => p.trim().length > 0);

  return `
  <div style="font-family:'TH Sarabun New','Sarabun',sans-serif; font-size:16pt; line-height:1.35; color:#111;">
    ${includeCopyStamp ? '<div style="text-align:center; color:#cc0000; font-size:24pt; font-weight:bold; margin-bottom:2pt;">สำเนา</div>' : ''}
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="width:36%; vertical-align:bottom; padding-bottom:4pt;">
          ที่ ${escapeHtml(docNumber)}
        </td>
        <td style="width:28%; text-align:center; vertical-align:top;">
          ${garudaPng ? `<img src="${garudaPng}" width="108" height="100" />` : ''}
        </td>
        <td style="width:36%; vertical-align:bottom; padding-bottom:4pt; padding-left:8pt;">
          ${escapeHtml(agencyName)}<br/>${escapeHtml(agencyAddress)}
        </td>
      </tr>
    </table>
    <p style="text-align:center; margin:10pt 0 10pt 0;">${escapeHtml(docDate)}</p>
    <p style="margin:4pt 0;">เรื่อง&nbsp;&nbsp;${escapeHtml(subject)}</p>
    <p style="margin:4pt 0;">เรียน&nbsp;&nbsp;${escapeHtml(recipient)}</p>
    ${
      attachments
        ? `<table style="width:100%; border-collapse:collapse; margin:4pt 0 8pt 0;">
            <tr>
              <td style="width:19%; vertical-align:top;">สิ่งที่ส่งมาด้วย</td>
              <td style="width:81%; vertical-align:top;">${escapeHtml(attachments)}</td>
            </tr>
          </table>`
        : ''
    }
    ${paragraphs
      .map(
        (p) =>
          `<p style="margin:0 0 8pt 0; text-indent:2.5cm; text-align:justify;">${escapeHtml(p)}</p>`
      )
      .join('')}
    <table style="width:100%; border-collapse:collapse; margin-top:18pt;">
      <tr>
        <td style="width:40%;"></td>
        <td style="width:60%; text-align:center;">
          <p style="margin:0 0 28pt 0;">${escapeHtml(template.signOffPhrase || 'ขอแสดงความนับถือ')}</p>
          <p style="margin:0;">(${escapeHtml(signerName || '.............................................')})</p>
          <p style="margin:2pt 0 0 0;">${escapeHtml(signerPosition)}</p>
        </td>
      </tr>
    </table>
    <div style="margin-top:34pt; font-size:15pt; line-height:1.3;">
      ${footerUnit ? `<div>${escapeHtml(footerUnit)}</div>` : ''}
      ${footerPhone ? `<div>โทร. ${escapeHtml(footerPhone)}</div>` : ''}
      ${footerEmail ? `<div>ไปรษณีย์อิเล็กทรอนิกส์ : ${escapeHtml(footerEmail)}</div>` : ''}
    </div>
  </div>`;
}

function buildAttachmentTableHtml(
  template: FormTemplate,
  fieldValues: Record<string, string>,
  people: PersonRecord[]
): string {
  const agencyName = resolveTemplateText(
    fieldValues.agencyName || fieldValues.department || '',
    fieldValues,
    people[0],
    template
  );
  const title = template.attachmentTitle || 'บัญชีรายชื่อนักศึกษาที่ขอตรวจสอบหนังสือสำคัญแสดงวุฒิการศึกษา';

  const rows = (people.length > 0
    ? people
    : [
        {
          id: 'empty',
          studentCode: '',
          nationalId: '',
          fullName: '',
          qualification: '',
          graduationYear: '',
          previousSchool: '',
          address: '',
          note: '',
          createdAt: '',
        },
      ]
  )
    .map(
      (p, idx) => `
      <tr>
        <td style="border:1pt solid #111; padding:4pt 6pt; text-align:center;">${idx + 1}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt; text-align:center;">${escapeHtml(p.studentCode || '-')}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt;">${escapeHtml(p.fullName || '')}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt; text-align:center;">${escapeHtml(p.qualification || '-')}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt; text-align:center;">${escapeHtml(p.graduationYear || '-')}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt;">${escapeHtml(p.note || '')}</td>
      </tr>`
    )
    .join('');

  return `
  <div style="font-family:'TH Sarabun New','Sarabun',sans-serif; font-size:16pt; line-height:1.35; color:#111;">
    <div style="text-align:center; margin-bottom:10pt;">
      <div style="font-size:18pt; font-weight:bold;">${escapeHtml(agencyName)}</div>
      <div style="font-size:17pt; font-weight:bold;">${escapeHtml(title)}</div>
    </div>
    <table style="width:100%; border-collapse:collapse; margin-bottom:14pt; font-size:15pt;">
      <thead>
        <tr>
          <th style="border:1pt solid #111; padding:5pt; width:7%; text-align:center;">ที่</th>
          <th style="border:1pt solid #111; padding:5pt; width:15%; text-align:center;">รหัสประจำตัว</th>
          <th style="border:1pt solid #111; padding:5pt; width:33%; text-align:center;">ชื่อ - นามสกุล</th>
          <th style="border:1pt solid #111; padding:5pt; width:17%; text-align:center;">วุฒิการศึกษา</th>
          <th style="border:1pt solid #111; padding:5pt; width:11%; text-align:center;">ปีที่จบ</th>
          <th style="border:1pt solid #111; padding:5pt; width:17%; text-align:center;">หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p style="margin:6pt 0 4pt 16pt;">☐&nbsp;&nbsp;&nbsp;สำเร็จการศึกษาจริง และเป็นวุฒิการศึกษาที่ถูกต้องทุกรายการ จำนวน .............. ราย</p>
    <p style="margin:4pt 0 14pt 16pt;">☐&nbsp;&nbsp;&nbsp;เป็นเอกสารที่ไม่ถูกต้อง จำนวน .............. ราย (โปรดระบุรายละเอียดในช่องหมายเหตุ)</p>
    <p style="margin:10pt 0 24pt 0;">ตรวจสอบ และตรวจทานถูกต้องแล้ว</p>
    <table style="width:100%; border-collapse:collapse; margin-top:16pt;">
      <tr>
        <td style="width:30%;"></td>
        <td style="width:70%; text-align:left; padding-left:20pt;">
          <p style="margin:0;">(ลงชื่อ) .................................................. นายทะเบียน</p>
          <p style="margin:4pt 0 20pt 28pt;">(...............................................)</p>
          <p style="margin:0;">(ลงชื่อ) .................................................. หัวหน้าสถานศึกษา</p>
          <p style="margin:4pt 0 0 28pt;">(...............................................)</p>
        </td>
      </tr>
    </table>
    <p style="text-align:center; margin-top:30pt;">โปรดประทับตราสถานศึกษาด้วยจึงสมบูรณ์</p>
  </div>`;
}

export async function exportDocumentToDoc(params: {
  template: FormTemplate;
  fieldValues: Record<string, string>;
  people: PersonRecord[];
  committeeMembers?: CommitteeMember[];
  garudaImageUrl?: string;
  printMode: PrintMode;
  includeCopyStamp: boolean;
  includeAttachment: boolean;
}): Promise<void> {
  const {
    template,
    fieldValues,
    people,
    committeeMembers,
    garudaImageUrl,
    printMode,
    includeCopyStamp,
    includeAttachment,
  } = params;
  const resolvedCommittee = committeeMembers ?? template.committeeMembers;
  const garudaPng = await garudaSvgToPngDataUrl(220, garudaImageUrl);

  const pageSections: string[] = [];

  if (printMode === 'individual' && people.length > 0 && !template.isSinglePersonForm) {
    people.forEach((person) => {
      if (template.category === 'memo') {
        pageSections.push(
          buildMemoHtml(
            template,
            fieldValues,
            person,
            garudaPng,
            includeCopyStamp,
            resolvedCommittee
          )
        );
      } else {
        pageSections.push(buildExternalLetterHtml(template, fieldValues, person, garudaPng, includeCopyStamp));
        if (includeAttachment) {
          pageSections.push(buildAttachmentTableHtml(template, fieldValues, [person]));
        }
      }
    });
  } else {
    const firstPerson = people[0];
    if (template.category === 'memo') {
      pageSections.push(
        buildMemoHtml(
          template,
          fieldValues,
          firstPerson,
          garudaPng,
          includeCopyStamp,
          resolvedCommittee
        )
      );
      if (includeAttachment && people.length > 0) {
        pageSections.push(buildAttachmentTableHtml(template, fieldValues, people));
      }
    } else {
      pageSections.push(buildExternalLetterHtml(template, fieldValues, firstPerson, garudaPng, includeCopyStamp));
      if (includeAttachment) {
        pageSections.push(buildAttachmentTableHtml(template, fieldValues, people));
      }
    }
  }

  const joinedPages = pageSections
    .map((html, idx) =>
      idx === 0
        ? html
        : `<br clear="all" style="page-break-before:always" />${html}`
    )
    .join('\n');

  const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(template.shortName)}</title>
<style>
  @page Section1 {
    size: 21cm 29.7cm;
    margin: 1.8cm 2cm 2cm 3cm;
    mso-header-margin: 1cm;
    mso-footer-margin: 1cm;
    mso-paper-source: 0;
  }
  div.Section1 { page: Section1; }
  body { font-family: 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; }
</style>
</head>
<body>
  <div class="Section1">
    ${joinedPages}
  </div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', docHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (template.shortName || 'document').replace(/[^\w\u0E00-\u0E7F-]+/g, '_');
  link.href = url;
  link.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSampleCsv(): void {
  const headers = [
    'รหัสประจำตัว',
    'เลขบัตรประชาชน',
    'ชื่อ-นามสกุล',
    'วุฒิการศึกษา',
    'ปีที่จบ',
    'สถานศึกษาเดิม',
    'ที่อยู่',
    'หมายเหตุ',
  ];
  const sampleRows = [
    [
      '9318',
      '1139900482105',
      'เด็กหญิง ณัฐมน ขันธสิทธิ์',
      'ประถมศึกษา',
      '2567',
      'โรงเรียนวันครู 2502',
      '112/8 หมู่ 4 ตำบลคลองสอง อำเภอคลองหลวง จังหวัดปทุมธานี 12120',
      '',
    ],
    [
      '9319',
      '1103702849123',
      'นาย ธนากร ใจดี',
      'มัธยมศึกษาตอนต้น',
      '2566',
      'โรงเรียนคลองหลวงวิทยาคม',
      '89/12 หมู่ 7 ตำบลคลองสาม อำเภอคลองหลวง จังหวัดปทุมธานี 12120',
      '',
    ],
  ];

  const csvContent =
    '\ufeff' +
    [headers, ...sampleRows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_students_import.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseSpreadsheetText(raw: string): Omit<PersonRecord, 'id' | 'createdAt'>[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const detectDelimiter = (line: string) => {
    if (line.includes('\t')) return '\t';
    return ',';
  };

  const splitCsvLine = (line: string, delimiter: string): string[] => {
    if (delimiter === '\t') {
      return line.split('\t').map((c) => c.trim());
    }
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((l) => splitCsvLine(l, delimiter));

  const firstJoined = rows[0].join(' ');
  const hasHeader =
    firstJoined.includes('ชื่อ') ||
    firstJoined.includes('รหัส') ||
    firstJoined.includes('เลขบัตร');

  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .filter((cols) => cols.some((c) => c.length > 0))
    .map((cols) => {
      if (cols.length >= 6) {
        return {
          studentCode: cols[0] || '',
          nationalId: cols[1] || '',
          fullName: cols[2] || '',
          qualification: cols[3] || '',
          graduationYear: cols[4] || '',
          previousSchool: cols[5] || '',
          address: cols[6] || '',
          note: cols[7] || '',
        };
      }
      if (cols.length >= 3) {
        const col1IsCitizen = /^\d{13}$/.test(cols[1].replace(/\D/g, ''));
        return {
          studentCode: cols[0] || '',
          nationalId: col1IsCitizen ? cols[1] : '',
          fullName: col1IsCitizen ? cols[2] || '' : cols[1] || '',
          qualification: col1IsCitizen ? cols[3] || '' : cols[2] || '',
          graduationYear: col1IsCitizen ? cols[4] || '' : cols[3] || '',
          previousSchool: '',
          address: cols[4] || '',
          note: '',
        };
      }
      return {
        studentCode: cols.length === 2 ? cols[0] : '',
        nationalId: '',
        fullName: cols.length === 2 ? cols[1] : cols[0],
        qualification: '',
        graduationYear: '',
        previousSchool: '',
        address: '',
        note: '',
      };
    })
    .filter((item) => item.fullName.trim().length > 0);
}

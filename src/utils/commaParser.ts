import { FormTemplate, PersonRecord } from '../types/document';

/**
 * Parses a comma-separated (or newline-separated) string of names/codes into PersonRecord items,
 * automatically enriching from the local Student/People Registry if a match is found.
 * Supports:
 * - "เด็กหญิง ณัฐมน ขันธสิทธิ์, นาย ธนากร ใจดี"
 * - "9318, 9319" (matches studentCode)
 * - "9318 | เด็กหญิง ณัฐมน ขันธสิทธิ์ | ประถมศึกษา | 2567" (pipe-separated inline overrides)
 */
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

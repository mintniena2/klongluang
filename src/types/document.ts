export type FormCategory = 'memo' | 'external';

export type PrintMode = 'individual' | 'combined';

export type FieldType = 'text' | 'textarea' | 'date';

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  defaultValue?: string;
  section: 'header' | 'body' | 'footer';
  required?: boolean;
}

export interface CommitteeMember {
  role: string;
  name: string;
  position: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  shortName: string;
  category: FormCategory;
  description: string;
  isSystem: boolean;
  isSinglePersonForm?: boolean;
  omitMainSignatureLine?: boolean;
  includeCopyStampDefault: boolean;
  includePersonDetailBox: boolean;
  includeAttachmentList: boolean;
  attachmentTitle: string;
  fields: TemplateField[];
  bodyParagraphs: string[];
  signOffPhrase: string;
  committeeMembers?: CommitteeMember[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonRecord {
  id: string;
  studentCode: string;
  nationalId: string;
  fullName: string;
  qualification: string;
  graduationYear: string;
  previousSchool: string;
  address: string;
  note: string;
  createdAt: string;
}

export interface DocumentBatchRecord {
  id: string;
  templateId: string;
  templateName: string;
  category: FormCategory;
  title: string;
  docNumber: string;
  docDate: string;
  printMode: PrintMode;
  includeCopyStamp: boolean;
  includeAttachment: boolean;
  fieldValues: Record<string, string>;
  people: PersonRecord[];
  committeeMembers?: CommitteeMember[];
  createdAt: string;
  updatedAt: string;
}

export interface AgencySettings {
  agencyName: string;
  agencyAddress: string;
  departmentName: string;
  docPrefix: string;
  phone: string;
  email: string;
  directorName: string;
  directorTitle: string;
  officerName: string;
  officerTitle: string;
  garudaImageUrl?: string;
}

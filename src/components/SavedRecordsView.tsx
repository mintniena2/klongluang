import React, { useState } from 'react';
import {
  FileDown,
  FolderOpen,
  History,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import {
  CommitteeMember,
  DocumentBatchRecord,
  FormTemplate,
  PrintMode,
} from '../types/document';
import { exportDocumentToDoc } from '../utils/docExporter';

interface SavedRecordsViewProps {
  documents: DocumentBatchRecord[];
  templates: FormTemplate[];
  garudaImageUrl?: string;
  onOpenDocument: (doc: DocumentBatchRecord) => void;
  onDeleteDocument: (id: string) => Promise<void>;
  onPrintDocument: (config: {
    template: FormTemplate;
    fieldValues: Record<string, string>;
    people: DocumentBatchRecord['people'];
    committeeMembers?: CommitteeMember[];
    garudaImageUrl?: string;
    printMode: PrintMode;
    includeCopyStamp: boolean;
    includeAttachment: boolean;
  }) => void;
}

export const SavedRecordsView: React.FC<SavedRecordsViewProps> = ({
  documents,
  templates,
  garudaImageUrl,
  onOpenDocument,
  onDeleteDocument,
  onPrintDocument,
}) => {
  const [search, setSearch] = useState('');

  const filtered = documents.filter((doc) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.templateName.toLowerCase().includes(q) ||
      doc.docNumber.toLowerCase().includes(q) ||
      doc.people.some((p) => p.fullName.toLowerCase().includes(q))
    );
  });

  const handleQuickDocExport = async (doc: DocumentBatchRecord) => {
    const tpl =
      templates.find((t) => t.id === doc.templateId) || templates[0];
    if (!tpl) return;
    await exportDocumentToDoc({
      template: tpl,
      fieldValues: doc.fieldValues,
      people: doc.people,
      committeeMembers: doc.committeeMembers,
      garudaImageUrl,
      printMode: doc.printMode,
      includeCopyStamp: doc.includeCopyStamp,
      includeAttachment: doc.includeAttachment,
    });
  };

  const handleQuickPrint = (doc: DocumentBatchRecord) => {
    const tpl =
      templates.find((t) => t.id === doc.templateId) || templates[0];
    if (!tpl) return;
    onPrintDocument({
      template: tpl,
      fieldValues: doc.fieldValues,
      people: doc.people,
      committeeMembers: doc.committeeMembers,
      garudaImageUrl,
      printMode: doc.printMode,
      includeCopyStamp: doc.includeCopyStamp,
      includeAttachment: doc.includeAttachment,
    });
    setTimeout(() => window.print(), 80);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          ฐานข้อมูลเอกสารและบันทึกที่จัดเก็บไว้
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          เรียกดู แก้ไข พิมพ์ซ้ำเป็น PDF หรือดาวน์โหลดเป็นไฟล์ .DOC จากประวัติที่เคยบันทึกไว้ได้ทุกเมื่อ
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อเรื่อง, เลขที่หนังสือ, หรือชื่อนักศึกษา..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
          />
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          ทั้งหมด {documents.length} รายการ
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">
              ยังไม่มีเอกสารที่บันทึกไว้ในฐานข้อมูล
            </p>
            <p className="text-xs text-slate-500 mt-1">
              สร้างเอกสารในหน้า &ldquo;สร้างเอกสาร&rdquo; แล้วกดปุ่ม &ldquo;บันทึกฐานข้อมูล&rdquo; เพื่อเก็บประวัติไว้ที่นี่
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70"
              >
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 mb-1 tabular-nums">
                    {doc.category === 'memo' ? 'บันทึกข้อความ' : 'หนังสือภายนอก'}
                    {' · '}
                    ที่ {doc.docNumber || '-'}
                    {' · '}
                    {doc.docDate}
                    {' · '}
                    {doc.people.length} รายชื่อ (
                    {doc.printMode === 'individual' ? 'พิมพ์แยกฉบับ' : 'รวมบัญชีเดียว'})
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    รายชื่อ: {doc.people.map((p) => p.fullName).join(', ') || '-'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenDocument(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>เปิดแก้ไข</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPrint(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDocExport(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>.DOC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDocument(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Database,
  FileDown,
  FileSpreadsheet,
  FileText,
  History,
  LayoutGrid,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  exportDocumentToDoc,
  parseMultiPersonInput,
  storageService,
} from './docUtils';
import {
  AdminTemplatesView,
  PeopleRegistryView,
  SavedRecordsView,
  SettingsView,
} from './ManageViews';
import {
  OfficialDocumentSheetStack,
  SheetRenderConfig,
} from './OfficialSheet';
import {
  AgencySettings,
  CommitteeMember,
  DEFAULT_AGENCY_SETTINGS,
  DocumentBatchRecord,
  FormTemplate,
  PersonRecord,
  PrintMode,
} from './templates';

// ==========================================
// 1. Document Workspace (Editor + Live A4)
// ==========================================
interface DocumentWorkspaceProps {
  templates: FormTemplate[];
  peopleRegistry: PersonRecord[];
  agencySettings: AgencySettings;
  activeTemplateId: string;
  onSelectTemplateId: (id: string) => void;
  editingBatch: DocumentBatchRecord | null;
  preselectedPeople: PersonRecord[] | null;
  onClearPreselectedPeople: () => void;
  onSaveDocumentBatch: (record: DocumentBatchRecord) => Promise<void>;
  onPrintSheets: (config: SheetRenderConfig) => void;
}

const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({
  templates,
  peopleRegistry,
  agencySettings,
  activeTemplateId,
  onSelectTemplateId,
  editingBatch,
  preselectedPeople,
  onClearPreselectedPeople,
  onSaveDocumentBatch,
  onPrintSheets,
}) => {
  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0],
    [templates, activeTemplateId]
  );

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [rawNamesInput, setRawNamesInput] = useState<string>(
    'เด็กหญิง ณัฐมน ขันธสิทธิ์, นาย ธนากร ใจดี'
  );
  const [peopleList, setPeopleList] = useState<PersonRecord[]>([]);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [printMode, setPrintMode] = useState<PrintMode>('individual');
  const [includeCopyStamp, setIncludeCopyStamp] = useState<boolean>(false);
  const [includeAttachment, setIncludeAttachment] = useState<boolean>(false);
  const [previewZoom, setPreviewZoom] = useState<number>(0.72);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [showRegistryPicker, setShowRegistryPicker] = useState<boolean>(false);
  const [registrySearch, setRegistrySearch] = useState<string>('');
  const [selectedRegistryIds, setSelectedRegistryIds] = useState<Set<string>>(new Set());
  const [expandedPersonIdx, setExpandedPersonIdx] = useState<number | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string>('');
  const [isExportingDoc, setIsExportingDoc] = useState<boolean>(false);

  useEffect(() => {
    if (!activeTemplate) return;

    if (editingBatch && editingBatch.templateId === activeTemplate.id) {
      setFieldValues({ ...editingBatch.fieldValues });
      setPeopleList(editingBatch.people);
      setRawNamesInput(editingBatch.people.map((p) => p.fullName).join(', '));
      setCommitteeMembers(
        editingBatch.committeeMembers ?? activeTemplate.committeeMembers ?? []
      );
      setPrintMode(editingBatch.printMode);
      setIncludeCopyStamp(editingBatch.includeCopyStamp);
      setIncludeAttachment(editingBatch.includeAttachment);
      return;
    }

    const defaults: Record<string, string> = {};
    for (const f of activeTemplate.fields) {
      defaults[f.key] = f.defaultValue || '';
    }
    setFieldValues(defaults);
    setCommitteeMembers(
      activeTemplate.committeeMembers
        ? activeTemplate.committeeMembers.map((m) => ({ ...m }))
        : []
    );
    setIncludeCopyStamp(activeTemplate.includeCopyStampDefault);
    setIncludeAttachment(activeTemplate.includeAttachmentList);
  }, [activeTemplate, editingBatch]);

  useEffect(() => {
    if (preselectedPeople && preselectedPeople.length > 0) {
      setPeopleList(preselectedPeople);
      setRawNamesInput(preselectedPeople.map((p) => p.fullName).join(', '));
      onClearPreselectedPeople();
    }
  }, [preselectedPeople, onClearPreselectedPeople]);

  useEffect(() => {
    if (editingBatch && rawNamesInput === editingBatch.people.map((p) => p.fullName).join(', ')) {
      return;
    }
    setPeopleList((prev) => parseMultiPersonInput(rawNamesInput, peopleRegistry, prev));
  }, [rawNamesInput, peopleRegistry, editingBatch]);

  useEffect(() => {
    const updateZoom = () => {
      if (window.innerWidth < 640) {
        setPreviewZoom(0.42);
      } else if (window.innerWidth < 1280) {
        setPreviewZoom(0.58);
      } else {
        setPreviewZoom(0.72);
      }
    };
    updateZoom();
    window.addEventListener('resize', updateZoom);
    return () => window.removeEventListener('resize', updateZoom);
  }, []);

  const totalPages = useMemo(() => {
    if (activeTemplate?.isSinglePersonForm) {
      return includeAttachment ? 2 : 1;
    }
    const count = Math.max(1, peopleList.length);
    if (printMode === 'individual' && peopleList.length > 0) {
      return includeAttachment ? count * 2 : count;
    }
    return includeAttachment ? 2 : 1;
  }, [activeTemplate?.isSinglePersonForm, peopleList.length, printMode, includeAttachment]);

  if (!activeTemplate) {
    return (
      <div className="p-8 text-center text-slate-500">
        ยังไม่มีแบบฟอร์มในระบบ กรุณาเพิ่มแบบฟอร์มในหน้าจัดการแบบฟอร์ม
      </div>
    );
  }

  const applyAgencyDefaults = () => {
    setFieldValues((prev) => ({
      ...prev,
      agencyName: agencySettings.agencyName,
      agencyAddress: agencySettings.agencyAddress,
      department: `${agencySettings.agencyName} ${agencySettings.departmentName}`,
      docNumber: agencySettings.docPrefix,
      footerUnit: agencySettings.departmentName,
      footerPhone: agencySettings.phone,
      footerEmail: agencySettings.email,
      signerName:
        activeTemplate.category === 'external'
          ? agencySettings.directorName
          : agencySettings.officerName,
      signerPosition:
        activeTemplate.category === 'external'
          ? agencySettings.directorTitle
          : agencySettings.officerTitle,
    }));
  };

  const handlePersonFieldChange = (
    idx: number,
    key: keyof PersonRecord,
    value: string
  ) => {
    setPeopleList((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
    );
  };

  const handleConfirmRegistryPicker = () => {
    const picked = peopleRegistry.filter((p) => selectedRegistryIds.has(p.id));
    if (picked.length > 0) {
      setPeopleList(picked);
      setRawNamesInput(picked.map((p) => p.fullName).join(', '));
    }
    setShowRegistryPicker(false);
    setSelectedRegistryIds(new Set());
  };

  const handlePrint = () => {
    onPrintSheets({
      template: activeTemplate,
      fieldValues,
      people: peopleList,
      committeeMembers,
      garudaImageUrl: agencySettings.garudaImageUrl,
      printMode,
      includeCopyStamp,
      includeAttachment,
    });
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleExportDoc = async () => {
    setIsExportingDoc(true);
    try {
      await exportDocumentToDoc({
        template: activeTemplate,
        fieldValues,
        people: peopleList,
        committeeMembers,
        garudaImageUrl: agencySettings.garudaImageUrl,
        printMode,
        includeCopyStamp,
        includeAttachment,
      });
    } finally {
      setIsExportingDoc(false);
    }
  };

  const handleSaveToDb = async () => {
    const now = new Date().toISOString();
    const effectivePeople = activeTemplate.isSinglePersonForm ? [] : peopleList;
    const record: DocumentBatchRecord = {
      id: editingBatch?.id || `doc-${Date.now()}`,
      templateId: activeTemplate.id,
      templateName: activeTemplate.shortName,
      category: activeTemplate.category,
      title:
        fieldValues.subject ||
        `${activeTemplate.shortName} (${effectivePeople.length} รายการ)`,
      docNumber: fieldValues.docNumber || '-',
      docDate: fieldValues.docDate || '-',
      printMode,
      includeCopyStamp,
      includeAttachment,
      fieldValues,
      people: effectivePeople,
      committeeMembers,
      createdAt: editingBatch?.createdAt || now,
      updatedAt: now,
    };
    await onSaveDocumentBatch(record);
    setSaveFeedback('บันทึกข้อมูลเรียบร้อยแล้ว');
    setTimeout(() => setSaveFeedback(''), 2500);
  };

  const filteredRegistry = peopleRegistry.filter((p) => {
    const q = registrySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.studentCode.toLowerCase().includes(q) ||
      p.nationalId.includes(q)
    );
  });

  const headerFields = activeTemplate.fields.filter((f) => f.section === 'header');
  const bodyFields = activeTemplate.fields.filter((f) => f.section === 'body');
  const footerFields = activeTemplate.fields.filter((f) => f.section === 'footer');

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <label
              htmlFor="template-select"
              className="text-xs font-medium text-slate-500 whitespace-nowrap"
            >
              แบบฟอร์ม:
            </label>
            <select
              id="template-select"
              value={activeTemplate.id}
              onChange={(e) => onSelectTemplateId(e.target.value)}
              className="text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 max-w-[300px] sm:max-w-[380px] focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  [{tpl.category === 'memo' ? 'บันทึกข้อความ' : 'หนังสือภายนอก'}] {tpl.shortName}
                </option>
              ))}
            </select>
          </div>

          <span className="hidden xl:inline text-xs text-slate-400">·</span>
          <span className="hidden xl:inline text-xs text-slate-600 tabular-nums">
            {activeTemplate.isSinglePersonForm
              ? `ฟอร์มผู้สอน 1 ท่าน · ${totalPages} หน้า A4`
              : `${peopleList.length} รายชื่อ · ${totalPages} หน้า A4`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {saveFeedback && (
            <span className="text-xs font-medium text-emerald-700 flex items-center gap-1 mr-1">
              <Check className="w-3.5 h-3.5" />
              {saveFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveToDb}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>บันทึกฐานข้อมูล</span>
          </button>
          <button
            type="button"
            onClick={handleExportDoc}
            disabled={isExportingDoc}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{isExportingDoc ? 'กำลังสร้าง .DOC...' : 'ส่งออก .DOC'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์ / บันทึก PDF</span>
          </button>
        </div>
      </div>

      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            mobileTab === 'editor'
              ? 'bg-blue-800 text-white'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          กรอกข้อมูล &amp; รายชื่อ ({peopleList.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            mobileTab === 'preview'
              ? 'bg-blue-800 text-white'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          ตัวอย่างกระดาษ A4 ({totalPages} หน้า)
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div
          className={`w-full lg:w-[470px] xl:w-[510px] shrink-0 bg-white border-r border-slate-200 overflow-y-auto p-4 lg:p-6 space-y-6 ${
            mobileTab === 'preview' ? 'hidden lg:block' : 'block'
          }`}
        >
          {activeTemplate.isSinglePersonForm ? (
            <section className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
              แบบฟอร์มนี้จัดทำขึ้นสำหรับผู้สอนรายบุคคล (1 ชุดต่อฉบับ) และมีช่องลงนามคณะกรรมการตรวจสอบ 3 ท่านด้านล่าง
            </section>
          ) : (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    รายชื่อผู้รับการตรวจสอบ / นักศึกษา
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    พิมพ์หรือวางหลายชื่อคั่นด้วยเครื่องหมายจุลภาค ( , ) เพื่อแยกเอกสารอัตโนมัติ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRegistryIds(
                      new Set(
                        peopleList
                          .map((p) => p.id)
                          .filter((id) => peopleRegistry.some((r) => r.id === id))
                      )
                    );
                    setShowRegistryPicker(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>เลือกจากทะเบียน</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={rawNamesInput}
                onChange={(e) => setRawNamesInput(e.target.value)}
                placeholder="ตัวอย่าง: เด็กหญิง ณัฐมน ขันธสิทธิ์, นาย ธนากร ใจดี, นางสาว ปิยะธิดา สุขสันต์"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-600 block">
                  รูปแบบการจัดพิมพ์หลายรายชื่อ
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPrintMode('individual')}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      printMode === 'individual'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    พิมพ์แยกฉบับรายบุคคล
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode('combined')}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      printMode === 'combined'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    รวมบัญชีรายชื่อชุดเดียว
                  </button>
                </div>
              </div>

              {peopleList.length > 0 && (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  <div className="px-3 py-2 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">
                      ตรวจพบ {peopleList.length} รายชื่อ
                    </span>
                    <span className="text-slate-400">คลิกเพื่อแก้ไขข้อมูลรายคน</span>
                  </div>
                  {peopleList.map((person, idx) => {
                    const isExpanded = expandedPersonIdx === idx;
                    const matchedInDb = peopleRegistry.some(
                      (r) => r.id === person.id
                    );
                    return (
                      <div key={`${person.id}-${idx}`} className="bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPersonIdx(isExpanded ? null : idx)
                          }
                          className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 truncate">
                              <span className="font-mono-tabular text-slate-400 mr-2">
                                {idx + 1}.
                              </span>
                              {person.fullName}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 truncate tabular-nums">
                              รหัส {person.studentCode || '-'} · วุฒิ{' '}
                              {person.qualification || '-'} · ปี{' '}
                              {person.graduationYear || '-'}
                              {matchedInDb ? ' · เชื่อมข้อมูลทะเบียนแล้ว' : ''}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 bg-slate-50/70 grid grid-cols-2 gap-2.5 border-t border-slate-100">
                            <div>
                              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                                รหัสประจำตัว
                              </label>
                              <input
                                type="text"
                                value={person.studentCode}
                                onChange={(e) =>
                                  handlePersonFieldChange(
                                    idx,
                                    'studentCode',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-tabular focus:outline-none focus:border-blue-700"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                                เลขบัตรประชาชน 13 หลัก
                              </label>
                              <input
                                type="text"
                                value={person.nationalId}
                                onChange={(e) =>
                                  handlePersonFieldChange(
                                    idx,
                                    'nationalId',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-tabular focus:outline-none focus:border-blue-700"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                                วุฒิการศึกษา
                              </label>
                              <input
                                type="text"
                                value={person.qualification}
                                onChange={(e) =>
                                  handlePersonFieldChange(
                                    idx,
                                    'qualification',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-700"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                                ปีที่จบ
                              </label>
                              <input
                                type="text"
                                value={person.graduationYear}
                                onChange={(e) =>
                                  handlePersonFieldChange(
                                    idx,
                                    'graduationYear',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-tabular focus:outline-none focus:border-blue-700"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                                สถานศึกษาเดิม
                              </label>
                              <input
                                type="text"
                                value={person.previousSchool}
                                onChange={(e) =>
                                  handlePersonFieldChange(
                                    idx,
                                    'previousSchool',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-700"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                                ที่อยู่
                              </label>
                              <input
                                type="text"
                                value={person.address}
                                onChange={(e) =>
                                  handlePersonFieldChange(
                                    idx,
                                    'address',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-700"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                                หมายเหตุ
                              </label>
                              <input
                                type="text"
                                value={person.note}
                                onChange={(e) =>
                                  handlePersonFieldChange(
                                    idx,
                                    'note',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-700"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <hr className="border-slate-100" />

          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                ตัวเลือกหน้าเอกสาร
              </h3>
              <button
                type="button"
                onClick={applyAgencyDefaults}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>ใช้ข้อมูลหน่วยงานที่ตั้งไว้</span>
              </button>
            </div>
            <div className="flex flex-col gap-2 text-xs text-slate-700">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAttachment}
                  onChange={(e) => setIncludeAttachment(e.target.checked)}
                  className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                />
                <span>แนบบัญชีรายชื่อนักศึกษาท้ายหนังสือ (ตารางตรวจสอบ)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCopyStamp}
                  onChange={(e) => setIncludeCopyStamp(e.target.checked)}
                  className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                />
                <span>ประทับตราคำว่า &ldquo;สำเนา&rdquo; สีแดงด้านบนเอกสาร</span>
              </label>
            </div>
          </section>

          <hr className="border-slate-100" />

          {[
            { title: 'ข้อมูลหัวหนังสือราชการ', items: headerFields },
            { title: 'ข้อความและรายละเอียด', items: bodyFields },
            { title: 'การลงนามและข้อมูลติดต่อ', items: footerFields },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <section key={group.title} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  {group.title}
                </h3>
                <div className="space-y-3">
                  {group.items.map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        {field.label}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={fieldValues[field.key] ?? ''}
                          onChange={(e) =>
                            setFieldValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                        />
                      ) : (
                        <input
                          type="text"
                          value={fieldValues[field.key] ?? ''}
                          onChange={(e) =>
                            setFieldValues((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

          {activeTemplate.category === 'memo' && (
            <section className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    รายชื่อคณะกรรมการลงนาม ({committeeMembers.length} ท่าน)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    แสดงบริเวณด้านล่างซ้ายของบันทึกข้อความ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCommitteeMembers((prev) => [
                      ...prev,
                      {
                        role: prev.length === 0 ? 'ประธานกรรมการ' : 'กรรมการ',
                        name: '',
                        position: 'ครูศูนย์การเรียนรู้',
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มกรรมการ</span>
                </button>
              </div>

              {committeeMembers.length > 0 && (
                <div className="space-y-2.5">
                  {committeeMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700 tabular-nums">
                          คณะกรรมการลำดับที่ {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCommitteeMembers((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="ลบกรรมการท่านนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-1">
                            บทบาท (ท้ายบรรทัดลงชื่อ)
                          </label>
                          <input
                            type="text"
                            value={member.role}
                            onChange={(e) =>
                              setCommitteeMembers((prev) =>
                                prev.map((m, i) =>
                                  i === idx ? { ...m, role: e.target.value } : m
                                )
                              )
                            }
                            placeholder="ประธานกรรมการ / กรรมการ"
                            className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 block mb-1">
                            ตำแหน่ง
                          </label>
                          <input
                            type="text"
                            value={member.position}
                            onChange={(e) =>
                              setCommitteeMembers((prev) =>
                                prev.map((m, i) =>
                                  i === idx ? { ...m, position: e.target.value } : m
                                )
                              )
                            }
                            placeholder="ครูศูนย์การเรียนรู้"
                            className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[11px] font-medium text-slate-500 block mb-1">
                            ชื่อ - นามสกุล
                          </label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) =>
                              setCommitteeMembers((prev) =>
                                prev.map((m, i) =>
                                  i === idx ? { ...m, name: e.target.value } : m
                                )
                              )
                            }
                            placeholder="เช่น นายเกียรติศักดิ์ หมั่นอุตสาห์"
                            className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div
          className={`flex-1 bg-slate-200/75 flex flex-col min-w-0 min-h-0 ${
            mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate font-medium">
                ตัวอย่างก่อนพิมพ์ (ขนาด A4 มาตรฐานงานสารบรรณ)
              </span>
              <span className="text-slate-400">·</span>
              <span className="tabular-nums whitespace-nowrap">
                {totalPages} หน้า
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setPreviewZoom((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))
                }
                aria-label="ย่อขนาด"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono-tabular text-xs w-11 text-center">
                {Math.round(previewZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setPreviewZoom((z) => Math.min(1.1, Number((z + 0.1).toFixed(2))))
                }
                aria-label="ขยายขนาด"
                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start">
            <div
              style={{
                transform: `scale(${previewZoom})`,
                transformOrigin: 'top center',
                marginBottom: `-${(1 - previewZoom) * 100}%`,
              }}
            >
              <OfficialDocumentSheetStack
                template={activeTemplate}
                fieldValues={fieldValues}
                people={peopleList}
                committeeMembers={committeeMembers}
                garudaImageUrl={agencySettings.garudaImageUrl}
                printMode={printMode}
                includeCopyStamp={includeCopyStamp}
                includeAttachment={includeAttachment}
              />
            </div>
          </div>
        </div>
      </div>

      {showRegistryPicker && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-800" />
                <h3 className="text-base font-semibold text-slate-900">
                  เลือกรายชื่อจากฐานข้อมูลทะเบียนนักศึกษา
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegistryPicker(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 cursor-pointer"
              >
                ปิด
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={registrySearch}
                onChange={(e) => setRegistrySearch(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัสประจำตัว หรือเลขบัตรประชาชน..."
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-700"
              />
              <button
                type="button"
                onClick={() => {
                  if (selectedRegistryIds.size === filteredRegistry.length) {
                    setSelectedRegistryIds(new Set());
                  } else {
                    setSelectedRegistryIds(
                      new Set(filteredRegistry.map((r) => r.id))
                    );
                  }
                }}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap cursor-pointer"
              >
                {selectedRegistryIds.size === filteredRegistry.length &&
                filteredRegistry.length > 0
                  ? 'ยกเลิกทั้งหมด'
                  : 'เลือกทั้งหมด'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredRegistry.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  ไม่พบรายชื่อที่ค้นหา
                </div>
              ) : (
                filteredRegistry.map((person) => {
                  const checked = selectedRegistryIds.has(person.id);
                  return (
                    <label
                      key={person.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedRegistryIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(person.id)) next.delete(person.id);
                            else next.add(person.id);
                            return next;
                          });
                        }}
                        className="rounded border-slate-300 text-blue-800 focus:ring-blue-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {person.fullName}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                          รหัส {person.studentCode || '-'} · เลขบัตร{' '}
                          {person.nationalId || '-'} · {person.qualification || '-'} (
                          {person.graduationYear || '-'})
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-xl">
              <span className="text-xs text-slate-600 tabular-nums">
                เลือกแล้ว {selectedRegistryIds.size} รายชื่อ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegistryPicker(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRegistryPicker}
                  disabled={selectedRegistryIds.size === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-40 cursor-pointer"
                >
                  นำรายชื่อเข้าแบบฟอร์ม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. Main Application Shell
// ==========================================
type AppTab = 'workspace' | 'people' | 'history' | 'templates' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('workspace');
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentBatchRecord[]>([]);
  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_AGENCY_SETTINGS);

  const [activeTemplateId, setActiveTemplateId] = useState<string>('memo-individual-verify');
  const [editingBatch, setEditingBatch] = useState<DocumentBatchRecord | null>(null);
  const [preselectedPeople, setPreselectedPeople] = useState<PersonRecord[] | null>(null);
  const [printConfig, setPrintConfig] = useState<SheetRenderConfig | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tpls, ppl, docs, cfg] = await Promise.all([
        storageService.getTemplates(),
        storageService.getPeople(),
        storageService.getDocuments(),
        storageService.getSettings(),
      ]);
      setTemplates(tpls);
      setPeople(ppl);
      setDocuments(docs);
      setSettings(cfg);
      if (tpls.length > 0 && !tpls.some((t) => t.id === activeTemplateId)) {
        setActiveTemplateId(tpls[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTemplateId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSaveTemplates = async (updated: FormTemplate[]) => {
    setTemplates(updated);
    await storageService.saveTemplates(updated);
  };

  const handleSavePeople = async (updated: PersonRecord[]) => {
    setPeople(updated);
    await storageService.savePeople(updated);
  };

  const handleSaveDocumentBatch = async (record: DocumentBatchRecord) => {
    const exists = documents.some((d) => d.id === record.id);
    const updated = exists
      ? documents.map((d) => (d.id === record.id ? record : d))
      : [record, ...documents];
    setDocuments(updated);
    setEditingBatch(record);
    await storageService.saveDocuments(updated);
  };

  const handleDeleteDocument = async (id: string) => {
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    if (editingBatch?.id === id) {
      setEditingBatch(null);
    }
    await storageService.saveDocuments(updated);
  };

  const handleSaveSettings = async (updated: AgencySettings) => {
    setSettings(updated);
    await storageService.saveSettings(updated);
  };

  const navItems: {
    id: AppTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'workspace', label: 'สร้างเอกสาร', shortLabel: 'สร้างเอกสาร', icon: FileText },
    {
      id: 'people',
      label: 'ทะเบียนรายชื่อ',
      shortLabel: 'รายชื่อ',
      icon: FileSpreadsheet,
      count: people.length,
    },
    {
      id: 'history',
      label: 'ประวัติที่บันทึก',
      shortLabel: 'ประวัติ',
      icon: History,
      count: documents.length,
    },
    {
      id: 'templates',
      label: 'คลังแบบฟอร์ม (แอดมิน)',
      shortLabel: 'แบบฟอร์ม',
      icon: LayoutGrid,
      count: templates.length,
    },
    { id: 'settings', label: 'ตั้งค่าหน่วยงาน', shortLabel: 'ตั้งค่า', icon: Settings },
  ];

  return (
    <>
      <div className="no-print min-h-screen lg:h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-slate-200 shrink-0">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              สารบรรณอัจฉริยะ
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {settings.agencyName}
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-blue-800' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && (
                    <span className="text-xs font-mono-tabular text-slate-400">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 text-xs text-slate-500">
            จัดเก็บข้อมูลในเครื่องส่วนตัว · รองรับ PDF / .DOC
          </div>
        </aside>

        <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
          <div className="px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-900 whitespace-nowrap shrink-0">
              สารบรรณอัจฉริยะ
            </span>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-800 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.shortLabel}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              กำลังโหลดฐานข้อมูลเอกสาร...
            </div>
          ) : (
            <>
              {activeTab === 'workspace' && (
                <DocumentWorkspace
                  templates={templates}
                  peopleRegistry={people}
                  agencySettings={settings}
                  activeTemplateId={activeTemplateId}
                  onSelectTemplateId={(id) => {
                    setEditingBatch(null);
                    setActiveTemplateId(id);
                  }}
                  editingBatch={editingBatch}
                  preselectedPeople={preselectedPeople}
                  onClearPreselectedPeople={() => setPreselectedPeople(null)}
                  onSaveDocumentBatch={handleSaveDocumentBatch}
                  onPrintSheets={(cfg) => setPrintConfig(cfg)}
                />
              )}

              {activeTab === 'people' && (
                <PeopleRegistryView
                  people={people}
                  onSavePeople={handleSavePeople}
                  onSendToDocumentWorkspace={(selected) => {
                    setEditingBatch(null);
                    setPreselectedPeople(selected);
                    setActiveTab('workspace');
                  }}
                />
              )}

              {activeTab === 'history' && (
                <SavedRecordsView
                  documents={documents}
                  templates={templates}
                  garudaImageUrl={settings.garudaImageUrl}
                  onOpenDocument={(doc) => {
                    setActiveTemplateId(doc.templateId);
                    setEditingBatch(doc);
                    setActiveTab('workspace');
                  }}
                  onDeleteDocument={handleDeleteDocument}
                  onPrintDocument={(cfg) => setPrintConfig(cfg)}
                />
              )}

              {activeTab === 'templates' && (
                <AdminTemplatesView
                  templates={templates}
                  onSaveTemplates={handleSaveTemplates}
                  onUseTemplate={(tplId) => {
                    setEditingBatch(null);
                    setActiveTemplateId(tplId);
                    setActiveTab('workspace');
                  }}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  onReloadAllData={loadAll}
                />
              )}
            </>
          )}
        </main>
      </div>

      {printConfig && (
        <div className="hidden print:block print-only-root">
          <OfficialDocumentSheetStack {...printConfig} />
        </div>
      )}
    </>
  );
}

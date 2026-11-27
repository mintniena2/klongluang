import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileDown,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  History,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  downloadSampleCsv,
  exportDocumentToDoc,
  formatThaiCitizenId,
  GarudaEmblem,
  parseSpreadsheetText,
  storageService,
} from './docUtils';
import {
  AgencySettings,
  CommitteeMember,
  DEFAULT_FORM_TEMPLATES,
  DocumentBatchRecord,
  FormCategory,
  FormTemplate,
  PersonRecord,
  PrintMode,
  TemplateField,
} from './templates';

// ==========================================
// 1. People Registry View
// ==========================================
interface PeopleRegistryViewProps {
  people: PersonRecord[];
  onSavePeople: (updated: PersonRecord[]) => Promise<void>;
  onSendToDocumentWorkspace: (selected: PersonRecord[]) => void;
}

const EMPTY_PERSON: Omit<PersonRecord, 'id' | 'createdAt'> = {
  studentCode: '',
  nationalId: '',
  fullName: '',
  qualification: '',
  graduationYear: '',
  previousSchool: '',
  address: '',
  note: '',
};

export const PeopleRegistryView: React.FC<PeopleRegistryViewProps> = ({
  people,
  onSavePeople,
  onSendToDocumentWorkspace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingPerson, setEditingPerson] = useState<PersonRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formState, setFormState] = useState(EMPTY_PERSON);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importPreview, setImportPreview] = useState<
    Omit<PersonRecord, 'id' | 'createdAt'>[]
  >([]);

  const filteredPeople = people.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.studentCode.toLowerCase().includes(q) ||
      p.nationalId.includes(q) ||
      p.previousSchool.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    );
  });

  const openCreateModal = () => {
    setEditingPerson(null);
    setFormState(EMPTY_PERSON);
    setShowAddModal(true);
  };

  const openEditModal = (person: PersonRecord) => {
    setEditingPerson(person);
    setFormState({
      studentCode: person.studentCode,
      nationalId: person.nationalId,
      fullName: person.fullName,
      qualification: person.qualification,
      graduationYear: person.graduationYear,
      previousSchool: person.previousSchool,
      address: person.address,
      note: person.note,
    });
    setShowAddModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.fullName.trim()) return;

    if (editingPerson) {
      const updated = people.map((p) =>
        p.id === editingPerson.id ? { ...editingPerson, ...formState } : p
      );
      await onSavePeople(updated);
    } else {
      const newPerson: PersonRecord = {
        ...formState,
        id: `person-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      await onSavePeople([newPerson, ...people]);
    }
    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    await onSavePeople(people.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setImportRawText(text);
      setImportPreview(parseSpreadsheetText(text));
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) return;
    const now = new Date().toISOString();
    const newRecords: PersonRecord[] = importPreview.map((row, idx) => ({
      ...row,
      id: `imported-${Date.now()}-${idx}`,
      createdAt: now,
    }));
    await onSavePeople([...newRecords, ...people]);
    setShowImportModal(false);
    setImportRawText('');
    setImportPreview([]);
  };

  const toggleSelectAll = () => {
    if (
      selectedIds.size === filteredPeople.length &&
      filteredPeople.length > 0
    ) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPeople.map((p) => p.id)));
    }
  };

  const handleSendSelected = () => {
    const chosen = people.filter((p) => selectedIds.has(p.id));
    if (chosen.length > 0) {
      onSendToDocumentWorkspace(chosen);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            ทะเบียนรายชื่อนักศึกษาและข้อมูลบุคคล
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            นำเข้ารายชื่อ รหัสประจำตัว เลขบัตรประชาชน และที่อยู่จาก Excel/CSV เพื่อใช้สร้างบันทึกตรวจสอบรายบุคคลจำนวนมากได้ทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ไฟล์ตัวอย่าง CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>นำเข้า Excel / CSV</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มรายชื่อ</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ-นามสกุล, รหัสประจำตัว, เลขบัตร, ที่อยู่..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-slate-500 tabular-nums">
            ทั้งหมด {people.length} รายการ
          </span>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleSendSelected}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>สร้างเอกสาร ({selectedIds.size} คน)</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredPeople.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">
              ยังไม่มีรายชื่อที่ตรงกับเงื่อนไข
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              เพิ่มรายชื่อใหม่หรือนำเข้าไฟล์ CSV จาก Excel เพื่อใช้งานแบบกลุ่ม
            </p>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 cursor-pointer"
            >
              นำเข้ารายชื่อทันที
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === filteredPeople.length &&
                        filteredPeople.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-800"
                    />
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">รหัส</th>
                  <th className="py-3 px-3 whitespace-nowrap">เลขบัตรประชาชน</th>
                  <th className="py-3 px-3 whitespace-nowrap">ชื่อ - นามสกุล</th>
                  <th className="py-3 px-3 whitespace-nowrap">วุฒิ / ปีที่จบ</th>
                  <th className="py-3 px-3 whitespace-nowrap">สถานศึกษาเดิม / ที่อยู่</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPeople.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(person.id)}
                        onChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(person.id)) next.delete(person.id);
                            else next.add(person.id);
                            return next;
                          });
                        }}
                        className="rounded border-slate-300 text-blue-800"
                      />
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-xs text-slate-700 whitespace-nowrap">
                      {person.studentCode || '-'}
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-xs text-slate-600 whitespace-nowrap">
                      {formatThaiCitizenId(person.nationalId)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {person.fullName}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap tabular-nums">
                      {person.qualification || '-'} · {person.graduationYear || '-'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 max-w-xs truncate">
                      {person.previousSchool ? `${person.previousSchool} — ` : ''}
                      {person.address || '-'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditModal(person)}
                        className="p-1.5 text-slate-500 hover:text-blue-800 rounded hover:bg-slate-100 cursor-pointer"
                        title="แก้ไข"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(person.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-slate-100 ml-1 cursor-pointer"
                        title="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveForm}
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingPerson ? 'แก้ไขข้อมูลรายบุคคล' : 'เพิ่มรายชื่อใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                ปิด
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3.5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  รหัสประจำตัว
                </label>
                <input
                  type="text"
                  value={formState.studentCode}
                  onChange={(e) =>
                    setFormState({ ...formState, studentCode: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  เลขบัตรประชาชน 13 หลัก
                </label>
                <input
                  type="text"
                  value={formState.nationalId}
                  onChange={(e) =>
                    setFormState({ ...formState, nationalId: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  ชื่อ - นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={formState.fullName}
                  onChange={(e) =>
                    setFormState({ ...formState, fullName: e.target.value })
                  }
                  placeholder="เช่น เด็กหญิง ณัฐมน ขันธสิทธิ์"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  วุฒิการศึกษา
                </label>
                <input
                  type="text"
                  value={formState.qualification}
                  onChange={(e) =>
                    setFormState({ ...formState, qualification: e.target.value })
                  }
                  placeholder="ประถมศึกษา / มัธยมศึกษาตอนต้น"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  ปีที่จบ
                </label>
                <input
                  type="text"
                  value={formState.graduationYear}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      graduationYear: e.target.value,
                    })
                  }
                  placeholder="2567"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  สถานศึกษาเดิม
                </label>
                <input
                  type="text"
                  value={formState.previousSchool}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      previousSchool: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  ที่อยู่
                </label>
                <textarea
                  rows={2}
                  value={formState.address}
                  onChange={(e) =>
                    setFormState({ ...formState, address: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  หมายเหตุ
                </label>
                <input
                  type="text"
                  value={formState.note}
                  onChange={(e) =>
                    setFormState({ ...formState, note: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 cursor-pointer"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </form>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                นำเข้ารายชื่อจำนวนมาก (ไฟล์ CSV หรือวางข้อมูลจาก Excel)
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                ปิด
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-600">
                  ลำดับคอลัมน์ที่แนะนำ: รหัสประจำตัว, เลขบัตรประชาชน, ชื่อ-นามสกุล, วุฒิการศึกษา, ปีที่จบ, สถานศึกษาเดิม, ที่อยู่, หมายเหตุ
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-white border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50">
                  <Upload className="w-3.5 h-3.5" />
                  <span>เลือกไฟล์ .CSV</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  หรือวางข้อมูลที่คัดลอกมาจาก Excel / Google Sheets โดยตรง
                </label>
                <textarea
                  rows={5}
                  value={importRawText}
                  onChange={(e) => {
                    const txt = e.target.value;
                    setImportRawText(txt);
                    setImportPreview(parseSpreadsheetText(txt));
                  }}
                  placeholder={`9318\t1139900482105\tเด็กหญิง ณัฐมน ขันธสิทธิ์\tประถมศึกษา\t2567\tโรงเรียนวันครู 2502\t112/8 หมู่ 4 คลองสอง ปทุมธานี`}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono-tabular focus:outline-none focus:border-blue-700"
                />
              </div>

              {importPreview.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 tabular-nums">
                    ตัวอย่างข้อมูลที่จะนำเข้า ({importPreview.length} รายการ)
                  </div>
                  <div className="max-h-52 overflow-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500">
                          <th className="py-2 px-2.5">รหัส</th>
                          <th className="py-2 px-2.5">เลขบัตร</th>
                          <th className="py-2 px-2.5">ชื่อ-นามสกุล</th>
                          <th className="py-2 px-2.5">วุฒิ</th>
                          <th className="py-2 px-2.5">ปี</th>
                          <th className="py-2 px-2.5">ที่อยู่</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.map((row, i) => (
                          <tr key={i}>
                            <td className="py-1.5 px-2.5 font-mono-tabular">
                              {row.studentCode || '-'}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono-tabular">
                              {row.nationalId || '-'}
                            </td>
                            <td className="py-1.5 px-2.5 font-medium">
                              {row.fullName}
                            </td>
                            <td className="py-1.5 px-2.5">
                              {row.qualification || '-'}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono-tabular">
                              {row.graduationYear || '-'}
                            </td>
                            <td className="py-1.5 px-2.5 truncate max-w-[180px]">
                              {row.address || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-xl">
              <span className="text-xs text-slate-500 tabular-nums">
                พร้อมนำเข้า {importPreview.length} รายชื่อ
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={importPreview.length === 0}
                  onClick={handleImportConfirm}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-40 cursor-pointer"
                >
                  ยืนยันนำเข้าฐานข้อมูล
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
// 2. Admin Templates View
// ==========================================
interface AdminTemplatesViewProps {
  templates: FormTemplate[];
  onSaveTemplates: (updated: FormTemplate[]) => Promise<void>;
  onUseTemplate: (templateId: string) => void;
}

const PERSON_TOKENS = [
  '{{ชื่อ-นามสกุล}}',
  '{{รหัสประจำตัว}}',
  '{{เลขบัตรประชาชน}}',
  '{{วุฒิการศึกษา}}',
  '{{ปีที่จบ}}',
  '{{สถานศึกษาเดิม}}',
  '{{ที่อยู่}}',
  '{{หมายเหตุ}}',
];

function createBlankTemplate(category: FormCategory): FormTemplate {
  const now = new Date().toISOString();
  const baseFields: TemplateField[] =
    category === 'memo'
      ? [
          {
            key: 'department',
            label: 'ส่วนราชการ',
            type: 'text',
            defaultValue: 'ศูนย์ส่งเสริมการเรียนรู้ระดับอำเภอคลองหลวง',
            section: 'header',
          },
          {
            key: 'docNumber',
            label: 'ที่',
            type: 'text',
            defaultValue: 'ศธ 07058.02/',
            section: 'header',
          },
          {
            key: 'docDate',
            label: 'วันที่',
            type: 'text',
            defaultValue: '25 พฤศจิกายน 2569',
            section: 'header',
          },
          {
            key: 'subject',
            label: 'เรื่อง',
            type: 'text',
            defaultValue: 'ขอรายงานผลการตรวจสอบข้อมูลรายบุคคล ({{ชื่อ-นามสกุล}})',
            section: 'header',
          },
          {
            key: 'recipient',
            label: 'เรียน',
            type: 'text',
            defaultValue: 'ผู้อำนวยการศูนย์ส่งเสริมการเรียนรู้ระดับอำเภอคลองหลวง',
            section: 'header',
          },
          {
            key: 'signerName',
            label: 'ชื่อผู้ลงนาม',
            type: 'text',
            defaultValue: '',
            section: 'footer',
          },
          {
            key: 'signerPosition',
            label: 'ตำแหน่ง',
            type: 'text',
            defaultValue: '',
            section: 'footer',
          },
        ]
      : [
          {
            key: 'docNumber',
            label: 'ที่',
            type: 'text',
            defaultValue: 'ศธ 07058.02/',
            section: 'header',
          },
          {
            key: 'agencyName',
            label: 'ส่วนราชการเจ้าของเรื่อง',
            type: 'text',
            defaultValue: 'ศูนย์ส่งเสริมการเรียนรู้ระดับอำเภอคลองหลวง',
            section: 'header',
          },
          {
            key: 'agencyAddress',
            label: 'ที่ตั้งส่วนราชการ',
            type: 'textarea',
            defaultValue: '40/4 หมู่ 7 ตำบลคลองสอง อำเภอคลองหลวง\nจังหวัดปทุมธานี 12120',
            section: 'header',
          },
          {
            key: 'docDate',
            label: 'วัน เดือน ปี',
            type: 'text',
            defaultValue: 'พฤศจิกายน 2569',
            section: 'header',
          },
          {
            key: 'subject',
            label: 'เรื่อง',
            type: 'text',
            defaultValue: 'ขอความอนุเคราะห์...',
            section: 'header',
          },
          {
            key: 'recipient',
            label: 'เรียน',
            type: 'text',
            defaultValue: '',
            section: 'header',
          },
          {
            key: 'attachments',
            label: 'สิ่งที่ส่งมาด้วย',
            type: 'textarea',
            defaultValue: '1. บัญชีรายชื่อ จำนวน 1 ชุด',
            section: 'header',
          },
          {
            key: 'signerName',
            label: 'ชื่อผู้ลงนาม',
            type: 'text',
            defaultValue: 'นางทัศดาพร ลองชัย',
            section: 'footer',
          },
          {
            key: 'signerPosition',
            label: 'ตำแหน่งผู้ลงนาม',
            type: 'text',
            defaultValue: 'ผู้อำนวยการศูนย์ส่งเสริมการเรียนรู้ระดับอำเภอคลองหลวง',
            section: 'footer',
          },
        ];

  return {
    id: `custom-${Date.now()}`,
    name: category === 'memo' ? 'บันทึกข้อความ — แบบฟอร์มใหม่' : 'หนังสือภายนอก — แบบฟอร์มใหม่',
    shortName: category === 'memo' ? 'บันทึกข้อความใหม่' : 'หนังสือภายนอกใหม่',
    category,
    description: 'แบบฟอร์มที่สร้างเพิ่มเติมโดยผู้ดูแลระบบ',
    isSystem: false,
    includeCopyStampDefault: false,
    includePersonDetailBox: category === 'memo',
    includeAttachmentList: category === 'external',
    attachmentTitle: 'บัญชีรายชื่อนักศึกษาที่ขอตรวจสอบเอกสาร',
    fields: baseFields,
    bodyParagraphs: [
      'ด้วยหน่วยงานมีความประสงค์ขอแจ้งรายละเอียดของ {{ชื่อ-นามสกุล}} รหัสประจำตัว {{รหัสประจำตัว}} เลขประจำตัวประชาชน {{เลขบัตรประชาชน}}',
      'จึงเรียนมาเพื่อโปรดพิจารณา',
    ],
    signOffPhrase: category === 'external' ? 'ขอแสดงความนับถือ' : '',
    createdAt: now,
    updatedAt: now,
  };
}

export const AdminTemplatesView: React.FC<AdminTemplatesViewProps> = ({
  templates,
  onSaveTemplates,
  onUseTemplate,
}) => {
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openNewTemplate = (category: FormCategory) => {
    setEditingTemplate(createBlankTemplate(category));
    setIsNew(true);
  };

  const openEditTemplate = (tpl: FormTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(tpl)) as FormTemplate);
    setIsNew(false);
  };

  const handleDuplicate = async (tpl: FormTemplate) => {
    const now = new Date().toISOString();
    const copy: FormTemplate = {
      ...(JSON.parse(JSON.stringify(tpl)) as FormTemplate),
      id: `custom-${Date.now()}`,
      name: `${tpl.name} (สำเนา)`,
      shortName: `${tpl.shortName} (สำเนา)`,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };
    await onSaveTemplates([...templates, copy]);
  };

  const handleDelete = async (id: string) => {
    await onSaveTemplates(templates.filter((t) => t.id !== id));
  };

  const handleResetDefaults = async () => {
    const customOnly = templates.filter((t) => !t.isSystem);
    await onSaveTemplates([...DEFAULT_FORM_TEMPLATES, ...customOnly]);
  };

  const handleSaveEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    const updatedTemplate: FormTemplate = {
      ...editingTemplate,
      updatedAt: new Date().toISOString(),
    };
    if (isNew) {
      await onSaveTemplates([...templates, updatedTemplate]);
    } else {
      await onSaveTemplates(
        templates.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
      );
    }
    setEditingTemplate(null);
  };

  const addCustomField = () => {
    if (!editingTemplate) return;
    const newKey = `field_${editingTemplate.fields.length + 1}`;
    setEditingTemplate({
      ...editingTemplate,
      fields: [
        ...editingTemplate.fields,
        {
          key: newKey,
          label: 'ช่องกรอกใหม่',
          type: 'text',
          defaultValue: '',
          section: 'body',
        },
      ],
    });
  };

  const updateField = (idx: number, patch: Partial<TemplateField>) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.map((f, i) =>
        i === idx ? { ...f, ...patch } : f
      ),
    });
  };

  const removeField = (idx: number) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.filter((_, i) => i !== idx),
    });
  };

  const insertTokenIntoLastParagraph = (token: string) => {
    if (!editingTemplate) return;
    const paragraphs = [...editingTemplate.bodyParagraphs];
    if (paragraphs.length === 0) paragraphs.push(token);
    else paragraphs[paragraphs.length - 1] = `${paragraphs[paragraphs.length - 1]} ${token}`;
    setEditingTemplate({ ...editingTemplate, bodyParagraphs: paragraphs });
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            คลังแบบฟอร์มและตัวจัดการแอดมิน
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            เพิ่ม แก้ไข หรือปรับแต่งแม่แบบหนังสือราชการและบันทึกข้อความ พร้อมกำหนดช่องกรอกและตัวแปรรายบุคคลอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าแบบฟอร์มมาตรฐาน</span>
          </button>
          <button
            type="button"
            onClick={() => openNewTemplate('memo')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 whitespace-nowrap cursor-pointer"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>เพิ่มบันทึกข้อความใหม่</span>
          </button>
          <button
            type="button"
            onClick={() => openNewTemplate('external')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มหนังสือภายนอกใหม่</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
          >
            <div>
              <div className="text-xs text-slate-500 mb-1.5">
                {tpl.category === 'memo' ? 'บันทึกข้อความ (ครุฑ 1.5 ซม.)' : 'หนังสือภายนอก (ครุฑ 3 ซม.)'}
                {' · '}
                {tpl.isSystem ? 'แบบฟอร์มมาตรฐาน' : 'แบบฟอร์มที่เพิ่มเอง'}
              </div>
              <h3 className="text-base font-semibold text-slate-900 leading-snug">
                {tpl.name}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {tpl.description}
              </p>
              <div className="text-xs text-slate-400 mt-3 tabular-nums">
                {tpl.fields.length} ช่องกรอก · {tpl.bodyParagraphs.length} ย่อหน้า
                {tpl.includePersonDetailBox ? ' · มีตารางข้อมูลรายบุคคล' : ''}
                {tpl.includeAttachmentList ? ' · มีบัญชีรายชื่อแนบท้าย' : ''}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditTemplate(tpl)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>แก้ไข</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicate(tpl)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>ทำสำเนา</span>
                </button>
                {!tpl.isSystem && (
                  <button
                    type="button"
                    onClick={() => handleDelete(tpl.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบ</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => onUseTemplate(tpl.id)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 whitespace-nowrap cursor-pointer"
              >
                ใช้งานแบบฟอร์มนี้
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditor}
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {isNew ? 'สร้างแบบฟอร์มราชการใหม่' : `แก้ไขแบบฟอร์ม: ${editingTemplate.shortName}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                ปิด
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    ชื่อเต็มแบบฟอร์ม *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    ชื่อย่อ (แสดงในรายการเลือก) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.shortName}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        shortName: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    ประเภทหนังสือตามระเบียบ
                  </label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        category: e.target.value as FormCategory,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="memo">บันทึกข้อความ (ครุฑ 1.5 ซม.)</option>
                    <option value="external">หนังสือภายนอก (ครุฑ 3 ซม.)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    คำอธิบายแบบฟอร์ม
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.description}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        description: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.includePersonDetailBox}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        includePersonDetailBox: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-blue-800"
                  />
                  <span>แทรกตารางข้อมูลรายบุคคล + ช่องความเห็นผู้อำนวยการในหน้าบันทึก</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.includeAttachmentList}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        includeAttachmentList: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-blue-800"
                  />
                  <span>แนบหน้าบัญชีรายชื่อเป็นค่าเริ่มต้น</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.includeCopyStampDefault}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        includeCopyStampDefault: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-blue-800"
                  />
                  <span>แสดงตรา &ldquo;สำเนา&rdquo; สีแดงเป็นค่าเริ่มต้น</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingTemplate.isSinglePersonForm)}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        isSinglePersonForm: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-blue-800"
                  />
                  <span>ฟอร์มสำหรับผู้จัดทำคนเดียว (ซ่อนช่องแยกรายชื่อหลายราย)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingTemplate.omitMainSignatureLine)}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        omitMainSignatureLine: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-blue-800"
                  />
                  <span>เว้นบรรทัดเซ็นเหนือชื่อผู้เสนอ (ไม่ต้องใส่ &ldquo;(ลงชื่อ)....&rdquo;)</span>
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-slate-900">
                    ย่อหน้าเนื้อความ (รองรับตัวแปร &#123;&#123;...&#125;&#125;)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingTemplate({
                        ...editingTemplate,
                        bodyParagraphs: [...editingTemplate.bodyParagraphs, ''],
                      })
                    }
                    className="text-xs font-medium text-blue-800 hover:underline cursor-pointer"
                  >
                    + เพิ่มย่อหน้า
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PERSON_TOKENS.map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => insertTokenIntoLastParagraph(tok)}
                      className="px-2 py-1 text-[11px] font-mono-tabular bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded border border-slate-200 cursor-pointer"
                    >
                      + {tok}
                    </button>
                  ))}
                </div>

                <div className="space-y-2.5">
                  {editingTemplate.bodyParagraphs.map((para, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-xs font-mono-tabular text-slate-400 pt-2.5 w-6">
                        {idx + 1}.
                      </span>
                      <textarea
                        rows={2}
                        value={para}
                        onChange={(e) => {
                          const next = [...editingTemplate.bodyParagraphs];
                          next[idx] = e.target.value;
                          setEditingTemplate({
                            ...editingTemplate,
                            bodyParagraphs: next,
                          });
                        }}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingTemplate({
                            ...editingTemplate,
                            bodyParagraphs: editingTemplate.bodyParagraphs.filter(
                              (_, i) => i !== idx
                            ),
                          })
                        }
                        className="p-2 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="ลบย่อหน้า"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900">
                    ช่องกรอกข้อมูลในแบบฟอร์ม (อ้างอิงในเนื้อหาด้วย &#123;&#123;key&#125;&#125;)
                  </label>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="text-xs font-medium text-blue-800 hover:underline cursor-pointer"
                  >
                    + เพิ่มช่องกรอกข้อมูล
                  </button>
                </div>

                <div className="space-y-2">
                  {editingTemplate.fields.map((field, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    >
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateField(idx, { key: e.target.value })}
                        placeholder="key"
                        className="col-span-3 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono-tabular"
                      />
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        placeholder="ป้ายชื่อช่องกรอก"
                        className="col-span-3 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={field.defaultValue || ''}
                        onChange={(e) =>
                          updateField(idx, { defaultValue: e.target.value })
                        }
                        placeholder="ค่าเริ่มต้น"
                        className="col-span-3 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                      />
                      <select
                        value={field.section}
                        onChange={(e) =>
                          updateField(idx, {
                            section: e.target.value as 'header' | 'body' | 'footer',
                          })
                        }
                        className="col-span-2 rounded border border-slate-200 bg-white px-1.5 py-1.5 text-xs"
                      >
                        <option value="header">หัวเรื่อง</option>
                        <option value="body">เนื้อหา</option>
                        <option value="footer">ลงนาม</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeField(idx)}
                        className="col-span-1 flex justify-center text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900">
                    รายชื่อคณะกรรมการลงนามเริ่มต้น ({editingTemplate.committeeMembers?.length || 0} ท่าน)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const current: CommitteeMember[] =
                        editingTemplate.committeeMembers || [];
                      setEditingTemplate({
                        ...editingTemplate,
                        committeeMembers: [
                          ...current,
                          {
                            role: current.length === 0 ? 'ประธานกรรมการ' : 'กรรมการ',
                            name: '',
                            position: 'ครูศูนย์การเรียนรู้',
                          },
                        ],
                      });
                    }}
                    className="text-xs font-medium text-blue-800 hover:underline cursor-pointer"
                  >
                    + เพิ่มกรรมการ
                  </button>
                </div>

                {(editingTemplate.committeeMembers || []).length > 0 && (
                  <div className="space-y-2">
                    {(editingTemplate.committeeMembers || []).map((member, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                      >
                        <input
                          type="text"
                          value={member.role}
                          onChange={(e) => {
                            const next = [...(editingTemplate.committeeMembers || [])];
                            next[idx] = { ...next[idx], role: e.target.value };
                            setEditingTemplate({
                              ...editingTemplate,
                              committeeMembers: next,
                            });
                          }}
                          placeholder="ประธานกรรมการ / กรรมการ"
                          className="col-span-3 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                        />
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => {
                            const next = [...(editingTemplate.committeeMembers || [])];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setEditingTemplate({
                              ...editingTemplate,
                              committeeMembers: next,
                            });
                          }}
                          placeholder="ชื่อ-นามสกุล"
                          className="col-span-5 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                        />
                        <input
                          type="text"
                          value={member.position}
                          onChange={(e) => {
                            const next = [...(editingTemplate.committeeMembers || [])];
                            next[idx] = { ...next[idx], position: e.target.value };
                            setEditingTemplate({
                              ...editingTemplate,
                              committeeMembers: next,
                            });
                          }}
                          placeholder="ตำแหน่ง"
                          className="col-span-3 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditingTemplate({
                              ...editingTemplate,
                              committeeMembers: (
                                editingTemplate.committeeMembers || []
                              ).filter((_, i) => i !== idx),
                            })
                          }
                          className="col-span-1 flex justify-center text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 cursor-pointer"
              >
                บันทึกแบบฟอร์ม
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. Saved Records View
// ==========================================
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

// ==========================================
// 4. Settings & Backup View
// ==========================================
interface SettingsViewProps {
  settings: AgencySettings;
  onSaveSettings: (updated: AgencySettings) => Promise<void>;
  onReloadAllData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onReloadAllData,
}) => {
  const [form, setForm] = useState<AgencySettings>(settings);
  const [savedToast, setSavedToast] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleGarudaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if (result) {
        setForm((prev) => ({ ...prev, garudaImageUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(form);
    setSavedToast('บันทึกการตั้งค่าหน่วยงานเรียบร้อยแล้ว');
    setTimeout(() => setSavedToast(''), 2500);
  };

  const handleExportBackup = async () => {
    const snapshot = await storageService.exportSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `saraban_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        await storageService.importSnapshot(parsed);
        await onReloadAllData();
        setSavedToast('กู้คืนข้อมูลสำรองทั้งหมดเรียบร้อยแล้ว');
        setTimeout(() => setSavedToast(''), 3000);
      } catch {
        setSavedToast('ไฟล์สำรองไม่ถูกต้อง');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          ตั้งค่าหน่วยงานและสำรองฐานข้อมูล
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          ข้อมูลทั้งหมดจัดเก็บไว้ในเครื่องของคุณแบบส่วนตัว (Offline-ready Local Database) สามารถสำรองหรือย้ายเครื่องผ่านไฟล์ .JSON ได้
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            ข้อมูลส่วนราชการ / สถานศึกษาเริ่มต้น
          </h2>
          {savedToast && (
            <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {savedToast}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">
              ชื่อหน่วยงาน / สถานศึกษา
            </label>
            <input
              type="text"
              value={form.agencyName}
              onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600 block mb-1">
              ที่อยู่หน่วยงาน
            </label>
            <textarea
              rows={2}
              value={form.agencyAddress}
              onChange={(e) => setForm({ ...form, agencyAddress: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              เลขรหัสหนังสือเริ่มต้น (ที่)
            </label>
            <input
              type="text"
              value={form.docPrefix}
              onChange={(e) => setForm({ ...form, docPrefix: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              กลุ่ม / งานเจ้าของเรื่อง
            </label>
            <input
              type="text"
              value={form.departmentName}
              onChange={(e) => setForm({ ...form, departmentName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              โทรศัพท์
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono-tabular"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              ไปรษณีย์อิเล็กทรอนิกส์ (Email)
            </label>
            <input
              type="text"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              ชื่อผู้อำนวยการ (สำหรับหนังสือภายนอก)
            </label>
            <input
              type="text"
              value={form.directorName}
              onChange={(e) => setForm({ ...form, directorName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              ตำแหน่งผู้อำนวยการ
            </label>
            <input
              type="text"
              value={form.directorTitle}
              onChange={(e) => setForm({ ...form, directorTitle: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              ชื่อครู / ผู้จัดทำบันทึกข้อความ
            </label>
            <input
              type="text"
              value={form.officerName}
              onChange={(e) => setForm({ ...form, officerName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              ตำแหน่งผู้จัดทำบันทึก
            </label>
            <input
              type="text"
              value={form.officerTitle}
              onChange={(e) => setForm({ ...form, officerTitle: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                รูปภาพตราครุฑ (ดึงจาก GitHub หรืออัปโหลดไฟล์)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                วางลิงก์ Raw URL จาก GitHub (เช่น https://raw.githubusercontent.com/username/repo/main/garuda.png) หากเว้นว่างไว้จะใช้ตราครุฑมาตรฐานในระบบ
              </p>
            </div>
            {form.garudaImageUrl && (
              <button
                type="button"
                onClick={() => setForm({ ...form, garudaImageUrl: '' })}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ใช้ตราครุฑมาตรฐานในระบบ</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-24 h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-2 shrink-0">
              <GarudaEmblem sizeCm={1.9} imageUrl={form.garudaImageUrl} />
            </div>

            <div className="flex-1 w-full space-y-2.5">
              <input
                type="text"
                value={form.garudaImageUrl || ''}
                onChange={(e) =>
                  setForm({ ...form, garudaImageUrl: e.target.value })
                }
                placeholder="https://raw.githubusercontent.com/ชื่อผู้ใช้/ชื่อคลัง/main/garuda.png"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono-tabular"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>หรืออัปโหลดไฟล์ตราครุฑ (.PNG / .JPG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGarudaFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-800 rounded-lg hover:bg-blue-900 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>บันทึกการตั้งค่า</span>
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            สำรองและกู้คืนฐานข้อมูลทั้งหมด (.JSON)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ส่งออกไฟล์สำรองที่มีทั้งแบบฟอร์มที่แอดมินสร้าง ทะเบียนรายชื่อนักศึกษา และประวัติเอกสารทั้งหมดเก็บไว้ใช้งานข้ามเครื่อง
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>สำรองข้อมูล (.JSON)</span>
          </button>
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 whitespace-nowrap cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>นำเข้าไฟล์สำรอง</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

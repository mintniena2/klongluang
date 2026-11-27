import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { PersonRecord } from '../types/document';
import { formatThaiCitizenId } from '../utils/commaParser';
import { downloadSampleCsv, parseSpreadsheetText } from '../utils/docExporter';

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
      {/* Header */}
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

      {/* Search & Batch Action Bar */}
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

      {/* Registry Table */}
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

      {/* Add / Edit Person Modal */}
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

      {/* Bulk Import CSV / Excel Modal */}
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

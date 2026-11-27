import React, { useEffect, useState } from 'react';
import { Check, Download, RotateCcw, Save, Upload } from 'lucide-react';
import { storageService } from '../services/storage';
import { AgencySettings } from '../types/document';
import { GarudaEmblem } from './GarudaEmblem';

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

        {/* Garuda Image from GitHub URL or Upload */}
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

      {/* Local Database Backup / Restore */}
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

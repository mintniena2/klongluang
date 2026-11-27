import React, { useCallback, useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  History,
  LayoutGrid,
  Settings,
} from 'lucide-react';
import { AdminTemplatesView } from './components/AdminTemplatesView';
import { DocumentWorkspace } from './components/DocumentWorkspace';
import {
  OfficialDocumentSheetStack,
  SheetRenderConfig,
} from './components/OfficialDocumentSheet';
import { PeopleRegistryView } from './components/PeopleRegistryView';
import { SavedRecordsView } from './components/SavedRecordsView';
import { SettingsView } from './components/SettingsView';
import { DEFAULT_AGENCY_SETTINGS } from './data/defaultTemplates';
import { storageService } from './services/storage';
import {
  AgencySettings,
  DocumentBatchRecord,
  FormTemplate,
  PersonRecord,
} from './types/document';

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
        {/* Desktop Sidebar */}
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

        {/* Mobile Top Navigation */}
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

        {/* Main Viewport */}
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

      {/* Print-Only A4 Container (hidden on screen, shown at 100% scale when printing / saving PDF) */}
      {printConfig && (
        <div className="hidden print:block print-only-root">
          <OfficialDocumentSheetStack {...printConfig} />
        </div>
      )}
    </>
  );
}

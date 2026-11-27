import React, { useState } from 'react';
import {
  Copy,
  FilePlus2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { DEFAULT_FORM_TEMPLATES } from '../data/defaultTemplates';
import {
  CommitteeMember,
  FormCategory,
  FormTemplate,
  TemplateField,
} from '../types/document';

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

      {/* Template Grid */}
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

      {/* Admin Template Editor Modal */}
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

              {/* Committee Members Defaults */}
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

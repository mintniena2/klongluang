import React from 'react';
import {
  CommitteeMember,
  FormTemplate,
  PersonRecord,
  PrintMode,
} from '../types/document';
import { formatThaiCitizenId, resolveTemplateText } from '../utils/commaParser';
import { GarudaEmblem } from './GarudaEmblem';

export interface SheetRenderConfig {
  template: FormTemplate;
  fieldValues: Record<string, string>;
  people: PersonRecord[];
  committeeMembers?: CommitteeMember[];
  garudaImageUrl?: string;
  printMode: PrintMode;
  includeCopyStamp: boolean;
  includeAttachment: boolean;
}

interface SingleMemoProps {
  template: FormTemplate;
  fieldValues: Record<string, string>;
  person?: PersonRecord;
  committeeMembers?: CommitteeMember[];
  garudaImageUrl?: string;
  includeCopyStamp: boolean;
  pageLabel?: string;
}

const MemoPage: React.FC<SingleMemoProps> = ({
  template,
  fieldValues,
  person,
  committeeMembers,
  garudaImageUrl,
  includeCopyStamp,
}) => {
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

  return (
    <div className="a4-sheet a4-sheet-memo shadow-sm border border-slate-200/80 mx-auto">
      {includeCopyStamp && (
        <div className="text-center text-[#cc1111] font-bold text-[24pt] leading-none mb-1 tracking-wide">
          สำเนา
        </div>
      )}

      {/* Top row: 1.5 cm Garuda on left + "บันทึกข้อความ" 29pt centered */}
      <div className="relative flex items-end justify-center mb-3 min-h-[1.6cm]">
        <div className="absolute left-0 bottom-0">
          <GarudaEmblem sizeCm={1.5} imageUrl={garudaImageUrl} />
        </div>
        <div className="text-[29pt] font-bold leading-none tracking-tight text-center">
          บันทึกข้อความ
        </div>
      </div>

      {/* ส่วนราชการ */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-bold whitespace-nowrap">ส่วนราชการ</span>
        <span className="flex-1 break-words">{department}</span>
      </div>

      {/* ที่ & วันที่ */}
      <div className="grid grid-cols-12 gap-2 mb-1">
        <div className="col-span-6 flex items-baseline gap-2">
          <span className="font-bold whitespace-nowrap">ที่</span>
          <span className="break-words">{docNumber}</span>
        </div>
        <div className="col-span-6 flex items-baseline gap-2">
          <span className="font-bold whitespace-nowrap">วันที่</span>
          <span className="break-words">{docDate}</span>
        </div>
      </div>

      {/* เรื่อง + เส้นคั่น */}
      <div className="flex items-baseline gap-2 pb-1.5 mb-3 border-b border-black">
        <span className="font-bold whitespace-nowrap">เรื่อง</span>
        <span className="flex-1 break-words">{subject}</span>
      </div>

      {/* เรียน */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="whitespace-nowrap">เรียน</span>
        <span className="flex-1 break-words">{recipient}</span>
      </div>

      {/* เนื้อหา */}
      <div className="space-y-2.5 text-justify">
        {paragraphs.map((p, idx) => {
          const lines = p.split('\n');
          if (lines.length > 1 && /^\d+\./.test(lines[1].trim())) {
            return (
              <div key={idx}>
                <p className="thai-indent">{lines[0]}</p>
                <div className="pl-[25mm] space-y-0.5 mt-0.5 text-left">
                  {lines.slice(1).map((subLine, sIdx) => (
                    <div key={sIdx}>{subLine}</div>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <p key={idx} className="thai-indent whitespace-pre-line">
              {p}
            </p>
          );
        })}
      </div>

      {/* ตารางข้อมูลตรวจสอบรายบุคคล (ถ้าเปิดใช้งาน) */}
      {template.includePersonDetailBox && person && (
        <div className="mt-5 mb-5">
          <table className="w-full border-collapse text-[14.5pt] leading-[1.35]">
            <tbody>
              <tr>
                <td className="border border-black px-2.5 py-1.5 font-bold bg-slate-50 w-[26%]">
                  ชื่อ - นามสกุล
                </td>
                <td className="border border-black px-2.5 py-1.5 w-[38%]">
                  {person.fullName || '-'}
                </td>
                <td className="border border-black px-2.5 py-1.5 font-bold bg-slate-50 w-[18%]">
                  รหัสประจำตัว
                </td>
                <td className="border border-black px-2.5 py-1.5 w-[18%] tabular-nums">
                  {person.studentCode || '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1.5 font-bold bg-slate-50">
                  เลขประจำตัวประชาชน
                </td>
                <td className="border border-black px-2.5 py-1.5 tabular-nums">
                  {formatThaiCitizenId(person.nationalId)}
                </td>
                <td className="border border-black px-2.5 py-1.5 font-bold bg-slate-50">
                  ปีที่จบ
                </td>
                <td className="border border-black px-2.5 py-1.5 tabular-nums">
                  {person.graduationYear || '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1.5 font-bold bg-slate-50">
                  วุฒิการศึกษา
                </td>
                <td className="border border-black px-2.5 py-1.5">
                  {person.qualification || '-'}
                </td>
                <td className="border border-black px-2.5 py-1.5 font-bold bg-slate-50">
                  สถานศึกษาเดิม
                </td>
                <td className="border border-black px-2.5 py-1.5">
                  {person.previousSchool || '-'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2.5 py-1.5 font-bold bg-slate-50">
                  ที่อยู่ปัจจุบัน
                </td>
                <td colSpan={3} className="border border-black px-2.5 py-1.5">
                  {person.address || '-'}
                </td>
              </tr>
              {person.note && (
                <tr>
                  <td className="border border-black px-2.5 py-1.5 font-bold bg-slate-50">
                    หมายเหตุ
                  </td>
                  <td colSpan={3} className="border border-black px-2.5 py-1.5">
                    {person.note}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ส่วนลงนาม */}
      <div className="mt-8 grid grid-cols-12">
        <div className="col-span-5" />
        <div className="col-span-7 text-center leading-[1.4]">
          {template.omitMainSignatureLine ? (
            <div className="h-7" />
          ) : (
            <div>(ลงชื่อ)......................................................</div>
          )}
          <div className="mt-1">({signerName || '.............................................'})</div>
          <div>{signerPosition}</div>
        </div>
      </div>

      {/* คณะกรรมการลงนาม (ถ้ามี) */}
      {(committeeMembers && committeeMembers.length > 0) && (
        <div className="mt-6 space-y-4 text-[15pt] leading-[1.35]">
          {committeeMembers.map((member, mIdx) => (
            <div key={mIdx} className="w-[68%]">
              <div>
                ลงชื่อ......................................................{member.role}
              </div>
              <div className="pl-10">
                ({member.name || '............................................'})
              </div>
              <div className="pl-14">{member.position}</div>
            </div>
          ))}
        </div>
      )}

      {/* ช่องความเห็นผู้บังคับบัญชา (สำหรับบันทึกตรวจสอบรายบุคคล) */}
      {template.includePersonDetailBox && (
        <div className="mt-10 pt-4 border-t border-dashed border-slate-400 text-[15pt]">
          <div className="font-bold mb-2">ความเห็นผู้อำนวยการ / ผู้มีอำนาจอนุมัติ</div>
          <div className="flex items-center gap-6 mb-5">
            <span>☐&nbsp;ทราบ / อนุมัติดำเนินการตามเสนอ</span>
            <span>☐&nbsp;อื่นๆ ................................................................</span>
          </div>
          <div className="grid grid-cols-12">
            <div className="col-span-5" />
            <div className="col-span-7 text-center leading-[1.45]">
              <div>(ลงชื่อ)......................................................</div>
              <div>(.......................................................)</div>
              <div>ตำแหน่ง ...........................................................</div>
              <div>วันที่ ......... / ..................... / .............</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ExternalLetterPageProps {
  template: FormTemplate;
  fieldValues: Record<string, string>;
  person?: PersonRecord;
  garudaImageUrl?: string;
  includeCopyStamp: boolean;
}

const ExternalLetterPage: React.FC<ExternalLetterPageProps> = ({
  template,
  fieldValues,
  person,
  garudaImageUrl,
  includeCopyStamp,
}) => {
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

  return (
    <div className="a4-sheet a4-sheet-external shadow-sm border border-slate-200/80 mx-auto flex flex-col justify-between">
      <div>
        {includeCopyStamp && (
          <div className="text-center text-[#cc1111] font-bold text-[26pt] leading-none mb-1">
            สำเนา
          </div>
        )}

        {/* Header: ที่ | ครุฑ 3 ซม. | ส่วนราชการเจ้าของหนังสือ */}
        <div className="grid grid-cols-12 items-end gap-2 mb-3">
          <div className="col-span-4 pb-1">
            <span>ที่&nbsp;&nbsp;{docNumber}</span>
          </div>
          <div className="col-span-3 flex justify-center">
            <GarudaEmblem sizeCm={3} imageUrl={garudaImageUrl} />
          </div>
          <div className="col-span-5 pb-1 pl-2 leading-[1.35]">
            <div>{agencyName}</div>
            <div className="whitespace-pre-line">{agencyAddress}</div>
          </div>
        </div>

        {/* วัน เดือน ปี (กึ่งกลางหน้ากระดาษ) */}
        <div className="text-center my-4">{docDate}</div>

        {/* เรื่อง */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="whitespace-nowrap">เรื่อง</span>
          <span className="flex-1">{subject}</span>
        </div>

        {/* เรียน */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="whitespace-nowrap">เรียน</span>
          <span className="flex-1">{recipient}</span>
        </div>

        {/* สิ่งที่ส่งมาด้วย */}
        {attachments && (
          <div className="flex items-start gap-3 mb-3">
            <span className="whitespace-nowrap">สิ่งที่ส่งมาด้วย</span>
            <div className="flex-1 whitespace-pre-line">{attachments}</div>
          </div>
        )}

        {/* เนื้อหา 3 ย่อหน้า (ย่อหน้า 2.5 ซม.) */}
        <div className="space-y-2.5 text-justify mt-3">
          {paragraphs.map((p, idx) => (
            <p key={idx} className="thai-indent whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>

        {/* คำลงท้าย & ชื่อผู้ลงนาม */}
        <div className="mt-8 grid grid-cols-12">
          <div className="col-span-5" />
          <div className="col-span-7 text-center leading-[1.4]">
            <div className="mb-10">{template.signOffPhrase || 'ขอแสดงความนับถือ'}</div>
            <div>({signerName || '.............................................'} )</div>
            <div>{signerPosition}</div>
          </div>
        </div>
      </div>

      {/* ส่วนท้ายกระดาษ (กลุ่มงาน โทร ไปรษณีย์อิเล็กทรอนิกส์) */}
      <div className="mt-10 pt-2 text-[15pt] leading-[1.35]">
        {footerUnit && <div>{footerUnit}</div>}
        {footerPhone && <div>โทร. {footerPhone}</div>}
        {footerEmail && <div>ไปรษณีย์อิเล็กทรอนิกส์ : {footerEmail}</div>}
      </div>
    </div>
  );
};

interface AttachmentListPageProps {
  template: FormTemplate;
  fieldValues: Record<string, string>;
  people: PersonRecord[];
}

const AttachmentListPage: React.FC<AttachmentListPageProps> = ({
  template,
  fieldValues,
  people,
}) => {
  const agencyName = resolveTemplateText(
    fieldValues.agencyName || fieldValues.department || '',
    fieldValues,
    people[0],
    template
  );
  const title =
    template.attachmentTitle ||
    'บัญชีรายชื่อนักศึกษาที่ขอตรวจสอบหนังสือสำคัญแสดงวุฒิการศึกษา';

  const rows: PersonRecord[] =
    people.length > 0
      ? people
      : [
          {
            id: 'blank',
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
        ];

  return (
    <div className="a4-sheet a4-sheet-attachment shadow-sm border border-slate-200/80 mx-auto">
      <div className="text-center mb-4 leading-[1.35]">
        <div className="text-[18pt] font-bold">{agencyName}</div>
        <div className="text-[17pt] font-bold">{title}</div>
      </div>

      <table className="w-full border-collapse text-[15pt] leading-[1.35] mb-5">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1.5 text-center w-[7%]">ที่</th>
            <th className="border border-black px-2 py-1.5 text-center w-[15%]">รหัสประจำตัว</th>
            <th className="border border-black px-2 py-1.5 text-center w-[33%]">ชื่อ - นามสกุล</th>
            <th className="border border-black px-2 py-1.5 text-center w-[17%]">วุฒิการศึกษา</th>
            <th className="border border-black px-2 py-1.5 text-center w-[11%]">ปีที่จบ</th>
            <th className="border border-black px-2 py-1.5 text-center w-[17%]">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, idx) => (
            <tr key={p.id || idx}>
              <td className="border border-black px-2 py-1.5 text-center tabular-nums">
                {idx + 1}
              </td>
              <td className="border border-black px-2 py-1.5 text-center tabular-nums">
                {p.studentCode || '-'}
              </td>
              <td className="border border-black px-2 py-1.5">{p.fullName || ''}</td>
              <td className="border border-black px-2 py-1.5 text-center">
                {p.qualification || '-'}
              </td>
              <td className="border border-black px-2 py-1.5 text-center tabular-nums">
                {p.graduationYear || '-'}
              </td>
              <td className="border border-black px-2 py-1.5">{p.note || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-2 pl-4 mb-5 text-[15.5pt]">
        <div className="flex items-center gap-3">
          <span className="inline-block w-4 h-4 border border-black shrink-0" />
          <span>สำเร็จการศึกษาจริง และเป็นวุฒิการศึกษาที่ถูกต้องทุกรายการ จำนวน ............... ราย</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-block w-4 h-4 border border-black shrink-0" />
          <span>เป็นเอกสารที่ไม่ถูกต้อง จำนวน ............... ราย (โปรดระบุรายละเอียดในช่องหมายเหตุ)</span>
        </div>
      </div>

      <div className="mb-8 text-[15.5pt]">ตรวจสอบ และตรวจทานถูกต้องแล้ว</div>

      <div className="grid grid-cols-12 mb-12 text-[15.5pt]">
        <div className="col-span-3" />
        <div className="col-span-9 space-y-6 leading-[1.45]">
          <div>
            <div>(ลงชื่อ) .................................................. นายทะเบียน</div>
            <div className="pl-10">(...............................................)</div>
          </div>
          <div>
            <div>(ลงชื่อ) .................................................. หัวหน้าสถานศึกษา</div>
            <div className="pl-10">(...............................................)</div>
          </div>
        </div>
      </div>

      <div className="text-center text-[15.5pt] mt-8">
        โปรดประทับตราสถานศึกษาด้วยจึงสมบูรณ์
      </div>
    </div>
  );
};

export const OfficialDocumentSheetStack: React.FC<SheetRenderConfig> = ({
  template,
  fieldValues,
  people,
  committeeMembers,
  garudaImageUrl,
  printMode,
  includeCopyStamp,
  includeAttachment,
}) => {
  const effectivePeople = people.length > 0 ? people : [undefined];
  const resolvedCommittee = committeeMembers ?? template.committeeMembers;

  if (printMode === 'individual' && people.length > 0 && !template.isSinglePersonForm) {
    return (
      <div className="space-y-6 print:space-y-0">
        {people.map((person, index) => (
          <React.Fragment key={`${person.id}-${index}`}>
            {template.category === 'memo' ? (
              <MemoPage
                template={template}
                fieldValues={fieldValues}
                person={person}
                committeeMembers={resolvedCommittee}
                garudaImageUrl={garudaImageUrl}
                includeCopyStamp={includeCopyStamp}
              />
            ) : (
              <ExternalLetterPage
                template={template}
                fieldValues={fieldValues}
                person={person}
                garudaImageUrl={garudaImageUrl}
                includeCopyStamp={includeCopyStamp}
              />
            )}
            {includeAttachment && (
              <AttachmentListPage
                template={template}
                fieldValues={fieldValues}
                people={[person]}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Combined mode or single-person form: 1 cover document + optional 1 combined attachment table
  return (
    <div className="space-y-6 print:space-y-0">
      {template.category === 'memo' ? (
        <MemoPage
          template={template}
          fieldValues={fieldValues}
          person={effectivePeople[0]}
          committeeMembers={resolvedCommittee}
          garudaImageUrl={garudaImageUrl}
          includeCopyStamp={includeCopyStamp}
        />
      ) : (
        <ExternalLetterPage
          template={template}
          fieldValues={fieldValues}
          person={effectivePeople[0]}
          garudaImageUrl={garudaImageUrl}
          includeCopyStamp={includeCopyStamp}
        />
      )}
      {includeAttachment && (
        <AttachmentListPage
          template={template}
          fieldValues={fieldValues}
          people={people}
        />
      )}
    </div>
  );
};

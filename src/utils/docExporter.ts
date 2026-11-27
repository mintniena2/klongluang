import { garudaSvgToPngDataUrl } from '../components/GarudaEmblem';
import {
  CommitteeMember,
  FormTemplate,
  PersonRecord,
  PrintMode,
} from '../types/document';
import { formatThaiCitizenId, resolveTemplateText } from './commaParser';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

function buildMemoHtml(
  template: FormTemplate,
  fieldValues: Record<string, string>,
  person: PersonRecord | undefined,
  garudaPng: string,
  includeCopyStamp: boolean,
  committeeMembers?: CommitteeMember[]
): string {
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

  const personInfoBox =
    template.includePersonDetailBox && person
      ? `
      <table style="width:100%; border-collapse:collapse; margin: 10pt 0 12pt 0; font-size:15pt;">
        <tr>
          <td style="border:1pt solid #333; padding:5pt 8pt; width:28%; font-weight:bold; background:#f8fafc;">ชื่อ - นามสกุล</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; width:36%;">${escapeHtml(person.fullName || '-')}</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; width:18%; font-weight:bold; background:#f8fafc;">รหัสประจำตัว</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; width:18%;">${escapeHtml(person.studentCode || '-')}</td>
        </tr>
        <tr>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">เลขประจำตัวประชาชน</td>
          <td style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(formatThaiCitizenId(person.nationalId))}</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">ปีที่จบ</td>
          <td style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(person.graduationYear || '-')}</td>
        </tr>
        <tr>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">วุฒิการศึกษา</td>
          <td style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(person.qualification || '-')}</td>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">สถานศึกษาเดิม</td>
          <td style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(person.previousSchool || '-')}</td>
        </tr>
        <tr>
          <td style="border:1pt solid #333; padding:5pt 8pt; font-weight:bold; background:#f8fafc;">ที่อยู่</td>
          <td colspan="3" style="border:1pt solid #333; padding:5pt 8pt;">${escapeHtml(person.address || '-')}</td>
        </tr>
      </table>`
      : '';

  return `
  <div style="font-family:'TH Sarabun New','Sarabun',sans-serif; font-size:16pt; line-height:1.35; color:#111;">
    ${includeCopyStamp ? '<div style="text-align:center; color:#cc0000; font-size:22pt; font-weight:bold; margin-bottom:4pt;">สำเนา</div>' : ''}
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="width:20%; vertical-align:bottom;">
          ${garudaPng ? `<img src="${garudaPng}" width="54" height="50" />` : ''}
        </td>
        <td style="width:80%; text-align:center; vertical-align:bottom; font-size:29pt; font-weight:bold; padding-right:15%;">
          บันทึกข้อความ
        </td>
      </tr>
    </table>
    <p style="margin:8pt 0 2pt 0;"><b>ส่วนราชการ</b>&nbsp;&nbsp;${escapeHtml(department)}</p>
    <table style="width:100%; border-collapse:collapse; margin-bottom:2pt;">
      <tr>
        <td style="width:52%; padding:0;"><b>ที่</b>&nbsp;&nbsp;${escapeHtml(docNumber)}</td>
        <td style="width:48%; padding:0;"><b>วันที่</b>&nbsp;&nbsp;${escapeHtml(docDate)}</td>
      </tr>
    </table>
    <p style="margin:2pt 0 6pt 0; border-bottom:1pt solid #111; padding-bottom:4pt;"><b>เรื่อง</b>&nbsp;&nbsp;${escapeHtml(subject)}</p>
    <p style="margin:8pt 0 6pt 0;"><b>เรียน</b>&nbsp;&nbsp;${escapeHtml(recipient)}</p>
    ${paragraphs
      .map((p) => {
        const lines = p.split('\n');
        if (lines.length > 1 && /^\d+\./.test(lines[1].trim())) {
          return `<p style="margin:0 0 2pt 0; text-indent:2.5cm;">${escapeHtml(lines[0])}</p>${lines
            .slice(1)
            .map(
              (sub) =>
                `<p style="margin:0 0 2pt 0; padding-left:2.5cm;">${escapeHtml(sub)}</p>`
            )
            .join('')}`;
        }
        return `<p style="margin:0 0 8pt 0; text-indent:2.5cm; text-align:justify;">${escapeHtml(p)}</p>`;
      })
      .join('')}
    ${personInfoBox}
    <table style="width:100%; border-collapse:collapse; margin-top:22pt;">
      <tr>
        <td style="width:45%;"></td>
        <td style="width:55%; text-align:center;">
          ${
            template.omitMainSignatureLine
              ? '<p style="margin:0 0 18pt 0;">&nbsp;</p>'
              : '<p style="margin:0;">(ลงชื่อ).......................................................</p>'
          }
          <p style="margin:4pt 0 0 0;">(${escapeHtml(signerName || '.............................................')})</p>
          <p style="margin:2pt 0 0 0;">${escapeHtml(signerPosition)}</p>
        </td>
      </tr>
    </table>
    ${
      committeeMembers && committeeMembers.length > 0
        ? `<div style="margin-top:16pt; font-size:15pt; line-height:1.3;">
            ${committeeMembers
              .map(
                (m) => `
              <div style="margin-bottom:12pt;">
                <p style="margin:0;">ลงชื่อ......................................................${escapeHtml(m.role)}</p>
                <p style="margin:2pt 0 0 28pt;">(${escapeHtml(m.name || '............................................')})</p>
                <p style="margin:2pt 0 0 42pt;">${escapeHtml(m.position)}</p>
              </div>`
              )
              .join('')}
          </div>`
        : ''
    }
  </div>`;
}

function buildExternalLetterHtml(
  template: FormTemplate,
  fieldValues: Record<string, string>,
  person: PersonRecord | undefined,
  garudaPng: string,
  includeCopyStamp: boolean
): string {
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

  return `
  <div style="font-family:'TH Sarabun New','Sarabun',sans-serif; font-size:16pt; line-height:1.35; color:#111;">
    ${includeCopyStamp ? '<div style="text-align:center; color:#cc0000; font-size:24pt; font-weight:bold; margin-bottom:2pt;">สำเนา</div>' : ''}
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="width:36%; vertical-align:bottom; padding-bottom:4pt;">
          ที่ ${escapeHtml(docNumber)}
        </td>
        <td style="width:28%; text-align:center; vertical-align:top;">
          ${garudaPng ? `<img src="${garudaPng}" width="108" height="100" />` : ''}
        </td>
        <td style="width:36%; vertical-align:bottom; padding-bottom:4pt; padding-left:8pt;">
          ${escapeHtml(agencyName)}<br/>${escapeHtml(agencyAddress)}
        </td>
      </tr>
    </table>
    <p style="text-align:center; margin:10pt 0 10pt 0;">${escapeHtml(docDate)}</p>
    <p style="margin:4pt 0;">เรื่อง&nbsp;&nbsp;${escapeHtml(subject)}</p>
    <p style="margin:4pt 0;">เรียน&nbsp;&nbsp;${escapeHtml(recipient)}</p>
    ${
      attachments
        ? `<table style="width:100%; border-collapse:collapse; margin:4pt 0 8pt 0;">
            <tr>
              <td style="width:19%; vertical-align:top;">สิ่งที่ส่งมาด้วย</td>
              <td style="width:81%; vertical-align:top;">${escapeHtml(attachments)}</td>
            </tr>
          </table>`
        : ''
    }
    ${paragraphs
      .map(
        (p) =>
          `<p style="margin:0 0 8pt 0; text-indent:2.5cm; text-align:justify;">${escapeHtml(p)}</p>`
      )
      .join('')}
    <table style="width:100%; border-collapse:collapse; margin-top:18pt;">
      <tr>
        <td style="width:40%;"></td>
        <td style="width:60%; text-align:center;">
          <p style="margin:0 0 28pt 0;">${escapeHtml(template.signOffPhrase || 'ขอแสดงความนับถือ')}</p>
          <p style="margin:0;">(${escapeHtml(signerName || '.............................................')})</p>
          <p style="margin:2pt 0 0 0;">${escapeHtml(signerPosition)}</p>
        </td>
      </tr>
    </table>
    <div style="margin-top:34pt; font-size:15pt; line-height:1.3;">
      ${footerUnit ? `<div>${escapeHtml(footerUnit)}</div>` : ''}
      ${footerPhone ? `<div>โทร. ${escapeHtml(footerPhone)}</div>` : ''}
      ${footerEmail ? `<div>ไปรษณีย์อิเล็กทรอนิกส์ : ${escapeHtml(footerEmail)}</div>` : ''}
    </div>
  </div>`;
}

function buildAttachmentTableHtml(
  template: FormTemplate,
  fieldValues: Record<string, string>,
  people: PersonRecord[]
): string {
  const agencyName = resolveTemplateText(
    fieldValues.agencyName || fieldValues.department || '',
    fieldValues,
    people[0],
    template
  );
  const title = template.attachmentTitle || 'บัญชีรายชื่อนักศึกษาที่ขอตรวจสอบหนังสือสำคัญแสดงวุฒิการศึกษา';

  const rows = (people.length > 0
    ? people
    : [
        {
          id: 'empty',
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
      ]
  )
    .map(
      (p, idx) => `
      <tr>
        <td style="border:1pt solid #111; padding:4pt 6pt; text-align:center;">${idx + 1}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt; text-align:center;">${escapeHtml(p.studentCode || '-')}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt;">${escapeHtml(p.fullName || '')}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt; text-align:center;">${escapeHtml(p.qualification || '-')}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt; text-align:center;">${escapeHtml(p.graduationYear || '-')}</td>
        <td style="border:1pt solid #111; padding:4pt 6pt;">${escapeHtml(p.note || '')}</td>
      </tr>`
    )
    .join('');

  return `
  <div style="font-family:'TH Sarabun New','Sarabun',sans-serif; font-size:16pt; line-height:1.35; color:#111;">
    <div style="text-align:center; margin-bottom:10pt;">
      <div style="font-size:18pt; font-weight:bold;">${escapeHtml(agencyName)}</div>
      <div style="font-size:17pt; font-weight:bold;">${escapeHtml(title)}</div>
    </div>
    <table style="width:100%; border-collapse:collapse; margin-bottom:14pt; font-size:15pt;">
      <thead>
        <tr>
          <th style="border:1pt solid #111; padding:5pt; width:7%; text-align:center;">ที่</th>
          <th style="border:1pt solid #111; padding:5pt; width:15%; text-align:center;">รหัสประจำตัว</th>
          <th style="border:1pt solid #111; padding:5pt; width:33%; text-align:center;">ชื่อ - นามสกุล</th>
          <th style="border:1pt solid #111; padding:5pt; width:17%; text-align:center;">วุฒิการศึกษา</th>
          <th style="border:1pt solid #111; padding:5pt; width:11%; text-align:center;">ปีที่จบ</th>
          <th style="border:1pt solid #111; padding:5pt; width:17%; text-align:center;">หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p style="margin:6pt 0 4pt 16pt;">☐&nbsp;&nbsp;&nbsp;สำเร็จการศึกษาจริง และเป็นวุฒิการศึกษาที่ถูกต้องทุกรายการ จำนวน .............. ราย</p>
    <p style="margin:4pt 0 14pt 16pt;">☐&nbsp;&nbsp;&nbsp;เป็นเอกสารที่ไม่ถูกต้อง จำนวน .............. ราย (โปรดระบุรายละเอียดในช่องหมายเหตุ)</p>
    <p style="margin:10pt 0 24pt 0;">ตรวจสอบ และตรวจทานถูกต้องแล้ว</p>
    <table style="width:100%; border-collapse:collapse; margin-top:16pt;">
      <tr>
        <td style="width:30%;"></td>
        <td style="width:70%; text-align:left; padding-left:20pt;">
          <p style="margin:0;">(ลงชื่อ) .................................................. นายทะเบียน</p>
          <p style="margin:4pt 0 20pt 28pt;">(...............................................)</p>
          <p style="margin:0;">(ลงชื่อ) .................................................. หัวหน้าสถานศึกษา</p>
          <p style="margin:4pt 0 0 28pt;">(...............................................)</p>
        </td>
      </tr>
    </table>
    <p style="text-align:center; margin-top:30pt;">โปรดประทับตราสถานศึกษาด้วยจึงสมบูรณ์</p>
  </div>`;
}

export async function exportDocumentToDoc(params: {
  template: FormTemplate;
  fieldValues: Record<string, string>;
  people: PersonRecord[];
  committeeMembers?: CommitteeMember[];
  garudaImageUrl?: string;
  printMode: PrintMode;
  includeCopyStamp: boolean;
  includeAttachment: boolean;
}): Promise<void> {
  const {
    template,
    fieldValues,
    people,
    committeeMembers,
    garudaImageUrl,
    printMode,
    includeCopyStamp,
    includeAttachment,
  } = params;
  const resolvedCommittee = committeeMembers ?? template.committeeMembers;
  const garudaPng = await garudaSvgToPngDataUrl(220, garudaImageUrl);

  const pageSections: string[] = [];

  if (printMode === 'individual' && people.length > 0 && !template.isSinglePersonForm) {
    people.forEach((person) => {
      if (template.category === 'memo') {
        pageSections.push(
          buildMemoHtml(
            template,
            fieldValues,
            person,
            garudaPng,
            includeCopyStamp,
            resolvedCommittee
          )
        );
      } else {
        pageSections.push(buildExternalLetterHtml(template, fieldValues, person, garudaPng, includeCopyStamp));
        if (includeAttachment) {
          pageSections.push(buildAttachmentTableHtml(template, fieldValues, [person]));
        }
      }
    });
  } else {
    const firstPerson = people[0];
    if (template.category === 'memo') {
      pageSections.push(
        buildMemoHtml(
          template,
          fieldValues,
          firstPerson,
          garudaPng,
          includeCopyStamp,
          resolvedCommittee
        )
      );
      if (includeAttachment && people.length > 0) {
        pageSections.push(buildAttachmentTableHtml(template, fieldValues, people));
      }
    } else {
      pageSections.push(buildExternalLetterHtml(template, fieldValues, firstPerson, garudaPng, includeCopyStamp));
      if (includeAttachment) {
        pageSections.push(buildAttachmentTableHtml(template, fieldValues, people));
      }
    }
  }

  const joinedPages = pageSections
    .map((html, idx) =>
      idx === 0
        ? html
        : `<br clear="all" style="page-break-before:always" />${html}`
    )
    .join('\n');

  const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(template.shortName)}</title>
<style>
  @page Section1 {
    size: 21cm 29.7cm;
    margin: 1.8cm 2cm 2cm 3cm;
    mso-header-margin: 1cm;
    mso-footer-margin: 1cm;
    mso-paper-source: 0;
  }
  div.Section1 { page: Section1; }
  body { font-family: 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; }
</style>
</head>
<body>
  <div class="Section1">
    ${joinedPages}
  </div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', docHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (template.shortName || 'document').replace(/[^\w\u0E00-\u0E7F-]+/g, '_');
  link.href = url;
  link.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSampleCsv(): void {
  const headers = [
    'รหัสประจำตัว',
    'เลขบัตรประชาชน',
    'ชื่อ-นามสกุล',
    'วุฒิการศึกษา',
    'ปีที่จบ',
    'สถานศึกษาเดิม',
    'ที่อยู่',
    'หมายเหตุ',
  ];
  const sampleRows = [
    [
      '9318',
      '1139900482105',
      'เด็กหญิง ณัฐมน ขันธสิทธิ์',
      'ประถมศึกษา',
      '2567',
      'โรงเรียนวันครู 2502',
      '112/8 หมู่ 4 ตำบลคลองสอง อำเภอคลองหลวง จังหวัดปทุมธานี 12120',
      '',
    ],
    [
      '9319',
      '1103702849123',
      'นาย ธนากร ใจดี',
      'มัธยมศึกษาตอนต้น',
      '2566',
      'โรงเรียนคลองหลวงวิทยาคม',
      '89/12 หมู่ 7 ตำบลคลองสาม อำเภอคลองหลวง จังหวัดปทุมธานี 12120',
      '',
    ],
  ];

  const csvContent =
    '\ufeff' +
    [headers, ...sampleRows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_students_import.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseSpreadsheetText(raw: string): Omit<PersonRecord, 'id' | 'createdAt'>[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const detectDelimiter = (line: string) => {
    if (line.includes('\t')) return '\t';
    return ',';
  };

  const splitCsvLine = (line: string, delimiter: string): string[] => {
    if (delimiter === '\t') {
      return line.split('\t').map((c) => c.trim());
    }
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((l) => splitCsvLine(l, delimiter));

  // Skip header row if first row contains Thai header keywords
  const firstJoined = rows[0].join(' ');
  const hasHeader =
    firstJoined.includes('ชื่อ') ||
    firstJoined.includes('รหัส') ||
    firstJoined.includes('เลขบัตร');

  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .filter((cols) => cols.some((c) => c.length > 0))
    .map((cols) => {
      // Support either 8-column full format or shorter formats
      if (cols.length >= 6) {
        return {
          studentCode: cols[0] || '',
          nationalId: cols[1] || '',
          fullName: cols[2] || '',
          qualification: cols[3] || '',
          graduationYear: cols[4] || '',
          previousSchool: cols[5] || '',
          address: cols[6] || '',
          note: cols[7] || '',
        };
      }
      if (cols.length >= 3) {
        // Assume: studentCode, fullName, qualification / nationalId
        const col1IsCitizen = /^\d{13}$/.test(cols[1].replace(/\D/g, ''));
        return {
          studentCode: cols[0] || '',
          nationalId: col1IsCitizen ? cols[1] : '',
          fullName: col1IsCitizen ? cols[2] || '' : cols[1] || '',
          qualification: col1IsCitizen ? cols[3] || '' : cols[2] || '',
          graduationYear: col1IsCitizen ? cols[4] || '' : cols[3] || '',
          previousSchool: '',
          address: cols[4] || '',
          note: '',
        };
      }
      return {
        studentCode: cols.length === 2 ? cols[0] : '',
        nationalId: '',
        fullName: cols.length === 2 ? cols[1] : cols[0],
        qualification: '',
        graduationYear: '',
        previousSchool: '',
        address: '',
        note: '',
      };
    })
    .filter((item) => item.fullName.trim().length > 0);
}

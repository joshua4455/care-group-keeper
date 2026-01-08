import { AppData, Member, AttendanceRecord, User } from './mockData';
import { assignMemberGroupByDob } from './assignment';

function escapeCSV(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function membersToCSV(data: AppData): string {
  const header = ['id','name','phone','dob','careGroupId'];
  const rows = data.members.map(m => [m.id, m.name, m.phone, m.dob, m.careGroupId].map(escapeCSV).join(','));
  return [header.join(','), ...rows].join('\n');
}

export function attendanceToCSV(data: AppData): string {
  const header = ['id','date','memberId','careGroupId','status','absenceReason'];
  const rows = data.attendance.map(a => [a.id, a.date, a.memberId, a.careGroupId, a.status, a.absenceReason || ''].map(escapeCSV).join(','));
  return [header.join(','), ...rows].join('\n');
}

export function leadersToCSV(data: AppData): string {
  const header = ['id','name','role','careGroupId'];
  const rows = data.users.filter(u => u.role === 'leader').map(u => [u.id, u.name, u.role, u.careGroupId || ''].map(escapeCSV).join(','));
  return [header.join(','), ...rows].join('\n');
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Import members CSV: headers can be (name, phone, dob) or (Name, Phone, DOB) - case-insensitive
// Returns array of Members (without ids), we will assign group by dob and generate ids in caller
export function parseMembersCSV(text: string): Array<{ name: string; phone: string; dob: string; }> {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = false; }
        } else { current += ch; }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { result.push(current); current = ''; }
        else current += ch;
      }
    }
    result.push(current);
    return result.map(s => s.trim());
  };

  const headerCols = parseLine(lines[0]).map(h => h.toLowerCase());
  const idxName = headerCols.indexOf('name');
  const idxPhone = headerCols.indexOf('phone');
  const idxDob = headerCols.indexOf('dob');
  const hasHeader = idxName >= 0 && idxPhone >= 0 && idxDob >= 0;

  const start = hasHeader ? 1 : 0;
  const records: Array<{ name: string; phone: string; dob: string; }> = [];
  for (let i = start; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    let name: string, phone: string, dob: string;
    if (hasHeader) {
      name = cols[idxName] || '';
      phone = cols[idxPhone] || '';
      dob = cols[idxDob] || '';
    } else {
      [name, phone, dob] = [cols[0] || '', cols[1] || '', cols[2] || ''];
    }
    if (!name || !phone || !dob) continue;
    records.push({ name, phone, dob });
  }
  return records;
}

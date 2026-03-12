import * as XLSX from 'xlsx';
import { AuditFinding } from '../types';

export function exportToExcel(findings: AuditFinding[], fileName: string = 'Audit_Findings.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(findings.map(f => ({
    'No.': f.no,
    'Problem': f.problem,
    'Category': f.category,
    'Area': f.area,
    'PIC': f.pic,
    'Root Cause': f.rootCause,
    'Action': f.action,
    'Due Date': f.dueDate
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Findings');

  // Generate buffer and download
  XLSX.writeFile(workbook, fileName);
}

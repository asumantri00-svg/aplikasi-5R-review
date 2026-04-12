import * as XLSX from 'xlsx';
import { AuditFinding, AISummary } from '../types';

export function exportToExcel(result: AISummary, fileName: string = 'Audit_Findings.xlsx') {
  const workbook = XLSX.utils.book_new();

  // 1. Findings Sheet
  const findingsSheet = XLSX.utils.json_to_sheet(result.findings.map(f => ({
    'No.': f.no,
    'Problem': f.problem,
    'Category': f.category,
    'Area': f.area,
    'PIC': f.pic || '-',
    'Root Cause': f.rootCause,
    'Action': f.action,
    'Due Date': f.dueDate
  })));
  XLSX.utils.book_append_sheet(workbook, findingsSheet, 'Findings');

  // 2. Summary & Insights Sheet
  const summaryData = [
    ['Ringkasan Eksekutif'],
    [result.summaryText],
    [''],
    ['Rekomendasi / Wawasan'],
    ...result.suggestions.map(s => [s])
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Generate buffer and download
  XLSX.writeFile(workbook, fileName);
}

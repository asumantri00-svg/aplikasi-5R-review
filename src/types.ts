export interface AuditFinding {
  no: string;
  problem: string;
  category: string;
  area: string;
  pic: string;
  rootCause: string;
  action: string;
  dueDate: string;
}

export interface AISummary {
  findings: AuditFinding[];
  summaryText: string;
  categoryDistribution: { name: string; value: number }[];
  areaDistribution: { name: string; value: number }[];
  picDistribution: { name: string; value: number }[];
  suggestions: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const AUDIT_TABLE_HEADERS = [
  "No.",
  "Problem",
  "Category",
  "Area",
  "PIC",
  "Root Cause",
  "Action",
  "Due Date",
];

import { AISummary, ChatMessage, AuditFilePart } from "../types";

export async function analyzeAuditFiles(parts: AuditFilePart[]): Promise<AISummary> {
  console.log("Starting local audit analysis (No AI)");
  
  let allText = "";
  parts.forEach(part => {
    if ('text' in part) {
      allText += part.text + "\n";
    }
  });

  const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const findings: any[] = [];
  
  // Simple heuristic to find audit findings
  // Look for lines that contain keywords or look like table rows
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes('problem') || 
      lowerLine.includes('temuan') || 
      lowerLine.includes('masalah') ||
      /^\d+[\s.]/.test(line) // Starts with a number
    ) {
      // Try to extract some info
      findings.push({
        no: (findings.length + 1).toString(),
        problem: line.substring(0, 100),
        category: lowerLine.includes('5r') ? '5R' : 'Umum',
        area: 'Area Terdeteksi',
        pic: 'PIC Terdeteksi',
        rootCause: 'Analisis manual diperlukan',
        action: 'Tindak lanjut manual',
        dueDate: new Date().toLocaleDateString()
      });
    }
  });

  // If no findings found, create a placeholder
  if (findings.length === 0 && allText.length > 0) {
    findings.push({
      no: "1",
      problem: "Dokumen berhasil dibaca namun format temuan tidak terdeteksi otomatis.",
      category: "Info",
      area: "N/A",
      pic: "N/A",
      rootCause: "Format tidak standar",
      action: "Tinjau dokumen secara manual",
      dueDate: "-"
    });
  }

  const categoryMap: Record<string, number> = {};
  const areaMap: Record<string, number> = {};
  const picMap: Record<string, number> = {};

  findings.forEach(f => {
    categoryMap[f.category] = (categoryMap[f.category] || 0) + 1;
    areaMap[f.area] = (areaMap[f.area] || 0) + 1;
    picMap[f.pic] = (picMap[f.pic] || 0) + 1;
  });

  const summaryText = `Analisis lokal selesai. Berhasil mendeteksi ${findings.length} baris yang berpotensi sebagai temuan audit dari total ${lines.length} baris teks. Dokumen berisi informasi tentang audit 5R dan memerlukan tinjauan manual untuk detail lebih lanjut.`;

  return {
    findings,
    summaryText,
    suggestions: [
      "Tinjau kembali daftar temuan di atas untuk akurasi.",
      "Gunakan fitur ekspor untuk mengolah data lebih lanjut di Excel.",
      "Pastikan format dokumen menggunakan tabel standar untuk hasil pembacaan yang lebih baik."
    ],
    categoryDistribution: Object.entries(categoryMap).map(([name, value]) => ({ name, value })),
    areaDistribution: Object.entries(areaMap).map(([name, value]) => ({ name, value })),
    picDistribution: Object.entries(picMap).map(([name, value]) => ({ name, value }))
  };
}

export async function chatWithAuditData(history: ChatMessage[], findings: any[]): Promise<string> {
  return "Fitur chat dinonaktifkan karena penggunaan AI telah dihapus. Silakan tinjau data di dashboard.";
}

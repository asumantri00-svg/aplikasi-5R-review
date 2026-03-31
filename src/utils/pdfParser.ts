import * as pdfjsLib from 'pdfjs-dist';

// Use the library's own version to ensure worker and API match
const PDFJS_VERSION = pdfjsLib.version;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useSystemFonts: true,
      isEvalSupported: false
    });
    
    const pdf = await loadingTask.promise;
    console.log(`PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      } catch (pageErr) {
        console.error(`Error extracting text from page ${i}:`, pageErr);
        fullText += `--- Page ${i} (Error extracting text) ---\n\n`;
      }
    }
    
    if (fullText.trim().length < 10) {
      console.warn("Extracted text is very short. This might be a scanned PDF or image-based.");
    }
    
    return fullText;
  } catch (error) {
    console.error("Error in extractTextFromPdf:", error);
    throw new Error("Gagal membaca file PDF. Pastikan file tidak terenkripsi atau rusak.");
  }
}

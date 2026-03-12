import JSZip from 'jszip';

export async function extractTextFromPptx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
  
  // Sort slides numerically
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)![0]);
    const numB = parseInt(b.match(/\d+/)![0]);
    return numA - numB;
  });

  let fullText = '';
  const parser = new DOMParser();

  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async('text');
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    const textNodes = xmlDoc.getElementsByTagName('a:t');
    
    let slideText = `--- Slide ${slideFile.match(/\d+/)![0]} ---\n`;
    for (let i = 0; i < textNodes.length; i++) {
      slideText += textNodes[i].textContent + ' ';
    }
    fullText += slideText + '\n\n';
  }

  return fullText;
}

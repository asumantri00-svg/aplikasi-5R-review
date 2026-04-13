import { GoogleGenAI, Type } from "@google/genai";
import { AISummary, ChatMessage, AuditFilePart } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeAuditFiles(parts: AuditFilePart[]): Promise<AISummary> {
  console.log("Analyzing audit files with Gemini (Data Only Mode)...");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `Extract audit findings from the provided documents. Focus strictly on the data.
            
            Fields to extract for each finding:
            - no: Finding number
            - problem: Description of the issue
            - category: 5R category (R1-R5)
            - area: Location
            - pic: Person in charge
            - rootCause: Underlying cause
            - action: Corrective/preventive actions
            - dueDate: Deadline
            
            Return ONLY the findings in JSON format.`
          },
          ...parts.map(part => {
            if ('inlineData' in part) {
              return {
                inlineData: {
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType
                }
              };
            } else {
              return { text: part.text };
            }
          })
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  no: { type: Type.STRING },
                  problem: { type: Type.STRING },
                  category: { type: Type.STRING },
                  area: { type: Type.STRING },
                  pic: { type: Type.STRING },
                  rootCause: { type: Type.STRING },
                  action: { type: Type.STRING },
                  dueDate: { type: Type.STRING }
                },
                required: ["no", "problem", "category", "area", "pic", "rootCause", "action", "dueDate"]
              }
            }
          },
          required: ["findings"]
        }
      }
    });

    const result = JSON.parse(response.text);

    // Calculate distributions for charts
    const categoryMap: Record<string, number> = {};
    const areaMap: Record<string, number> = {};
    const picMap: Record<string, number> = {};

    result.findings.forEach((f: any) => {
      const cat = f.category || 'Lainnya';
      const area = f.area || 'N/A';
      const pic = f.pic || 'N/A';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      areaMap[area] = (areaMap[area] || 0) + 1;
      picMap[pic] = (picMap[pic] || 0) + 1;
    });

    return {
      findings: result.findings,
      summaryText: `Berhasil mengekstrak ${result.findings.length} temuan audit.`,
      suggestions: [],
      categoryDistribution: Object.entries(categoryMap).map(([name, value]) => ({ name, value })),
      areaDistribution: Object.entries(areaMap).map(([name, value]) => ({ name, value })),
      picDistribution: Object.entries(picMap).map(([name, value]) => ({ name, value }))
    };
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function chatWithAuditData(history: ChatMessage[], findings: any[]): Promise<string> {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are an Audit 5R assistant. You have access to the following audit findings:
          ${JSON.stringify(findings, null, 2)}
          
          Answer the user's questions based on this data.`
      },
      history: history.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }))
    });

    const lastMsg = history[history.length - 1];
    const response = await chat.sendMessage({
      message: lastMsg.text
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Maaf, terjadi kesalahan saat memproses pertanyaan Anda.";
  }
}

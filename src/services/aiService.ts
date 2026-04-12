import { GoogleGenAI, Type } from "@google/genai";
import { AISummary, ChatMessage, AuditFilePart } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeAuditFiles(parts: AuditFilePart[]): Promise<AISummary> {
  console.log("Analyzing audit files with Gemini...");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            text: `You are an expert Audit 5R Analyst. Your task is to extract audit findings from the provided documents (text or images).
            
            Extract the following fields for each finding:
            - no: The finding number
            - problem: Description of the issue
            - category: 5R category (R1, R2, R3, R4, R5) or similar
            - area: Location where the finding was found
            - pic: Person in charge
            - rootCause: The underlying cause of the problem
            - action: Corrective and preventive actions
            - dueDate: Deadline for completion
            
            Also provide:
            - summaryText: A brief executive summary of the audit results.
            - suggestions: 3 actionable suggestions based on the findings.
            
            Return the data in JSON format.`
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
            },
            summaryText: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["findings", "summaryText", "suggestions"]
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
      ...result,
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

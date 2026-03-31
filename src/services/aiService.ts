import { GoogleGenAI, Type } from "@google/genai";
import { AISummary, ChatMessage, AuditFilePart } from "../types";

let genAIInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY1 || 
                   import.meta.env.VITE_GEMINI_API_KEY1 || 
                   process.env.GEMINI_API_KEY || 
                   import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      throw new Error("API Key Gemini tidak ditemukan. Silakan konfigurasi GEMINI_API_KEY di Secrets.");
    }
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

export async function analyzeAuditFiles(parts: AuditFilePart[]): Promise<AISummary> {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";
  
  console.log("Starting audit analysis with Gemini model:", model);
  
  const prompt = `
    Ekstrak data audit 5R dari dokumen ini secara cepat dan akurat.
    
    Output (Bahasa Indonesia):
    1. findings: Daftar lengkap temuan (No, Problem, Category, Area, PIC, Root Cause, Action, Due Date).
    2. summaryText: Ringkasan singkat keadaan audit (1 paragraf).
    3. suggestions: Berikan wawasan dan saran perbaikan dalam SATU paragraf padat (masukkan sebagai elemen pertama dalam array).
    4. categoryDistribution, areaDistribution, picDistribution: Statistik jumlah temuan.

    PENTING: Ekstrak SEMUA temuan tanpa kecuali. Jangan ada data terlewat.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [...parts.map(p => {
        if ('text' in p) return { text: p.text };
        return { inlineData: p.inlineData };
      }), { text: prompt }] }],
      config: {
        maxOutputTokens: 8192,
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
                  dueDate: { type: Type.STRING },
                },
                required: ["no", "problem", "category", "area", "pic", "rootCause", "action", "dueDate"]
              }
            },
            summaryText: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            categoryDistribution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                },
                required: ["name", "value"]
              }
            },
            areaDistribution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                },
                required: ["name", "value"]
              }
            },
            picDistribution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                },
                required: ["name", "value"]
              }
            }
          },
          required: ["findings", "summaryText", "suggestions", "categoryDistribution", "areaDistribution", "picDistribution"]
        }
      }
    });

    console.log("Gemini Analysis successful");
    const data = JSON.parse(response.text || "{}");
    return data as AISummary;
  } catch (error) {
    console.error("Error in analyzeAuditFiles (Gemini):", error);
    throw error;
  }
}

export async function chatWithAuditData(history: ChatMessage[], findings: any[]): Promise<string> {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";
  
  console.log("Starting chat with Gemini model:", model);
  
  try {
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: `Anda adalah Asisten Audit 5R. Jawablah pertanyaan pengguna berdasarkan data temuan berikut: ${JSON.stringify(findings)}. Selalu jawab dalam Bahasa Indonesia yang profesional, singkat, dan jelas.`,
      },
    });

    const lastMessage = history[history.length - 1].text;
    const response = await chat.sendMessage({ message: lastMessage });
    
    return response.text || "Mohon maaf, saya tidak dapat memproses permintaan tersebut.";
  } catch (error) {
    console.error("Error in chatWithAuditData (Gemini):", error);
    throw error;
  }
}

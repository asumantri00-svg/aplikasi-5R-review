import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { AISummary, ChatMessage, AuditFilePart } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY1 || 
                   import.meta.env.VITE_GEMINI_API_KEY1 || 
                   process.env.GEMINI_API_KEY || 
                   import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      throw new Error("API Key Gemini tidak ditemukan. Silakan konfigurasi GEMINI_API_KEY1 atau GEMINI_API_KEY di Secrets.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeAuditFiles(parts: AuditFilePart[]): Promise<AISummary> {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";
  
  console.log("Starting audit analysis with model:", model);
  
  const prompt = `
    Extract ALL audit findings from the attached documents without exception. 
    It is critical that no data is missed.
    
    Headers to extract: No., Problem, Category, Area, PIC, Root Cause, Action, Due Date.
    
    Provide the response in the following structure:
    1. findings: A complete list of every single finding found in the documents.
    2. summaryText: A single paragraph of exactly 5 lines summarizing the overall state and trends in Indonesian.
    3. suggestions: 3-5 specific bullet point insights/suggestions for improvement in Indonesian.
    4. categoryDistribution: Count of findings per category.
    5. areaDistribution: Count of findings per area.
    6. picDistribution: Count of findings per PIC.

    IMPORTANT: 
    - Do not summarize the findings list; extract each one individually.
    - All descriptive text (summary and suggestions) MUST be in Indonesian.
    - If there are many findings, ensure the list is exhaustive.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [...parts, { text: prompt }] }],
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
                }
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
                }
              }
            },
            areaDistribution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                }
              }
            },
            picDistribution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                }
              }
            }
          },
          required: ["findings", "summaryText", "suggestions", "categoryDistribution", "areaDistribution", "picDistribution"]
        }
      }
    });

    console.log("Analysis successful");
    const data = JSON.parse(response.text || "{}");
    return data as AISummary;
  } catch (error) {
    console.error("Error in analyzeAuditFiles:", error);
    throw error;
  }
}

export async function chatWithAuditData(history: ChatMessage[], findings: any[]): Promise<string> {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";
  
  console.log("Starting chat with model:", model);
  
  try {
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: `Anda adalah Asisten Audit 5R. Jawablah pertanyaan pengguna berdasarkan data temuan berikut: ${JSON.stringify(findings)}. Selalu jawab dalam Bahasa Indonesia yang profesional, singkat, dan jelas.`,
      },
    });

    const lastMessage = history[history.length - 1].text;
    const response = await chat.sendMessage({ message: lastMessage });
    
    return response.text || "I'm sorry, I couldn't process that.";
  } catch (error) {
    console.error("Error in chatWithAuditData:", error);
    throw error;
  }
}

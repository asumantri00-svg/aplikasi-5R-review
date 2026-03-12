import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { AISummary, ChatMessage, AuditFilePart } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeAuditFiles(parts: AuditFilePart[]): Promise<AISummary> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Quickly extract audit findings from the attached documents.
    Headers: No., Problem, Category, Area, PIC, Root Cause, Action, Due Date.
    
    Provide:
    1. List of findings.
    2. Short 2-sentence summary.
    3. Category count.
    4. Area count.
    5. PIC count.
    6. 3 quick insights.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [...parts, { text: prompt }] }],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
          },
          suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["findings", "summaryText", "categoryDistribution", "areaDistribution", "picDistribution", "suggestions"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as AISummary;
}

export async function chatWithAuditData(history: ChatMessage[], findings: any[]): Promise<string> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  
  const chat = ai.chats.create({
    model,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: `You are an Audit Assistant. Answer based on: ${JSON.stringify(findings)}. Be very brief.`,
    },
  });

  const lastMessage = history[history.length - 1].text;
  const response = await chat.sendMessage({ message: lastMessage });
  
  return response.text || "I'm sorry, I couldn't process that.";
}

import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { AISummary, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeAuditFiles(files: { data: string; mimeType: string }[]): Promise<AISummary> {
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

  const parts = files.map(f => ({
    inlineData: {
      data: f.data.split(',')[1],
      mimeType: f.mimeType
    }
  }));

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

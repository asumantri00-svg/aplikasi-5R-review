import OpenAI from "openai";
import { AISummary, ChatMessage, AuditFilePart } from "../types";

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey || apiKey === 'MY_OPENAI_API_KEY') {
      throw new Error("API Key OpenAI tidak ditemukan. Silakan konfigurasi OPENAI_API_KEY di Secrets.");
    }
    openaiInstance = new OpenAI({ 
      apiKey,
      dangerouslyAllowBrowser: true 
    });
  }
  return openaiInstance;
}

export async function analyzeAuditFiles(parts: AuditFilePart[]): Promise<AISummary> {
  const openai = getOpenAI();
  const model = "gpt-4o-2024-08-06";
  
  console.log("Starting audit analysis with OpenAI model:", model);
  
  const prompt = `
    Anda adalah ahli analisis audit 5R (Ringkas, Rapi, Resik, Rawat, Rajin).
    Tugas Anda adalah mengekstrak SEMUA temuan audit dari dokumen yang dilampirkan tanpa terkecuali. 
    Sangat penting bahwa tidak ada data yang terlewatkan.
    
    Header yang harus diekstrak: No., Problem, Category, Area, PIC, Root Cause, Action, Due Date.
    
    Berikan respons dalam struktur berikut (Bahasa Indonesia):
    1. findings: Daftar lengkap setiap temuan yang ditemukan dalam dokumen.
    2. summaryText: Satu paragraf tepat 5 baris yang merangkum keadaan keseluruhan dan tren dalam Bahasa Indonesia.
    3. suggestions: 3-5 wawasan/saran perbaikan spesifik dalam Bahasa Indonesia.
    4. categoryDistribution: Jumlah temuan per kategori.
    5. areaDistribution: Jumlah temuan per area.
    6. picDistribution: Jumlah temuan per PIC.

    PENTING: 
    - Jangan meringkas daftar temuan; ekstrak setiap temuan satu per satu.
    - Semua teks deskriptif (ringkasan dan saran) HARUS dalam Bahasa Indonesia.
    - Jika ada banyak temuan, pastikan daftar tersebut lengkap.
    - Jika data tidak ditemukan, berikan array kosong untuk findings, bukan error.
  `;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are an expert audit analyzer. You extract data from documents and provide structured summaries in Indonesian."
    },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        ...parts.map(part => {
          if ('text' in part) {
            return { type: "text" as const, text: part.text };
          } else {
            // OpenAI doesn't support PDF directly in Chat Completions.
            // We should have extracted text or converted to images.
            // For now, we'll just skip or send a placeholder if it's not an image.
            if (part.inlineData.mimeType.startsWith('image/')) {
              return {
                type: "image_url" as const,
                image_url: {
                  url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                }
              };
            }
            return { type: "text" as const, text: `[File content skipped: ${part.inlineData.mimeType} is not supported directly by OpenAI Chat API. Please extract text first.]` };
          }
        })
      ]
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "audit_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    no: { type: "string" },
                    problem: { type: "string" },
                    category: { type: "string" },
                    area: { type: "string" },
                    pic: { type: "string" },
                    rootCause: { type: "string" },
                    action: { type: "string" },
                    dueDate: { type: "string" },
                  },
                  required: ["no", "problem", "category", "area", "pic", "rootCause", "action", "dueDate"],
                  additionalProperties: false
                }
              },
              summaryText: { type: "string" },
              suggestions: {
                type: "array",
                items: { type: "string" }
              },
              categoryDistribution: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    value: { type: "number" }
                  },
                  required: ["name", "value"],
                  additionalProperties: false
                }
              },
              areaDistribution: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    value: { type: "number" }
                  },
                  required: ["name", "value"],
                  additionalProperties: false
                }
              },
              picDistribution: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    value: { type: "number" }
                  },
                  required: ["name", "value"],
                  additionalProperties: false
                }
              }
            },
            required: ["findings", "summaryText", "suggestions", "categoryDistribution", "areaDistribution", "picDistribution"],
            additionalProperties: false
          }
        }
      }
    });

    console.log("OpenAI Analysis successful");
    const content = response.choices[0].message.content;
    if (!content) throw new Error("Failed to get content from OpenAI response");
    const data = JSON.parse(content);
    return data as AISummary;
  } catch (error) {
    console.error("Error in analyzeAuditFiles (OpenAI):", error);
    throw error;
  }
}

export async function chatWithAuditData(history: ChatMessage[], findings: any[]): Promise<string> {
  const openai = getOpenAI();
  const model = "gpt-4o";
  
  console.log("Starting chat with OpenAI model:", model);
  
  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `Anda adalah Asisten Audit 5R. Jawablah pertanyaan pengguna berdasarkan data temuan berikut: ${JSON.stringify(findings)}. Selalu jawab dalam Bahasa Indonesia yang profesional, singkat, dan jelas.`
      },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text
      }))
    ];

    const response = await openai.chat.completions.create({
      model,
      messages,
    });
    
    return response.choices[0].message.content || "I'm sorry, I couldn't process that.";
  } catch (error) {
    console.error("Error in chatWithAuditData (OpenAI):", error);
    throw error;
  }
}

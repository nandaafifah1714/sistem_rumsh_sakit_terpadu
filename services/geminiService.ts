import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AgentType, IntentResponse, GroundingSource } from "../types";

// Safe access to API Key to prevent crash if process is undefined
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to validate if API Key is present
export const checkApiKey = () => !!apiKey;

/**
 * Stage 1: The Coordinator
 * Analyzes intent and delegates to a sub-agent.
 */
export const coordinateRequest = async (userQuery: string): Promise<IntentResponse> => {
  const model = "gemini-2.5-flash";
  
  const systemInstruction = `
    Anda adalah Manajer Permintaan Sistem Rumah Sakit.
    Tugas Anda: Analisis kueri pengguna dan tentukan sub-agen mana yang harus menanganinya.
    
    Sub-agen tersedia:
    1. AIP (Asisten Informasi Pasien): Pertanyaan umum pasien, gejala, kebijakan RS.
    2. PDM (Pembuat Dokumen Medis): Permintaan pembuatan dokumen formal (surat, laporan).
    3. PAVM (Penghasil Alat Bantu Visual Medis): Permintaan gambar, diagram, ilustrasi.
    4. APK (Asisten Penelitian Klinis): Riset mendalam, studi klinis, jurnal medis.

    Output JSON saja.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      agent: {
        type: Type.STRING,
        enum: [AgentType.AIP, AgentType.PDM, AgentType.PAVM, AgentType.APK],
        description: "Agen yang dipilih untuk menangani permintaan."
      },
      reasoning: {
        type: Type.STRING,
        description: "Alasan singkat mengapa agen ini dipilih."
      },
      refinedPrompt: {
        type: Type.STRING,
        description: "Prompt yang disempurnakan untuk sub-agen agar dapat bekerja maksimal."
      }
    },
    required: ["agent", "reasoning", "refinedPrompt"]
  };

  try {
    const result = await ai.models.generateContent({
      model,
      contents: userQuery,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1, // Low temp for deterministic routing
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from Coordinator");
    
    return JSON.parse(text) as IntentResponse;
  } catch (error) {
    console.error("Coordinator Error:", error);
    // Fallback to AIP if coordination fails
    return {
      agent: AgentType.AIP,
      reasoning: "Gagal menentukan agen, mengalihkan ke bantuan umum.",
      refinedPrompt: userQuery
    };
  }
};

/**
 * Stage 2: The Agent Execution
 */
export const executeAgent = async (
  agent: AgentType, 
  prompt: string
): Promise<{ text: string; imageUrl?: string; groundingSources?: GroundingSource[] }> => {
  
  // 1. Image Generation Agent (PAVM)
  if (agent === AgentType.PAVM) {
    try {
      // Using gemini-2.5-flash-image for generation as per guide
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: prompt }]
        },
        config: {
            imageConfig: {
                aspectRatio: "1:1",
                // imageSize not supported on 2.5 flash image, strictly 1024x1024 usually
            }
        }
      });
      
      let imageUrl: string | undefined;
      let text = "Berikut adalah visualisasi yang Anda minta.";

      if (result.candidates && result.candidates[0].content.parts) {
        for (const part of result.candidates[0].content.parts) {
            if (part.inlineData) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            } else if (part.text) {
                text = part.text;
            }
        }
      }
      
      if (!imageUrl) {
        throw new Error("Gambar tidak berhasil dibuat.");
      }

      return { text, imageUrl };
    } catch (e) {
      console.error("PAVM Error:", e);
      return { text: "Maaf, sistem gagal membuat gambar saat ini. Silakan coba lagi dengan deskripsi yang berbeda." };
    }
  }

  // 2. Text/Search Agents (AIP, APK, PDM)
  const model = "gemini-2.5-flash";
  let tools = [];
  let systemInstruction = "";

  if (agent === AgentType.AIP) {
    tools = [{ googleSearch: {} }];
    systemInstruction = "Anda adalah AIP (Asisten Informasi Pasien). Berikan jawaban yang jelas, ringkas, empatik, dan mudah dipahami oleh pasien awam. Hindari jargon medis yang terlalu rumit tanpa penjelasan. Gunakan Google Search untuk memastikan akurasi informasi terkini.";
  } else if (agent === AgentType.APK) {
    tools = [{ googleSearch: {} }];
    systemInstruction = "Anda adalah APK (Asisten Penelitian Klinis). Berikan jawaban mendalam, berbasis bukti (evidence-based), dan teknis yang ditujukan untuk profesional medis. Kutip studi atau pedoman jika relevan. Gunakan Google Search untuk mencari jurnal atau protokol terbaru.";
  } else if (agent === AgentType.PDM) {
    // PDM generates documents, no search needed usually, focus on structure
    systemInstruction = "Anda adalah PDM (Pembuat Dokumen Medis). Hasilkan output dalam format Markdown yang sangat terstruktur sehingga terlihat seperti dokumen profesional. Sertakan header, tanggal, info pasien (placeholder jika tidak ada), dan isi dokumen yang formal. Jangan banyak bicara di luar konteks dokumen.";
  }

  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: tools.length > 0 ? tools : undefined,
        systemInstruction,
      }
    });

    // Extract grounding metadata if available (for AIP/APK)
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const groundingSources: GroundingSource[] = [];
    
    if (groundingChunks) {
        groundingChunks.forEach((chunk: any) => {
            if (chunk.web) {
                groundingSources.push({ uri: chunk.web.uri, title: chunk.web.title });
            }
        });
    }

    return { 
        text: result.text || "Maaf, tidak ada respons yang dihasilkan.",
        groundingSources: groundingSources.length > 0 ? groundingSources : undefined
    };

  } catch (error) {
    console.error(`Agent ${agent} Error:`, error);
    return { text: "Terjadi kesalahan saat memproses permintaan Anda dengan agen ini." };
  }
};
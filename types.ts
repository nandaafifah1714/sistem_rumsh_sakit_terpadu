export enum AgentType {
  COORDINATOR = 'COORDINATOR',
  AIP = 'AIP', // Asisten Informasi Pasien
  PDM = 'PDM', // Pembuat Dokumen Medis
  PAVM = 'PAVM', // Penghasil Alat Bantu Visual Medis
  APK = 'APK', // Asisten Penelitian Klinis
}

export interface AgentDef {
  id: AgentType;
  name: string;
  fullName: string;
  description: string;
  color: string;
  icon: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  agent?: AgentType; // The agent that produced this message
  timestamp: number;
  imageUrl?: string; // For PAVM output
  isThinking?: boolean;
  groundingSources?: GroundingSource[];
}

export interface IntentResponse {
  agent: AgentType;
  reasoning: string;
  refinedPrompt: string;
}
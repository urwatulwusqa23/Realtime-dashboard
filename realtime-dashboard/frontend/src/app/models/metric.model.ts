export interface MetricSnapshot {
  name: string;           // revenue | orders | users | conversion
  value: number;
  category: string;
  recordedAt: string;
  changePercent: number;
}

export interface MetricHistory {
  value: number;
  recordedAt: string;
  category: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}

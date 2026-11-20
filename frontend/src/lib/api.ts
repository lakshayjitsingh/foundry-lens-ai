import {
  AgentChatResponse,
  AgentChatResponseSchema,
  AuditResponse,
  AuditResponseSchema,
  FileExtractResponse,
  HealthResponse,
  HealthResponseSchema,
  SampleDocument,
  SampleDocumentSchema,
} from '../types/audit';
import { z } from 'zod';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (typeof data?.detail?.message === 'string') return data.detail.message;
    return `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const json = await res.json();
  return HealthResponseSchema.parse(json);
}

export async function fetchSamples(): Promise<SampleDocument[]> {
  const res = await fetch(`${API_BASE}/api/samples`);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const json = await res.json();
  return z.object({ samples: z.array(SampleDocumentSchema) }).parse(json).samples;
}

export async function uploadDocumentFile(file: File): Promise<FileExtractResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/extract-file`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return (await res.json()) as FileExtractResponse;
}

export async function runDocumentAudit(params: {
  document_text: string;
  image_data_url: string | null;
  filename: string;
  model: string;
  temperature: number;
  privacy_shield: boolean;
}): Promise<AuditResponse> {
  const res = await fetch(`${API_BASE}/api/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const json = await res.json();
  return AuditResponseSchema.parse(json);
}

export async function sendAgentQuestion(params: {
  question: string;
  document_text: string;
  extracted: AuditResponse['extracted'];
  math_audit: AuditResponse['math_audit'];
  pii_audit: AuditResponse['pii_audit'];
  model: string;
  temperature: number;
}): Promise<AgentChatResponse> {
  const res = await fetch(`${API_BASE}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  const json = await res.json();
  return AgentChatResponseSchema.parse(json);
}

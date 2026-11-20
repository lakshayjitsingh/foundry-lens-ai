import { z } from 'zod';

export const FoundryModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  supports_vision: z.boolean(),
  supports_tools: z.boolean(),
  summary: z.string(),
});

export const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  version: z.string(),
  sdk: z.string(),
  mode: z.string(),
  provider_label: z.string(),
  live_inference: z.boolean(),
  default_model: z.string(),
  models: z.array(FoundryModelSchema),
});

export const SampleDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  badge: z.string(),
  description: z.string(),
  text: z.string(),
});

export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().optional().default(1),
  amount: z.number(),
});

export const KeyDateSchema = z.object({
  label: z.string(),
  date: z.string(),
});

export const ExtractedDocumentSchema = z.object({
  document_type: z.string().default('General Document'),
  issuer: z.string().default('Unknown Issuer'),
  document_date: z.string().default('N/A'),
  reference_id: z.string().default('N/A'),
  currency: z.string().default('N/A'),
  line_items: z.array(LineItemSchema).default([]),
  subtotal: z.number().nullable().optional().default(null),
  tax: z.number().nullable().optional().default(null),
  stated_total: z.number().nullable().optional().default(null),
  key_dates: z.array(KeyDateSchema).default([]),
  key_requirements: z.array(z.string()).default([]),
  plain_language_summary: z.string().default(''),
  citations: z.array(z.string()).default([]),
  confidence: z.number().default(0.9),
});

export const MathAuditSchema = z.object({
  tool_name: z.string(),
  status: z.enum(['verified', 'discrepancy_detected', 'partial', 'not_applicable']),
  computed_subtotal: z.number().nullable(),
  tax: z.number().nullable(),
  computed_total: z.number().nullable(),
  stated_total: z.number().nullable(),
  difference: z.number(),
  currency: z.string(),
  verdict: z.string(),
});

export const PiiFindingSchema = z.object({
  category: z.string(),
  token: z.string(),
  count: z.number(),
  masked_samples: z.array(z.string()),
});

export const PiiAuditSchema = z.object({
  total_redacted: z.number(),
  findings: z.array(PiiFindingSchema),
});

export const SafetyAuditSchema = z.object({
  safe: z.boolean(),
  blocked: z.boolean(),
  prompt_injection_detected: z.boolean(),
  risk_level: z.string(),
  flagged_categories: z.array(z.string()),
  reason: z.string(),
});

export const ResponsibleAiPillarSchema = z.object({
  principle: z.string(),
  status: z.enum(['pass', 'warn', 'flag']),
  detail: z.string(),
});

export const AuditResponseSchema = z.object({
  audit_id: z.string(),
  audited_at: z.string(),
  filename: z.string(),
  privacy_shield_enabled: z.boolean(),
  model_input_text: z.string(),
  extracted: ExtractedDocumentSchema,
  math_audit: MathAuditSchema,
  pii_audit: PiiAuditSchema,
  safety_audit: SafetyAuditSchema,
  responsible_ai_scorecard: z.array(ResponsibleAiPillarSchema),
  telemetry: z.object({
    mode: z.string(),
    provider_label: z.string(),
    model: z.string(),
    temperature: z.number(),
    latency_ms: z.number(),
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
    fallback_reason: z.string().nullable().optional(),
  }),
  prompts: z.object({
    system_prompt: z.string(),
    user_prompt_preview: z.string(),
  }),
  human_in_the_loop_notice: z.string(),
});

export const ToolTraceItemSchema = z.object({
  tool: z.string(),
  arguments: z.record(z.unknown()),
  result_summary: z.string(),
});

export const AgentChatResponseSchema = z.object({
  blocked: z.boolean(),
  safety_audit: SafetyAuditSchema,
  answer: z.string(),
  citations: z.array(z.string()),
  tool_trace: z.array(ToolTraceItemSchema),
  telemetry: z.object({
    mode: z.string(),
    provider_label: z.string(),
    model: z.string(),
    latency_ms: z.number(),
    total_tokens: z.number(),
  }),
});

export type FoundryModel = z.infer<typeof FoundryModelSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type SampleDocument = z.infer<typeof SampleDocumentSchema>;
export type AuditResponse = z.infer<typeof AuditResponseSchema>;
export type AgentChatResponse = z.infer<typeof AgentChatResponseSchema>;

export interface ChatTurn {
  id: string;
  question: string;
  response: AgentChatResponse;
}

export interface FileExtractResponse {
  kind: 'image' | 'pdf' | 'text';
  filename: string;
  size_bytes: number;
  page_count?: number;
  text: string;
  image_data_url: string | null;
}

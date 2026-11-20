import React, { useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Play,
  Shield,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { FoundryModel, SampleDocument } from '../types/audit';

interface DocumentIntakeProps {
  samples: SampleDocument[];
  models: FoundryModel[];
  selectedSampleId: string | null;
  documentText: string;
  imageDataUrl: string | null;
  filename: string;
  selectedModel: string;
  temperature: number;
  privacyShield: boolean;
  isUploading: boolean;
  isAuditing: boolean;
  error: string | null;
  onSelectSample: (sample: SampleDocument) => void;
  onChangeText: (value: string) => void;
  onUploadFile: (file: File) => void;
  onClearImage: () => void;
  onChangeModel: (modelId: string) => void;
  onChangeTemperature: (temp: number) => void;
  onTogglePrivacyShield: (enabled: boolean) => void;
  onRunAudit: () => void;
}

const COMPACT_LABELS: Record<string, { title: string; tag: string; tone: string }> = {
  pharmacy_receipt_discrepancy: {
    title: 'Pharmacy Bill',
    tag: '+₹350 · PII',
    tone: 'bg-rose-500/12 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
  university_exam_notice: {
    title: 'Exam Notice',
    tag: 'Deadlines · PII',
    tone: 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  },
  azure_cloud_invoice: {
    title: 'Cloud Invoice',
    tag: 'Verified',
    tone: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
};

export const DocumentIntake: React.FC<DocumentIntakeProps> = ({
  samples,
  models,
  selectedSampleId,
  documentText,
  imageDataUrl,
  filename,
  selectedModel,
  temperature,
  privacyShield,
  isUploading,
  isAuditing,
  error,
  onSelectSample,
  onChangeText,
  onUploadFile,
  onClearImage,
  onChangeModel,
  onChangeTemperature,
  onTogglePrivacyShield,
  onRunAudit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = '';
  };

  return (
    <section
      aria-label="Document Intake"
      className="foundry-glass foundry-glass-hover flex flex-col gap-4 rounded-2xl p-4 sm:p-5"
    >
      {/* Compact Preset Pills */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {samples.map((sample) => {
          const active = selectedSampleId === sample.id;
          const meta = COMPACT_LABELS[sample.id] ?? {
            title: sample.title,
            tag: sample.category,
            tone: 'bg-orange-500/10 text-orange-800 dark:text-amber-200',
          };
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => onSelectSample(sample)}
              className={`flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all ${
                active
                  ? 'border-[#ea8b21] bg-[#ea8b21]/10 ring-1 ring-[#ea8b21]/35 dark:border-[#ea8b21] dark:bg-[#ea8b21]/15'
                  : 'border-[#ebdcc8] bg-white/80 hover:border-[#ea8b21]/55 hover:bg-white dark:border-[#ea8b21]/15 dark:bg-[#1E140F]/75 dark:hover:border-[#ea8b21]/45'
              }`}
            >
              <span className="text-xs font-bold text-[#1e293b] dark:text-[#faf5ec]">
                {meta.title}
              </span>
              <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${meta.tone}`}>
                {meta.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Document Input Area */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] font-medium text-orange-950/70 dark:text-amber-100/70">
            <FileText className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-amber-400" />
            <span className="truncate">{filename}</span>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-label="Upload Image, PDF, or Text"
            title="Upload PNG, JPG, PDF, or TXT"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-orange-900/12 bg-white/85 text-orange-700 transition hover:border-orange-500/50 hover:bg-orange-50 disabled:opacity-50 dark:border-orange-300/20 dark:bg-[#241711] dark:text-amber-300 dark:hover:border-amber-400/50"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.csv"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload file"
          />
        </div>

        {imageDataUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-orange-900/15 bg-white/80 p-2.5 dark:border-orange-300/20 dark:bg-[#19100C]">
            <div className="mb-2 flex items-center justify-between text-xs text-orange-950/75 dark:text-amber-100/80">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                <ImageIcon className="h-3.5 w-3.5 text-orange-500" />
                {filename}
              </span>
              <button
                type="button"
                onClick={onClearImage}
                aria-label="Remove image"
                title="Remove"
                className="rounded-md p-1 text-orange-900/60 hover:bg-orange-100 dark:text-amber-200/70 dark:hover:bg-orange-950"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <img
              src={imageDataUrl}
              alt="Uploaded document"
              className="max-h-52 w-full rounded-lg object-contain"
            />
          </div>
        ) : (
          <textarea
            id="doc-input"
            rows={10}
            value={documentText}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Paste document text or upload a file..."
            aria-label="Document text"
            className="w-full rounded-xl border border-orange-900/12 bg-white/80 p-3 font-mono text-xs leading-relaxed text-[#25160E] placeholder:text-orange-950/35 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-orange-200/12 dark:bg-[#160E0A]/90 dark:text-[#FDEBD6] dark:placeholder:text-amber-100/30 dark:focus:border-amber-400/60 dark:focus:ring-amber-400/20"
          />
        )}
      </div>

      {/* Compact Foundry Parameter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#ebdcc8] bg-[#faf5ec] p-3 dark:border-[#ea8b21]/20 dark:bg-[#1B120D]/80">
        <select
          aria-label="Foundry model"
          value={selectedModel}
          onChange={(e) => onChangeModel(e.target.value)}
          className="min-w-[140px] flex-1 rounded-lg border border-[#ebdcc8] bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-[#1e293b] focus:border-[#ea8b21] focus:outline-none dark:border-[#ea8b21]/20 dark:bg-[#120B08] dark:text-[#faf5ec]"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <div
          className="flex items-center gap-2 rounded-lg border border-[#ebdcc8] bg-white px-2.5 py-1.5 dark:border-[#ea8b21]/20 dark:bg-[#120B08]"
          title="Sampling temperature"
        >
          <span className="font-mono text-[11px] font-semibold text-[#d97d16] tabular-nums dark:text-[#f5b461]">
            T {temperature.toFixed(1)}
          </span>
          <input
            aria-label="Temperature"
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={temperature}
            onChange={(e) => onChangeTemperature(parseFloat(e.target.value))}
            className="w-16 accent-[#ea8b21]"
          />
        </div>

        <button
          type="button"
          onClick={() => onTogglePrivacyShield(!privacyShield)}
          aria-pressed={privacyShield}
          title={privacyShield ? 'PII Shield: ON' : 'PII Shield: OFF'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#ebdcc8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1e293b] transition hover:border-[#ea8b21] dark:border-[#ea8b21]/25 dark:bg-[#120B08] dark:text-[#faf5ec] dark:hover:border-[#ea8b21]"
        >
          {privacyShield ? (
            <ShieldCheck className="h-4 w-4 text-[#ea8b21]" aria-hidden="true" />
          ) : (
            <Shield className="h-4 w-4 text-[#94a3b8]" aria-hidden="true" />
          )}
          <span className="font-mono text-[11px]">PII</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      {/* Punchy Primary Action */}
      <button
        type="button"
        onClick={onRunAudit}
        disabled={isAuditing || (!documentText.trim() && !imageDataUrl)}
        className="foundry-btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#FFFBF5] transition-transform active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAuditing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4 fill-current" />
        )}
        <span>{isAuditing ? 'Auditing...' : 'Audit'}</span>
      </button>
    </section>
  );
};

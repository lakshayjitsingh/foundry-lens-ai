import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Code2,
  Download,
  FileCheck2,
  Info,
  Lock,
  Quote,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AuditResponse } from '../types/audit';

interface AuditWorkspaceProps {
  audit: AuditResponse;
}

type InspectorTab = 'scorecard' | 'pii' | 'prompts';

export const AuditWorkspace: React.FC<AuditWorkspaceProps> = ({ audit }) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('scorecard');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { extracted, math_audit: mathAudit, pii_audit: piiAudit, telemetry } = audit;

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const spokenText = `${extracted.plain_language_summary} ${mathAudit.verdict}`;
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${audit.audit_id}-foundry-audit.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const mathBannerStyle =
    mathAudit.status === 'discrepancy_detected'
      ? 'border-rose-300/80 bg-rose-50/90 text-rose-950 dark:border-rose-500/35 dark:bg-rose-950/45 dark:text-rose-100'
      : mathAudit.status === 'verified'
        ? 'border-emerald-300/80 bg-emerald-50/90 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/35 dark:text-emerald-100'
        : 'border-orange-200 bg-orange-50/80 text-orange-950 dark:border-orange-300/20 dark:bg-[#231610]/80 dark:text-amber-100';

  return (
    <div className="animate-fade-up space-y-4">
      {/* Compact Telemetry & Icon-Only Action Bar */}
      <div className="foundry-glass flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <span className="rounded-md bg-[#ea8b21]/14 px-2 py-0.5 font-bold text-[#c76e0d] dark:bg-[#ea8b21]/20 dark:text-[#f5b461]">
            {telemetry.model}
          </span>
          <span className="rounded-md bg-[#faf5ec] px-2 py-0.5 font-semibold text-[#c76e0d] tabular-nums border border-[#ebdcc8] dark:border-white/10 dark:bg-white/6 dark:text-[#f5b461]">
            T {telemetry.temperature.toFixed(1)}
          </span>
          <span className="rounded-md bg-[#faf5ec] px-2 py-0.5 text-[#475569] tabular-nums border border-[#ebdcc8] dark:border-white/10 dark:bg-white/6 dark:text-amber-100/75">
            {telemetry.latency_ms}ms
          </span>
          <span className="rounded-md bg-[#faf5ec] px-2 py-0.5 text-[#475569] tabular-nums border border-[#ebdcc8] dark:border-white/10 dark:bg-white/6 dark:text-amber-100/75">
            {telemetry.total_tokens} tok
          </span>
          <span className="rounded-md bg-emerald-500/12 px-2 py-0.5 font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">
            {Math.round(extracted.confidence * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleSpeak}
            aria-label={isSpeaking ? 'Stop audio' : 'Read aloud'}
            title={isSpeaking ? 'Stop audio' : 'Read aloud'}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              isSpeaking
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-orange-900/12 bg-white/85 text-orange-800 hover:border-orange-500/50 hover:bg-orange-50 dark:border-orange-300/20 dark:bg-[#231610] dark:text-amber-300 dark:hover:border-amber-400/50'
            }`}
          >
            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            aria-label="Export Audit JSON"
            title="Export Audit JSON"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-orange-900/12 bg-white/85 text-orange-800 transition hover:border-orange-500/50 hover:bg-orange-50 dark:border-orange-300/20 dark:bg-[#231610] dark:text-amber-300 dark:hover:border-amber-400/50"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Deterministic Math Tool Verdict */}
      <div className={`rounded-2xl border p-4 shadow-sm backdrop-blur-xl ${mathBannerStyle}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {mathAudit.status === 'discrepancy_detected' ? (
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-600 dark:text-rose-400" />
            ) : mathAudit.status === 'verified' ? (
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Info className="h-4.5 w-4.5 shrink-0 text-orange-600 dark:text-amber-300" />
            )}
            <h3 className="text-sm font-bold">
              {mathAudit.status === 'discrepancy_detected'
                ? `Mismatch: ${mathAudit.difference > 0 ? '+' : ''}${mathAudit.currency} ${mathAudit.difference.toFixed(2)}`
                : mathAudit.status === 'verified'
                  ? 'Totals Verified'
                  : 'Non-Financial Document'}
            </h3>
          </div>
          <span className="rounded bg-white/75 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-800 dark:bg-black/35 dark:text-amber-200">
            {mathAudit.tool_name}()
          </span>
        </div>

        {mathAudit.computed_total !== null && mathAudit.stated_total !== null && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-black/5 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-black/35">
              <div className="text-[10px] font-medium uppercase text-slate-500 dark:text-amber-100/55">
                Subtotal
              </div>
              <div className="font-mono text-sm font-bold tabular-nums">
                {mathAudit.currency} {mathAudit.computed_subtotal?.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-black/5 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-black/35">
              <div className="text-[10px] font-medium uppercase text-slate-500 dark:text-amber-100/55">
                Tax
              </div>
              <div className="font-mono text-sm font-bold tabular-nums">
                {mathAudit.currency} {(mathAudit.tax ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-black/5 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-black/35">
              <div className="text-[10px] font-medium uppercase text-slate-500 dark:text-amber-100/55">
                Computed
              </div>
              <div className="font-mono text-sm font-bold tabular-nums">
                {mathAudit.currency} {mathAudit.computed_total.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-black/5 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-black/35">
              <div className="text-[10px] font-medium uppercase text-slate-500 dark:text-amber-100/55">
                Stated
              </div>
              <div
                className={`font-mono text-sm font-bold tabular-nums ${
                  mathAudit.status === 'discrepancy_detected'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {mathAudit.currency} {mathAudit.stated_total.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Extracted Content Card */}
      <section className="foundry-glass foundry-glass-hover rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-orange-900/10 pb-3.5 dark:border-orange-200/12">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-orange-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-[#2A170D] dark:text-[#FFF7ED]">
                {extracted.issuer}
              </h2>
              <span className="rounded-full bg-orange-500/12 px-2 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-500/20 dark:text-amber-200">
                {extracted.document_type}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#5C4033] dark:text-amber-100/75">
              {extracted.plain_language_summary}
            </p>
          </div>

          <div className="flex gap-3 text-right font-mono text-[11px]">
            <div>
              <div className="text-[10px] uppercase text-orange-950/45 dark:text-amber-100/45">
                Date
              </div>
              <div className="font-semibold text-[#2A170D] dark:text-amber-100">
                {extracted.document_date}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-orange-950/45 dark:text-amber-100/45">
                Ref
              </div>
              <div className="font-semibold text-[#2A170D] dark:text-amber-100">
                {extracted.reference_id}
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Financial Table */}
        {extracted.line_items.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-orange-900/10 dark:border-orange-200/12">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-orange-50/80 text-[10px] font-semibold uppercase tracking-wide text-orange-950/60 dark:bg-[#1E140E] dark:text-amber-200/60">
                <tr>
                  <th className="px-3.5 py-2">Item</th>
                  <th className="px-3.5 py-2 text-right">Qty</th>
                  <th className="px-3.5 py-2 text-right">{extracted.currency}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-900/8 dark:divide-orange-200/8">
                {extracted.line_items.map((item, idx) => (
                  <tr
                    key={`${item.description}-${idx}`}
                    className="transition hover:bg-orange-50/60 dark:hover:bg-orange-500/[0.06]"
                  >
                    <td className="px-3.5 py-2 font-medium text-[#1e293b] dark:text-[#faf5ec]">
                      {item.description}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono text-[#64748b] tabular-nums dark:text-amber-100/60">
                      {item.quantity}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono font-bold text-[#d97d16] tabular-nums dark:text-[#f5b461]">
                      {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Key Deadlines & Notes */}
        {(extracted.key_dates.length > 0 || extracted.key_requirements.length > 0) && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {extracted.key_dates.length > 0 && (
              <div className="rounded-xl border border-orange-900/10 bg-[#FFF5E8]/70 p-3 dark:border-orange-200/12 dark:bg-[#1C120D]/80">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-orange-800 dark:text-amber-300">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Deadlines</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {extracted.key_dates.map((kd, i) => (
                    <li key={`${kd.label}-${i}`} className="flex flex-col">
                      <span className="font-semibold text-[#2A170D] dark:text-[#FFF7ED]">
                        {kd.label}
                      </span>
                      <span className="font-mono text-[11px] text-orange-700 dark:text-amber-300">
                        {kd.date}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {extracted.key_requirements.length > 0 && (
              <div className="rounded-xl border border-orange-900/10 bg-[#FFF5E8]/70 p-3 dark:border-orange-200/12 dark:bg-[#1C120D]/80">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-orange-800 dark:text-amber-300">
                  Notes
                </div>
                <ul className="list-disc space-y-1 pl-4 text-xs text-[#5C4033] dark:text-amber-100/75">
                  {extracted.key_requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Verbatim Citations */}
        {extracted.citations.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-1">
            <Quote className="h-3.5 w-3.5 text-orange-500" />
            {extracted.citations.slice(0, 3).map((cite, i) => (
              <span
                key={i}
                className="rounded-md border border-orange-900/10 bg-[#FFF5E8]/80 px-2 py-0.5 font-mono text-[10px] text-[#5C4033] dark:border-orange-200/12 dark:bg-[#1C120D] dark:text-amber-100/70"
              >
                {cite}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Compact Responsible AI / PII / Prompts Tabs */}
      <section className="foundry-glass overflow-hidden rounded-2xl">
        <div
          role="tablist"
          aria-label="Audit details"
          className="flex border-b border-orange-900/10 bg-[#FFF5E8]/60 px-3 pt-1.5 dark:border-orange-200/12 dark:bg-[#1B120D]/70"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'scorecard'}
            onClick={() => setActiveTab('scorecard')}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'scorecard'
                ? 'border-orange-500 text-orange-700 dark:border-amber-400 dark:text-amber-300'
                : 'border-transparent text-orange-950/55 hover:text-orange-900 dark:text-amber-100/55 dark:hover:text-amber-100'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>RAI 6/6</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pii'}
            onClick={() => setActiveTab('pii')}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'pii'
                ? 'border-orange-500 text-orange-700 dark:border-amber-400 dark:text-amber-300'
                : 'border-transparent text-orange-950/55 hover:text-orange-900 dark:text-amber-100/55 dark:hover:text-amber-100'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>PII</span>
            <span className="rounded-full bg-orange-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-orange-800 dark:text-amber-200">
              {piiAudit.total_redacted}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'prompts'}
            onClick={() => setActiveTab('prompts')}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'prompts'
                ? 'border-orange-500 text-orange-700 dark:border-amber-400 dark:text-amber-300'
                : 'border-transparent text-orange-950/55 hover:text-orange-900 dark:text-amber-100/55 dark:hover:text-amber-100'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Prompts</span>
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'scorecard' && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {audit.responsible_ai_scorecard.map((pillar) => (
                <div
                  key={pillar.principle}
                  className="rounded-xl border border-orange-900/10 bg-white/70 p-3 dark:border-orange-200/12 dark:bg-[#1B120D]/80"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#2A170D] dark:text-[#FFF7ED]">
                      {pillar.principle}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        pillar.status === 'pass'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : pillar.status === 'warn'
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {pillar.status === 'pass' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <ShieldAlert className="h-3 w-3" />
                      )}
                      {pillar.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-[#6E4D3E] dark:text-amber-100/65">
                    {pillar.detail}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'pii' && (
            <div className="space-y-3">
              {piiAudit.findings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {piiAudit.findings.map((finding) => (
                    <div
                      key={finding.category}
                      className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        {finding.category}
                      </span>{' '}
                      <span className="font-mono text-[11px] text-amber-700 dark:text-amber-300">
                        {finding.token} ×{finding.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <pre className="max-h-48 overflow-auto rounded-xl border border-orange-900/15 bg-[#160E0A] p-3 font-mono text-[11px] leading-relaxed text-[#FDEBD6] dark:border-orange-200/15">
                {audit.model_input_text || '[Image Payload]'}
              </pre>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-3">
              <div>
                <div className="mb-1 font-mono text-[10px] font-bold uppercase text-orange-700 dark:text-amber-300">
                  SystemMessage
                </div>
                <pre className="max-h-40 overflow-auto rounded-xl border border-orange-900/15 bg-[#160E0A] p-3 font-mono text-[11px] leading-relaxed text-amber-200 dark:border-orange-200/15">
                  {audit.prompts.system_prompt}
                </pre>
              </div>
              <div>
                <div className="mb-1 font-mono text-[10px] font-bold uppercase text-orange-700 dark:text-amber-300">
                  UserMessage
                </div>
                <pre className="max-h-40 overflow-auto rounded-xl border border-orange-900/12 bg-white/80 p-3 font-mono text-[11px] leading-relaxed text-[#3E271C] dark:border-orange-200/12 dark:bg-[#140D0A] dark:text-amber-100/80">
                  {audit.prompts.user_prompt_preview}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

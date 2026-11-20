import React from 'react';
import { BookOpen, CheckCircle2, Code2, X } from 'lucide-react';

interface SyllabusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYLLABUS_ITEMS = [
  {
    domain: 'Domain 1 (40–45%) · AI Concepts & Responsible AI',
    rows: [
      {
        skill: '6 Responsible AI Principles',
        detail: 'PII redaction, Prompt Shield, deterministic math check, telemetry, TTS, JSON export.',
        file: 'backend/responsible_ai.py',
      },
      {
        skill: 'Multimodal Workloads',
        detail: 'Vision images, PDF/text Content Understanding, grounded NLP, Speech TTS.',
        file: 'backend/main.py',
      },
    ],
  },
  {
    domain: 'Domain 2 (55–60%) · Microsoft Foundry',
    rows: [
      {
        skill: 'Foundry SDK & Catalog',
        detail: 'azure-ai-inference ChatCompletionsClient · GPT-4o mini, Phi-4, Llama 3.3 70B.',
        file: 'backend/foundry_client.py',
      },
      {
        skill: 'Prompting & Single-Agent Tools',
        detail: 'SystemMessage/UserMessage + ToolMessage loop (verify_line_item_totals, scan_and_redact_pii).',
        file: 'backend/foundry_client.py',
      },
    ],
  },
];

export const SyllabusModal: React.FC<SyllabusModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="syllabus-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#120B08]/70 p-4 backdrop-blur-md"
    >
      <div className="animate-fade-up max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-orange-500/25 bg-[#FFF9F2] shadow-2xl dark:border-amber-400/25 dark:bg-[#19100C]">
        <div className="flex items-center justify-between border-b border-orange-900/10 px-5 py-3.5 dark:border-orange-200/12">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-orange-600 dark:text-amber-400" />
            <h2 id="syllabus-modal-title" className="text-sm font-bold text-[#2A170D] dark:text-[#FFF7ED]">
              AI-901 Syllabus Map
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-orange-900/60 hover:bg-orange-100 dark:text-amber-200/60 dark:hover:bg-orange-950"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {SYLLABUS_ITEMS.map((section) => (
            <div key={section.domain} className="space-y-2">
              <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-orange-700 dark:text-amber-300">
                {section.domain}
              </div>
              {section.rows.map((row) => (
                <div
                  key={row.skill}
                  className="rounded-xl border border-orange-900/10 bg-white/80 p-3 dark:border-orange-200/12 dark:bg-[#231610]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2A170D] dark:text-[#FFF7ED]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      {row.skill}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-orange-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-800 dark:text-amber-200">
                      <Code2 className="h-3 w-3" />
                      {row.file}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#6E4D3E] dark:text-amber-100/70">{row.detail}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { FileSearch } from 'lucide-react';
import {
  fetchHealth,
  fetchSamples,
  runDocumentAudit,
  sendAgentQuestion,
  uploadDocumentFile,
} from './lib/api';
import {
  AuditResponse,
  ChatTurn,
  HealthResponse,
  SampleDocument,
} from './types/audit';
import { FoundryBackground } from './components/FoundryBackground';
import { Header } from './components/Header';
import { DocumentIntake } from './components/DocumentIntake';
import { AuditWorkspace } from './components/AuditWorkspace';
import { GroundedChat } from './components/GroundedChat';
import { SyllabusModal } from './components/SyllabusModal';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [samples, setSamples] = useState<SampleDocument[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState('pharmacy_receipt_discrepancy.txt');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.2);
  const [privacyShield, setPrivacyShield] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [auditResult, setAuditResult] = useState<AuditResponse | null>(null);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const [syllabusOpen, setSyllabusOpen] = useState(false);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('foundry-lens-theme', next);
      } catch {
        // Ignore restricted storage
      }
      return next;
    });
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const [healthRes, sampleList] = await Promise.all([fetchHealth(), fetchSamples()]);
        if (!active) return;
        setHealth(healthRes);
        setSelectedModel(healthRes.default_model || 'gpt-4o-mini');
        setSamples(sampleList);
        if (sampleList.length > 0) {
          const first = sampleList[0];
          setSelectedSampleId(first.id);
          setDocumentText(first.text);
          setFilename(`${first.id}.txt`);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'API unreachable.');
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectSample = (sample: SampleDocument) => {
    setSelectedSampleId(sample.id);
    setDocumentText(sample.text);
    setImageDataUrl(null);
    setFilename(`${sample.id}.txt`);
    setError(null);
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const extracted = await uploadDocumentFile(file);
      setSelectedSampleId(null);
      setFilename(extracted.filename);
      if (extracted.kind === 'image' && extracted.image_data_url) {
        setImageDataUrl(extracted.image_data_url);
        setDocumentText('');
      } else {
        setImageDataUrl(null);
        setDocumentText(extracted.text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setError(null);
    try {
      const result = await runDocumentAudit({
        document_text: documentText,
        image_data_url: imageDataUrl,
        filename,
        model: selectedModel,
        temperature,
        privacy_shield: privacyShield,
      });
      setAuditResult(result);
      setChatTurns([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSendQuestion = async (question: string) => {
    if (!auditResult) return;
    setIsSendingChat(true);
    try {
      const response = await sendAgentQuestion({
        question,
        document_text: auditResult.model_input_text,
        extracted: auditResult.extracted,
        math_audit: auditResult.math_audit,
        pii_audit: auditResult.pii_audit,
        model: selectedModel,
        temperature,
      });
      setChatTurns((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          question,
          response,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent request failed.');
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="relative min-h-screen text-[#1e293b] dark:text-[#faf5ec]">
      <FoundryBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header
          health={health}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenSyllabus={() => setSyllabusOpen(true)}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <DocumentIntake
                samples={samples}
                models={health?.models ?? []}
                selectedSampleId={selectedSampleId}
                documentText={documentText}
                imageDataUrl={imageDataUrl}
                filename={filename}
                selectedModel={selectedModel}
                temperature={temperature}
                privacyShield={privacyShield}
                isUploading={isUploading}
                isAuditing={isAuditing}
                error={error}
                onSelectSample={handleSelectSample}
                onChangeText={(val) => {
                  setDocumentText(val);
                  setSelectedSampleId(null);
                }}
                onUploadFile={handleUploadFile}
                onClearImage={() => setImageDataUrl(null)}
                onChangeModel={setSelectedModel}
                onChangeTemperature={setTemperature}
                onTogglePrivacyShield={setPrivacyShield}
                onRunAudit={handleRunAudit}
              />
            </div>

            <div className="relative space-y-4 lg:col-span-7">
              {isAuditing && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl"
                >
                  <div className="animate-scan-sweep h-24 w-full bg-gradient-to-b from-transparent via-orange-400/25 to-transparent" />
                </div>
              )}

              {auditResult ? (
                <>
                  <AuditWorkspace audit={auditResult} />
                  <GroundedChat
                    audit={auditResult}
                    turns={chatTurns}
                    isSending={isSendingChat}
                    onSendQuestion={handleSendQuestion}
                  />
                </>
              ) : (
                <div className="foundry-glass flex min-h-[420px] flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/20 via-amber-400/15 to-rose-400/15 text-orange-600 shadow-lg shadow-orange-500/15 dark:border-amber-400/30 dark:text-amber-300">
                    <FileSearch className="h-7 w-7" />
                  </div>
                  <h2 className="text-base font-bold text-[#2A170D] dark:text-[#FFF7ED]">
                    Ready to Audit
                  </h2>
                  <p className="mt-1 font-mono text-xs text-orange-950/55 dark:text-amber-100/55">
                    Select a document &amp; click Audit
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <SyllabusModal isOpen={syllabusOpen} onClose={() => setSyllabusOpen(false)} />
    </div>
  );
};

export default App;

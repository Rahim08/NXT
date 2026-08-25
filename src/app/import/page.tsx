"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { LayoutShell } from "@/components/layout/layout-shell";
import { useI18n } from "@/lib/i18n/provider";

interface ImportPreview {
  projects: { name: string; description?: string; workstreams?: unknown[] }[];
  workstreamCount: number;
  stageCount: number;
  taskCount: number;
  milestoneCount: number;
  subtaskCount: number;
  dependencyCount: number;
  warnings: string[];
  errors: string[];
  existingProjects: { id: string; name: string }[];
  workstreamDetails: { name: string; taskCount: number }[];
}

interface ImportResult {
  imported: { id: string; name: string; tasks: number }[];
}

export default function ImportPage() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileFormat, setFileFormat] = useState<"json" | "csv" | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"merge" | "duplicate">("duplicate");

  const resetAll = () => {
    setFileContent(null);
    setFileName("");
    setFileFormat(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      setFileFormat("csv");
    } else if (ext === "json" || file.name.endsWith(".project.json")) {
      setFileFormat("json");
    } else {
      setError("Unsupported file format. Use .json, .csv, or .project.json");
      return;
    }

    setFileName(file.name);
    setError(null);
    setPreview(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!fileContent || !fileFormat) return;

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", format: fileFormat, data: fileContent }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
        if (data.data.existingProjects.length > 0) {
          setMode("merge");
        } else {
          setMode("duplicate");
        }
      } else {
        setError(data.error || "Preview failed");
      }
    } catch {
      setError("Failed to preview import");
    }
  };

  const handleImport = async () => {
    if (!fileContent || !fileFormat || !preview) return;
    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", format: fileFormat, data: fileContent, mode }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setPreview(null);
        setFileContent(null);
        setFileName("");
      } else {
        setError(data.error || "Import failed");
      }
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  };

  const projectName = preview?.projects?.[0]?.name || result?.imported?.[0]?.name || "";
  const importedProjectId = result?.imported?.[0]?.id;

  return (
    <LayoutShell>
      <div className="max-w-2xl space-y-6">
        <header>
          <h1 className="text-[22px] font-bold text-text-primary tracking-tight">
            {t.import.title}
          </h1>
        </header>

        {/* ── Drop zone (no file selected, no preview, no result) ── */}
        {!fileContent && !preview && !result && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className="bg-surface rounded-[var(--radius-lg)] border-2 border-dashed border-border p-12 lg:p-16 text-center hover:border-accent/40 transition-colors cursor-pointer"
          >
            <svg className="w-14 h-14 mx-auto text-text-tertiary mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <p className="text-text-primary font-semibold text-lg mb-1">{t.import.dragDrop}</p>
            <p className="text-text-tertiary text-sm mb-4">{t.import.orBrowse}</p>
            <span className="inline-block px-5 py-2.5 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover transition-colors">
              {t.import.chooseFile}
            </span>
            <p className="text-text-tertiary text-xs mt-4">{t.import.supportedFormats}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.project.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        )}

        {/* ── File selected — show info + validate button ── */}
        {fileContent && !preview && !result && (
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">{fileName}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{fileFormat?.toUpperCase()} format</p>
              </div>
              <div className="flex gap-2">
                <button onClick={resetAll} className="px-4 py-2.5 rounded-[var(--radius-md)] border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors">
                  {t.common.cancel}
                </button>
                <button onClick={handlePreview} className="px-5 py-2.5 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover transition-colors">
                  {t.import.validate}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-danger-bg rounded-[var(--radius-lg)] border border-danger/20 p-5">
            <p className="text-sm font-medium text-danger">{error}</p>
            <button onClick={() => setError(null)} className="mt-3 text-xs text-text-secondary hover:text-text-primary">
              {t.common.close}
            </button>
          </div>
        )}

        {/* ── Preview ── */}
        {preview && (
          <div className="space-y-5">
            {/* Project summary card */}
            {preview.projects.map((p, i) => (
              <div key={i} className="bg-surface rounded-[var(--radius-lg)] border border-border p-5">
                <h2 className="text-lg font-semibold text-text-primary">{p.name}</h2>
                {p.description && <p className="text-sm text-text-secondary mt-1">{p.description}</p>}

                {/* Stats grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                  <StatBlock value={preview.workstreamCount} label={t.import.workstreams} />
                  <StatBlock value={preview.stageCount} label={t.import.stages} />
                  <StatBlock value={preview.taskCount} label={t.import.tasks} />
                  <StatBlock value={preview.milestoneCount} label={t.import.milestones} />
                  <StatBlock value={preview.subtaskCount} label={t.import.subtasks} />
                </div>
              </div>
            ))}

            {/* Structure breakdown */}
            {preview.workstreamDetails.length > 0 && (
              <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-5">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">{t.import.structure}</h3>
                <div className="space-y-2">
                  {preview.workstreamDetails.map((ws, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-text-primary">{ws.name}</span>
                      <span className="text-xs text-text-tertiary">{ws.taskCount} tasks</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation */}
            {preview.errors.length === 0 && preview.projects.length > 0 && (
              <div className="bg-success-bg rounded-[var(--radius-lg)] border border-success/20 p-5">
                <h3 className="text-xs font-semibold text-success uppercase tracking-wider mb-2">{t.import.validation}</h3>
                <div className="space-y-1.5">
                  <ValidationLine ok text={`${preview.projects.length} project${preview.projects.length > 1 ? "s" : ""} valid`} />
                  <ValidationLine ok text={`${preview.taskCount} tasks ready`} />
                  <ValidationLine ok text={t.import.allWorkstreamsValid} />
                </div>
              </div>
            )}

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="bg-warning-bg rounded-[var(--radius-lg)] border border-warning/20 p-5">
                <h3 className="text-xs font-semibold text-warning uppercase tracking-wider mb-2">{t.import.warnings}</h3>
                {preview.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-text-secondary">• {w}</p>
                ))}
              </div>
            )}

            {/* Errors */}
            {preview.errors.length > 0 && (
              <div className="bg-danger-bg rounded-[var(--radius-lg)] border border-danger/20 p-5">
                <h3 className="text-xs font-semibold text-danger uppercase tracking-wider mb-2">{t.import.errors}</h3>
                {preview.errors.map((e, i) => (
                  <p key={i} className="text-sm text-text-secondary">• {e}</p>
                ))}
              </div>
            )}

            {/* Merge mode selection */}
            {preview.existingProjects.length > 0 && (
              <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  {t.import.existingProject.replace("{name}", preview.existingProjects[0].name)}
                </h3>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border cursor-pointer hover:bg-surface-hover">
                    <input type="radio" name="mode" value="merge" checked={mode === "merge"} onChange={() => setMode("merge")} className="accent-[var(--accent)] mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary">
                          {t.import.mergeOption.replace("{name}", preview.existingProjects[0].name)}
                        </p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-light text-accent">{t.import.mergeRecommended}</span>
                      </div>
                      <p className="text-xs text-text-tertiary mt-0.5">{t.import.mergeDescription}</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border cursor-pointer hover:bg-surface-hover">
                    <input type="radio" name="mode" value="duplicate" checked={mode === "duplicate"} onChange={() => setMode("duplicate")} className="accent-[var(--accent)] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{t.import.duplicateOption}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{t.import.duplicateDescription}</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={resetAll} className="px-5 py-3 rounded-[var(--radius-md)] border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors">
                {t.import.cancelOption}
              </button>
              <button
                onClick={handleImport}
                disabled={importing || preview.errors.length > 0}
                className="flex-1 px-5 py-3 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-semibold hover:bg-accent-hover disabled:opacity-40 transition-colors"
              >
                {importing ? t.common.loading : t.import.importData}
              </button>
            </div>
          </div>
        )}

        {/* ── Success screen ── */}
        {result && result.imported.length > 0 && (
          <div className="space-y-5">
            <div className="bg-success-bg rounded-[var(--radius-lg)] border border-success/20 p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-success mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-lg font-semibold text-success mb-1">{t.import.projectImported}</p>
              <p className="text-sm text-text-secondary">{projectName}</p>

              <div className="flex items-center justify-center gap-4 mt-4 text-sm text-text-secondary">
                <span>{result.imported[0]?.tasks || 0} {t.import.tasks.toLowerCase()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {importedProjectId && (
                <Link
                  href={`/projects/${importedProjectId}`}
                  className="w-full px-5 py-3 rounded-[var(--radius-md)] bg-accent text-text-inverse text-sm font-semibold text-center hover:bg-accent-hover transition-colors"
                >
                  {t.import.openProject.replace("{name}", projectName)}
                </Link>
              )}
              <Link
                href="/projects"
                className="w-full px-5 py-3 rounded-[var(--radius-md)] border border-border text-text-secondary text-sm font-medium text-center hover:bg-surface-hover transition-colors"
              >
                {t.import.backToProjects}
              </Link>
            </div>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center p-3 bg-elevated rounded-[var(--radius-md)]">
      <p className="text-xl font-semibold text-text-primary">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}

function ValidationLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg className={`w-4 h-4 ${ok ? "text-success" : "text-danger"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        {ok ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        )}
      </svg>
      <span className="text-sm text-text-primary">{text}</span>
    </div>
  );
}

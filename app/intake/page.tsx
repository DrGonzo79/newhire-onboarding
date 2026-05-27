"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SAMPLE_HIRES, SERVER_DEMO_OFFER } from "@/lib/sampleHires";
import type { SourceType } from "@/lib/types";
import { PageHeader } from "@/components/ui";

const EXTRACTION_STAGES = [
  "Reading accepted offer…",
  "Detecting employee & role…",
  "Mapping required paperwork…",
  "Scoring field confidence…",
  "Running day-one readiness checks…",
];

export default function IntakePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{
    mediaType: string;
    dataBase64: string;
    filename: string;
  } | null>(null);
  const [stage, setStage] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("demo=1")) {
      setText(SERVER_DEMO_OFFER);
      setSourceType("offer_email");
    }
  }, []);

  function loadSample(id: string) {
    const sample = SAMPLE_HIRES.find((s) => s.id === id);
    if (!sample) return;
    setText(sample.text);
    setSourceType(sample.sourceType);
    setFileName(null);
    setFileData(null);
    setError(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    const isText =
      file.type.startsWith("text") || /\.(txt|eml|csv|md)$/i.test(file.name);
    if (isText) {
      setText(await file.text());
      setSourceType("manual");
      setFileData(null);
    } else {
      const dataBase64 = await readAsBase64(file);
      setFileData({
        mediaType: file.type || "application/pdf",
        dataBase64,
        filename: file.name,
      });
      setSourceType("form");
      setText(SERVER_DEMO_OFFER);
    }
  }

  async function submit() {
    if (!text.trim() && !fileData) {
      setError("Paste an accepted offer, load a sample, or upload a file first.");
      return;
    }
    setError(null);

    for (let i = 0; i < EXTRACTION_STAGES.length; i++) {
      setStage(i);
      await new Promise((r) => setTimeout(r, 460));
    }

    try {
      const res = await fetch("/api/hires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceType, file: fileData ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      router.push(`/hires/${data.newHire.id}`);
    } catch (err) {
      setStage(-1);
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }

  const busy = stage >= 0;

  return (
    <div>
      <PageHeader
        title="Import Accepted Offer"
        subtitle="Bring a new hire into the desk by file, paste, or sample fixture."
      />

      {busy ? (
        <div className="card card-pad">
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-brand-500" />
            <span className="text-sm font-semibold text-ink-800">
              AI extraction in progress
            </span>
          </div>
          <ul className="space-y-2">
            {EXTRACTION_STAGES.map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-3 text-sm ${
                  i <= stage ? "text-ink-800" : "text-ink-300"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    i < stage
                      ? "bg-emerald-100 text-emerald-700"
                      : i === stage
                        ? "bg-brand-100 text-brand-700"
                        : "bg-ink-100 text-ink-400"
                  }`}
                >
                  {i < stage ? "✓" : i + 1}
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="card card-pad">
              <label className="label">Paste accepted-offer email / onboarding form</label>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setFileData(null);
                  if (sourceType === "manual") setSourceType("offer_email");
                }}
                rows={16}
                placeholder="Paste the accepted-offer email or onboarding form here…"
                className="input font-mono text-xs"
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".txt,.eml,.csv,.md,.pdf,.png,.jpg,.jpeg"
                    onChange={handleFile}
                    className="hidden"
                  />
                  <button onClick={() => fileInput.current?.click()} className="btn-secondary">
                    Upload file
                  </button>
                  {fileName && (
                    <span className="text-xs text-ink-500">
                      {fileName}
                      {fileData && (
                        <span className="ml-1 text-brand-600">(sent for AI extraction)</span>
                      )}
                    </span>
                  )}
                </div>
                <button onClick={submit} className="btn-primary">
                  Import &amp; Extract
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card card-pad">
              <div className="section-title mb-3">Load a Sample Hire</div>
              <div className="space-y-3">
                {SAMPLE_HIRES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSample(s.id)}
                    className="block w-full rounded-lg border border-ink-200 p-3 text-left hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <div className="text-sm font-semibold text-ink-800">{s.label}</div>
                    <div className="mt-1 text-xs text-ink-500">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="card card-pad text-xs text-ink-500">
              <div className="section-title mb-2">How it works</div>
              Uploaded PDFs and images are sent to Claude for real OCR/vision
              extraction when an API key is configured; pasted text runs through
              the same structured extraction. Without a key, a deterministic mock
              parser handles text and the demo fixtures. Every provider sits
              behind one swappable interface.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

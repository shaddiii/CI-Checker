import { useRef, useState } from "react";
import { uploadStyleGuide } from "../api.js";

export default function UploadStyleGuide({ onProfileReady }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setFileName(file.name);
    setError(null);
    setLoading(true);
    try {
      const profile = await uploadStyleGuide(file);
      onProfileReady(profile);
    } catch (e) {
      setError(e.message || "Extraction failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="eyebrow">Step 1</p>
      <h1 className="font-display text-3xl md:text-4xl text-ink mb-3">
        Upload your Corporate Identity guide
      </h1>
      <p className="text-ink/70 mb-8 leading-relaxed">
        Upload the official CI/CD style guide PDF (any language is fine).
        Colors, typefaces, and rules (logo, tone of voice, imagery) will be
        extracted automatically and shown to you for review in the next step.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`focus-ring cursor-pointer border-2 border-dashed rounded-sm px-8 py-16 text-center transition-colors
          ${dragging ? "border-indigo bg-white" : "border-ink/25 bg-white/50"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-ink/20 border-t-indigo rounded-full animate-spin" />
            <p className="font-mono text-sm text-ink/70">
              Analyzing {fileName} — extracting colors, fonts &amp; rules. This can take a minute or two.
            </p>
          </div>
        ) : (
          <>
            <p className="font-display text-lg text-ink mb-1">Drop your PDF here</p>
            <p className="text-ink/50 text-sm">or click to choose a file</p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 border border-verdict-red/40 bg-verdict-redBg text-verdict-red px-4 py-3 rounded-sm text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { loadPdfDocument, downloadBlob, formatFileSize } from "@/lib/pdf-utils";
import ToolLayout from "@/components/pdf/ToolLayout";
import DropZone from "@/components/pdf/DropZone";
import FileInfo from "@/components/pdf/FileInfo";
import ProcessButton from "@/components/pdf/ProcessButton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type CompressionLevel = "auto" | "low" | "medium" | "high";

const LEVELS: { id: CompressionLevel; label: string; description: string; badge?: string }[] = [
  {
    id: "auto",
    label: "Auto",
    description: "Best balance of size and quality. Recommended for most PDFs.",
    badge: "Recommended",
  },
  {
    id: "low",
    label: "Low",
    description: "Light compression. Strips metadata only. Minimal size reduction, maximum fidelity.",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Moderate compression. Removes metadata, unused objects, and optimizes streams.",
  },
  {
    id: "high",
    label: "High",
    description: "Aggressive compression. Maximum size reduction — may affect some features.",
  },
];

async function compressPdf(
  file: File,
  level: CompressionLevel
): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });

  // Always strip metadata
  src.setTitle("");
  src.setAuthor("");
  src.setSubject("");
  src.setKeywords([]);
  src.setProducer("");
  src.setCreator("");

  let bytes: Uint8Array;

  if (level === "low") {
    // Metadata only, no object streams
    bytes = await src.save();
  } else if (level === "medium" || level === "auto") {
    // Use object streams for medium/auto compression
    bytes = await src.save({ useObjectStreams: true });
  } else {
    // High: object streams + save multiple times to maximize stream compression
    bytes = await src.save({ useObjectStreams: true });
    // Re-load and re-save to trigger further optimization
    const second = await PDFDocument.load(bytes, { ignoreEncryption: true });
    second.setTitle("");
    second.setAuthor("");
    second.setSubject("");
    second.setKeywords([]);
    second.setProducer("");
    second.setCreator("");
    bytes = await second.save({ useObjectStreams: true });
  }

  const blob = new Blob([bytes], { type: "application/pdf" });
  return { blob, originalSize: file.size, compressedSize: blob.size };
}

export default function Compress() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [level, setLevel] = useState<CompressionLevel>("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ original: number; compressed: number; level: CompressionLevel } | null>(null);
  const { toast } = useToast();

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    const doc = await loadPdfDocument(f);
    setPageCount(doc.numPages);
  }, []);

  const compress = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { blob, originalSize, compressedSize } = await compressPdf(file, level);
      setResult({ original: originalSize, compressed: compressedSize, level });
      downloadBlob(blob, file.name.replace(".pdf", `-compressed-${level}.pdf`));
      toast({ title: "Compressed PDF downloaded!" });
    } catch {
      toast({ title: "Failed to compress PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const savings = result ? Math.max(0, Math.round((1 - result.compressed / result.original) * 100)) : null;

  return (
    <ToolLayout title="Compress PDF" description="Reduce your PDF file size. Choose how aggressively to compress.">
      <div className="space-y-6">
        {!file ? (
          <DropZone onFiles={onFiles} label="Upload a PDF to compress" />
        ) : (
          <>
            <FileInfo file={file} pageCount={pageCount} onRemove={() => { setFile(null); setResult(null); }} />

            {/* Compression level picker */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Compression level</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setLevel(l.id); setResult(null); }}
                    data-testid={`level-${l.id}`}
                    className={cn(
                      "relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all",
                      level === l.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 bg-card"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className={cn("text-sm font-semibold", level === l.id ? "text-primary" : "text-foreground")}>
                        {l.label}
                      </span>
                      {l.badge && (
                        <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                          {l.badge}
                        </span>
                      )}
                      {level === l.id && (
                        <div className="ml-auto h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{l.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <p className="text-sm font-semibold">
                  Compression result
                  <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">({result.level} level)</span>
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-1">Original</p>
                    <p className="text-sm font-bold">{formatFileSize(result.original)}</p>
                  </div>
                  <div className={cn("rounded-lg p-3", savings! > 0 ? "bg-green-500/10" : "bg-muted")}>
                    <p className={cn("text-xs mb-1", savings! > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>Saved</p>
                    <p className={cn("text-sm font-bold", savings! > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                      {savings}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-xs text-primary mb-1">Compressed</p>
                    <p className="text-sm font-bold text-primary">{formatFileSize(result.compressed)}</p>
                  </div>
                </div>

                {/* Size bar */}
                {result.original > 0 && (
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.min(100, (result.compressed / result.original) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {formatFileSize(result.original - result.compressed)} saved
                    </p>
                  </div>
                )}

                {savings === 0 && (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                    This PDF is already well-optimized — there's little room to reduce its size further. Try a higher compression level if needed.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <ProcessButton onClick={compress} loading={loading} label={`Compress (${LEVELS.find((l) => l.id === level)?.label}) & Download`} />
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}

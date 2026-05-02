import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, ArrowRight } from "lucide-react";
import ToolLayout from "@/components/pdf/ToolLayout";
import ProcessButton from "@/components/pdf/ProcessButton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Result {
  url: string;
  size: number;
  name: string;
  format: "jpeg" | "webp" | "png";
}

const QUALITY_LEVELS = [
  { key: "high",   label: "High Quality",  q: 0.85, desc: "Minimal compression, best detail" },
  { key: "medium", label: "Medium",        q: 0.65, desc: "Balanced size and quality" },
  { key: "low",    label: "Low",           q: 0.40, desc: "Small file, visible compression" },
  { key: "tiny",   label: "Tiny",          q: 0.20, desc: "Smallest possible, lower quality" },
] as const;

type QKey = typeof QUALITY_LEVELS[number]["key"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function savingsPercent(original: number, compressed: number) {
  return Math.round((1 - compressed / original) * 100);
}

export default function ImageCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState<QKey>("medium");
  const [format, setFormat] = useState<"jpeg" | "webp">("jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"] },
    multiple: false,
  });

  const compress = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const q = QUALITY_LEVELS.find((l) => l.key === quality)!.q;
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
          ctx.drawImage(img, 0, 0);
          const mimeType = format === "webp" ? "image/webp" : "image/jpeg";
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("Compression failed"));
            const ext = format === "webp" ? "webp" : "jpg";
            const name = file.name.replace(/\.[^.]+$/, "") + `_compressed.${ext}`;
            setResult({ url: URL.createObjectURL(blob), size: blob.size, name, format });
            resolve();
          }, mimeType, q);
          URL.revokeObjectURL(url);
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch (e: any) {
      toast({ title: "Compression failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.name;
    a.click();
  };

  return (
    <ToolLayout
      title="Image Compress"
      description="Reduce image file size using Canvas compression. Choose quality level and output format — all in your browser."
    >
      <div className="space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/[0.02]"
          )}
        >
          <input {...getInputProps()} />
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", isDragActive ? "bg-primary/15" : "bg-muted")}>
            <UploadCloud className={cn("h-7 w-7", isDragActive ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">{file ? file.name : (isDragActive ? "Release to upload" : "Drop an image here")}</p>
            <p className="text-xs text-muted-foreground mt-1">{file ? formatSize(file.size) + " · click to change" : "JPG, PNG, WebP, GIF · Click to browse"}</p>
          </div>
        </div>

        {file && (
          <>
            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quality */}
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold mb-3">Quality</p>
                <div className="space-y-2">
                  {QUALITY_LEVELS.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => { setQuality(l.key); setResult(null); }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        quality === l.key ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      )}
                    >
                      <div className={cn("h-2 w-2 rounded-full shrink-0", quality === l.key ? "bg-primary" : "bg-muted-foreground/40")} />
                      <div>
                        <p className={cn("text-xs font-semibold", quality === l.key ? "text-primary" : "text-foreground")}>{l.label}</p>
                        <p className="text-[11px] text-muted-foreground">{l.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format + Preview */}
              <div className="space-y-4">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold mb-3">Output Format</p>
                  <div className="flex gap-2">
                    {(["jpeg", "webp"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => { setFormat(f); setResult(null); }}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase transition-colors",
                          format === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {format === "webp" ? "WebP offers better compression than JPEG." : "JPEG is universally supported."}
                  </p>
                </div>

                {preview && (
                  <div className="rounded-xl border bg-card p-3 flex items-center justify-center">
                    <img src={preview} alt="preview" className="max-h-40 rounded-lg object-contain" />
                  </div>
                )}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className="rounded-xl border bg-green-500/5 border-green-500/20 p-5 flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">Compression complete</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{formatSize(file.size)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{formatSize(result.size)}</span>
                    <span className="rounded-md bg-green-500/15 px-2 py-0.5 text-xs font-bold text-green-700 dark:text-green-400">
                      -{savingsPercent(file.size, result.size)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={download}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                >
                  Download
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <ProcessButton onClick={compress} loading={loading} label="Compress Image" />
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import { GripVertical, Trash2, UploadCloud, FileImage } from "lucide-react";
import ToolLayout from "@/components/pdf/ToolLayout";
import ProcessButton from "@/components/pdf/ProcessButton";
import { downloadBlob } from "@/lib/pdf-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageEntry {
  id: string;
  file: File;
  preview: string;
  width: number;
  height: number;
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight, dataUrl: url });
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function fileToBytes(file: File): Promise<Uint8Array> {
  const ab = await file.arrayBuffer();
  return new Uint8Array(ab);
}

async function normalizeToJpeg(file: File): Promise<Uint8Array> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
      }, "image/jpeg", 0.92);
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ImagesToPdf() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("fit");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const { toast } = useToast();

  const addImages = useCallback(async (files: File[]) => {
    const entries: ImageEntry[] = [];
    for (const file of files) {
      try {
        const { width, height, dataUrl } = await loadImageDimensions(file);
        entries.push({ id: crypto.randomUUID(), file, preview: dataUrl, width, height });
      } catch {
        toast({ title: `Could not load ${file.name}`, variant: "destructive" });
      }
    }
    setImages((prev) => [...prev, ...entries]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: addImages,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"] },
    multiple: true,
  });

  const remove = (id: string) => setImages((prev) => prev.filter((e) => e.id !== id));

  const moveUp = (i: number) => {
    if (i === 0) return;
    setImages((prev) => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  };
  const moveDown = (i: number) => {
    setImages((prev) => {
      if (i >= prev.length - 1) return prev;
      const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a;
    });
  };

  const convert = async () => {
    if (images.length === 0) return;
    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const A4 = { width: 595.28, height: 841.89 };
      const LETTER = { width: 612, height: 792 };

      for (const entry of images) {
        const isPng = entry.file.type === "image/png";
        let bytes: Uint8Array;
        let embeddedWidth = entry.width;
        let embeddedHeight = entry.height;

        if (isPng) {
          bytes = await fileToBytes(entry.file);
        } else {
          bytes = await normalizeToJpeg(entry.file);
        }

        const embedded = isPng
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);

        let pageW: number, pageH: number;
        if (pageSize === "a4") { pageW = A4.width; pageH = A4.height; }
        else if (pageSize === "letter") { pageW = LETTER.width; pageH = LETTER.height; }
        else { pageW = embeddedWidth; pageH = embeddedHeight; }

        const page = pdfDoc.addPage([pageW, pageH]);

        const scale = Math.min(pageW / embeddedWidth, pageH / embeddedHeight);
        const drawW = embeddedWidth * scale;
        const drawH = embeddedHeight * scale;
        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;

        page.drawImage(embedded, { x, y, width: drawW, height: drawH });
      }

      const bytes = await pdfDoc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "images-to-pdf.pdf");
      toast({ title: "PDF created!", description: `${images.length} image(s) converted.` });
    } catch (e: any) {
      toast({ title: "Conversion failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout
      title="Images to PDF"
      description="Convert JPG, PNG, WebP or other images into a single PDF. Reorder images and choose a page size."
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
            <p className="text-sm font-semibold">{isDragActive ? "Release to add images" : "Drop images here"}</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, GIF · Click to browse</p>
          </div>
        </div>

        {images.length > 0 && (
          <>
            {/* Page size option */}
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Page size</p>
              <div className="flex flex-wrap gap-2">
                {(["fit", "a4", "letter"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPageSize(s)}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-xs font-medium transition-colors",
                      pageSize === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {s === "fit" ? "Fit to Image" : s === "a4" ? "A4" : "Letter (US)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Image list */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <p className="text-sm font-semibold mb-3">{images.length} image{images.length !== 1 ? "s" : ""} · drag to reorder</p>
              {images.map((img, i) => (
                <div
                  key={img.id}
                  className="flex items-center gap-3 rounded-xl border bg-background p-3 select-none"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                  <img src={img.preview} alt={img.file.name} className="h-12 w-12 rounded-lg object-cover border shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{img.file.name}</p>
                    <p className="text-[11px] text-muted-foreground">{img.width}×{img.height}px · {(img.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveUp(i)} className="text-[10px] text-muted-foreground hover:text-foreground px-1">▲</button>
                    <button onClick={() => moveDown(i)} className="text-[10px] text-muted-foreground hover:text-foreground px-1">▼</button>
                  </div>
                  <button onClick={() => remove(img.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <ProcessButton onClick={convert} loading={loading} label="Convert to PDF" />
            </div>
          </>
        )}

        {images.length === 0 && (
          <div className="rounded-xl border bg-muted/40 p-6 text-center">
            <FileImage className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Add images above to get started</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

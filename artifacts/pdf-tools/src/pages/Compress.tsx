import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { loadPdfDocument, downloadBlob, formatFileSize } from "@/lib/pdf-utils";
import ToolLayout from "@/components/pdf/ToolLayout";
import DropZone from "@/components/pdf/DropZone";
import FileInfo from "@/components/pdf/FileInfo";
import ProcessButton from "@/components/pdf/ProcessButton";
import { useToast } from "@/hooks/use-toast";
import { pdfjsLib } from "@/lib/pdf-utils";

export default function Compress() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ original: number; compressed: number } | null>(null);
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
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });

      // Remove metadata to save space
      src.setTitle("");
      src.setAuthor("");
      src.setSubject("");
      src.setKeywords([]);
      src.setProducer("");
      src.setCreator("");

      const bytes = await src.save({ useObjectStreams: true });
      const compressed = new Blob([bytes], { type: "application/pdf" });
      setResult({ original: file.size, compressed: compressed.size });
      downloadBlob(compressed, file.name.replace(".pdf", "-compressed.pdf"));
      toast({ title: "Compressed PDF downloaded!" });
    } catch {
      toast({ title: "Failed to compress PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const savings = result ? Math.max(0, Math.round((1 - result.compressed / result.original) * 100)) : null;

  return (
    <ToolLayout title="Compress PDF" description="Reduce file size by removing metadata and optimizing the PDF structure.">
      <div className="space-y-6">
        {!file ? (
          <DropZone onFiles={onFiles} label="Upload a PDF to compress" />
        ) : (
          <>
            <FileInfo file={file} pageCount={pageCount} onRemove={() => { setFile(null); setResult(null); }} />

            {result && (
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <p className="text-sm font-medium">Compression result</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-1">Original</p>
                    <p className="text-base font-semibold">{formatFileSize(result.original)}</p>
                  </div>
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">Saved</p>
                    <p className="text-base font-semibold text-green-600 dark:text-green-400">{savings}%</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-xs text-primary mb-1">Compressed</p>
                    <p className="text-base font-semibold text-primary">{formatFileSize(result.compressed)}</p>
                  </div>
                </div>
                {savings === 0 && (
                  <p className="text-xs text-muted-foreground">
                    This PDF is already well-optimized. Compression had minimal effect.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <ProcessButton onClick={compress} loading={loading} label="Compress & Download" />
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}

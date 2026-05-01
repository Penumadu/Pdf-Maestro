import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { loadPdfDocument, downloadBlob } from "@/lib/pdf-utils";
import { pdfjsLib } from "@/lib/pdf-utils";
import ToolLayout from "@/components/pdf/ToolLayout";
import DropZone from "@/components/pdf/DropZone";
import FileInfo from "@/components/pdf/FileInfo";
import ProcessButton from "@/components/pdf/ProcessButton";
import PageThumbnail from "@/components/pdf/PageThumbnail";
import { useToast } from "@/hooks/use-toast";

export default function Extract() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    const doc = await loadPdfDocument(f);
    setPdfDoc(doc);
    setPageCount(doc.numPages);
    setSelected(new Set());
  }, []);

  const toggle = (n: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const extract = async () => {
    if (!file || selected.size === 0) {
      toast({ title: "Select at least one page", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf);
      const out = await PDFDocument.create();
      const pages = Array.from(selected).sort((a, b) => a - b).map((n) => n - 1);
      const copied = await out.copyPages(src, pages);
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "extracted-pages.pdf");
      toast({ title: `Extracted ${selected.size} page${selected.size > 1 ? "s" : ""}!` });
    } catch {
      toast({ title: "Failed to extract pages", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout title="Extract Pages" description="Select specific pages to extract into a new PDF.">
      <div className="space-y-6">
        {!file ? (
          <DropZone onFiles={onFiles} label="Upload a PDF to extract pages from" />
        ) : (
          <>
            <FileInfo file={file} pageCount={pageCount} onRemove={() => { setFile(null); setPdfDoc(null); }} />

            {pdfDoc && (
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Select pages to extract ({selected.size} selected)</p>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))} className="text-primary hover:underline" data-testid="extract-select-all">Select all</button>
                    <span className="text-muted-foreground/40">·</span>
                    <button onClick={() => setSelected(new Set())} className="text-primary hover:underline" data-testid="extract-deselect-all">Deselect all</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 max-h-72 overflow-y-auto">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                    <PageThumbnail
                      key={n}
                      doc={pdfDoc}
                      pageNum={n}
                      selected={selected.has(n)}
                      onClick={() => toggle(n)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <ProcessButton
                onClick={extract}
                loading={loading}
                label={`Extract ${selected.size > 0 ? selected.size : ""} Page${selected.size !== 1 ? "s" : ""}`}
                disabled={selected.size === 0}
              />
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}

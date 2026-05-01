import { useState, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { loadPdfDocument, downloadBlob } from "@/lib/pdf-utils";
import { pdfjsLib } from "@/lib/pdf-utils";
import ToolLayout from "@/components/pdf/ToolLayout";
import DropZone from "@/components/pdf/DropZone";
import FileInfo from "@/components/pdf/FileInfo";
import ProcessButton from "@/components/pdf/ProcessButton";
import PageThumbnail from "@/components/pdf/PageThumbnail";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type SplitMode = "range" | "individual";

export default function Split() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<SplitMode>("range");
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("1");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    const doc = await loadPdfDocument(f);
    setPdfDoc(doc);
    setPageCount(doc.numPages);
    setRangeFrom("1");
    setRangeTo(String(doc.numPages));
    setSelectedPages(new Set(Array.from({ length: doc.numPages }, (_, i) => i + 1)));
  }, []);

  const togglePage = (n: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const selectAll = () => setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
  const deselectAll = () => setSelectedPages(new Set());

  const splitPdf = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      if (mode === "individual") {
        const pages = Array.from(selectedPages).sort((a, b) => a - b);
        for (const p of pages) {
          const src = await PDFDocument.load(buf);
          const out = await PDFDocument.create();
          const [copied] = await out.copyPages(src, [p - 1]);
          out.addPage(copied);
          const bytes = await out.save();
          downloadBlob(new Blob([bytes], { type: "application/pdf" }), `page-${p}.pdf`);
        }
        toast({ title: `Downloaded ${pages.length} page${pages.length > 1 ? "s" : ""}` });
      } else {
        const from = parseInt(rangeFrom) - 1;
        const to = parseInt(rangeTo) - 1;
        if (from < 0 || to >= pageCount || from > to) {
          toast({ title: "Invalid page range", variant: "destructive" });
          setLoading(false);
          return;
        }
        const src = await PDFDocument.load(buf);
        const out = await PDFDocument.create();
        const indices = Array.from({ length: to - from + 1 }, (_, i) => from + i);
        const copied = await out.copyPages(src, indices);
        copied.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        downloadBlob(new Blob([bytes], { type: "application/pdf" }), `pages-${from + 1}-${to + 1}.pdf`);
        toast({ title: "Pages extracted and downloaded!" });
      }
    } catch {
      toast({ title: "Failed to split PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout title="Split PDF" description="Extract specific pages or page ranges from a PDF.">
      <div className="space-y-6">
        {!file ? (
          <DropZone onFiles={onFiles} label="Upload a PDF to split" />
        ) : (
          <>
            <FileInfo file={file} pageCount={pageCount} onRemove={() => { setFile(null); setPdfDoc(null); }} />

            <div className="flex gap-2">
              <Button
                variant={mode === "range" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("range")}
                data-testid="mode-range"
              >
                Page Range
              </Button>
              <Button
                variant={mode === "individual" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("individual")}
                data-testid="mode-individual"
              >
                Select Pages
              </Button>
            </div>

            {mode === "range" ? (
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <p className="text-sm font-medium">Select page range</p>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">From page</label>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                      data-testid="range-from"
                      className="w-20 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <span className="mt-5 text-muted-foreground">–</span>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">To page</label>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                      data-testid="range-to"
                      className="w-20 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <span className="mt-5 text-xs text-muted-foreground">of {pageCount}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Select pages ({selectedPages.size} selected)
                  </p>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs text-primary hover:underline" data-testid="select-all">Select all</button>
                    <span className="text-muted-foreground/40">·</span>
                    <button onClick={deselectAll} className="text-xs text-primary hover:underline" data-testid="deselect-all">Deselect all</button>
                  </div>
                </div>
                {pdfDoc && (
                  <div className="flex flex-wrap gap-3 max-h-64 overflow-y-auto">
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                      <PageThumbnail
                        key={n}
                        doc={pdfDoc}
                        pageNum={n}
                        selected={selectedPages.has(n)}
                        onClick={() => togglePage(n)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <ProcessButton
                onClick={splitPdf}
                loading={loading}
                label={mode === "individual" ? `Download ${selectedPages.size} Page${selectedPages.size !== 1 ? "s" : ""}` : "Extract & Download"}
                disabled={mode === "individual" && selectedPages.size === 0}
              />
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}

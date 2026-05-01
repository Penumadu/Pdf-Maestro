import { useState, useCallback } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { loadPdfDocument, downloadBlob } from "@/lib/pdf-utils";
import { pdfjsLib } from "@/lib/pdf-utils";
import ToolLayout from "@/components/pdf/ToolLayout";
import DropZone from "@/components/pdf/DropZone";
import FileInfo from "@/components/pdf/FileInfo";
import ProcessButton from "@/components/pdf/ProcessButton";
import PageThumbnail from "@/components/pdf/PageThumbnail";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RotateCcw, RotateCw } from "lucide-react";

export default function Rotate() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rotations, setRotations] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    const doc = await loadPdfDocument(f);
    setPdfDoc(doc);
    setPageCount(doc.numPages);
    setRotations(Array(doc.numPages).fill(0));
  }, []);

  const rotateOne = (idx: number, dir: 90 | -90) => {
    setRotations((prev) => {
      const next = [...prev];
      next[idx] = ((next[idx] + dir) % 360 + 360) % 360;
      return next;
    });
  };

  const rotateAll = (dir: 90 | -90) => {
    setRotations((prev) => prev.map((r) => ((r + dir) % 360 + 360) % 360));
  };

  const applyRotations = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf);
      const pages = src.getPages();
      pages.forEach((p, i) => {
        const current = p.getRotation().angle;
        p.setRotation(degrees((current + rotations[i]) % 360));
      });
      const bytes = await src.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), file.name.replace(".pdf", "-rotated.pdf"));
      toast({ title: "Rotated PDF downloaded!" });
    } catch {
      toast({ title: "Failed to rotate PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout title="Rotate PDF" description="Rotate individual pages or all pages in your PDF.">
      <div className="space-y-6">
        {!file ? (
          <DropZone onFiles={onFiles} label="Upload a PDF to rotate" />
        ) : (
          <>
            <FileInfo file={file} pageCount={pageCount} onRemove={() => { setFile(null); setPdfDoc(null); }} />

            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium mr-2">Rotate all pages:</span>
              <Button variant="outline" size="sm" onClick={() => rotateAll(-90)} data-testid="rotate-all-left">
                <RotateCcw className="h-4 w-4 mr-1" /> 90° Left
              </Button>
              <Button variant="outline" size="sm" onClick={() => rotateAll(90)} data-testid="rotate-all-right">
                <RotateCw className="h-4 w-4 mr-1" /> 90° Right
              </Button>
            </div>

            {pdfDoc && (
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <p className="text-sm font-medium">Individual page rotations</p>
                <div className="flex flex-wrap gap-4 max-h-80 overflow-y-auto">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n, idx) => (
                    <div key={n} className="flex flex-col items-center gap-1">
                      <div style={{ transform: `rotate(${rotations[idx]}deg)`, transition: "transform 0.2s" }}>
                        <PageThumbnail doc={pdfDoc} pageNum={n} />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => rotateOne(idx, -90)}
                          className="h-6 w-6 rounded border bg-card hover:bg-muted flex items-center justify-center transition-colors"
                          data-testid={`rotate-left-${n}`}
                          title="Rotate left 90°"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => rotateOne(idx, 90)}
                          className="h-6 w-6 rounded border bg-card hover:bg-muted flex items-center justify-center transition-colors"
                          data-testid={`rotate-right-${n}`}
                          title="Rotate right 90°"
                        >
                          <RotateCw className="h-3 w-3" />
                        </button>
                      </div>
                      {rotations[idx] !== 0 && (
                        <span className="text-xs text-primary">{rotations[idx]}°</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <ProcessButton onClick={applyRotations} loading={loading} label="Apply & Download" />
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}

import { useState, useCallback } from "react";
import { loadPdfDocument, renderPageToDataUrl, downloadBlob } from "@/lib/pdf-utils";
import { pdfjsLib } from "@/lib/pdf-utils";
import ToolLayout from "@/components/pdf/ToolLayout";
import DropZone from "@/components/pdf/DropZone";
import FileInfo from "@/components/pdf/FileInfo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import JSZip from "jszip";

export default function PdfToImages() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setLoading(true);
    setPreviews([]);
    try {
      const doc = await loadPdfDocument(f);
      setPdfDoc(doc);
      setPageCount(doc.numPages);
      const thumbs: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const url = await renderPageToDataUrl(page, 0.4);
        thumbs.push(url);
      }
      setPreviews(thumbs);
    } catch {
      toast({ title: "Failed to load PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadOne = async (pageNum: number) => {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(pageNum);
    const url = await renderPageToDataUrl(page, 2.0);
    const res = await fetch(url);
    const blob = await res.blob();
    downloadBlob(blob, `page-${pageNum}.png`);
  };

  const downloadAll = async () => {
    if (!pdfDoc) return;
    setConverting(true);
    setProgress(0);
    try {
      const zip = new JSZip();
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const url = await renderPageToDataUrl(page, 2.0);
        const res = await fetch(url);
        const blob = await res.blob();
        zip.file(`page-${i}.png`, blob);
        setProgress(Math.round((i / pdfDoc.numPages) * 100));
      }
      const content = await zip.generateAsync({ type: "blob" });
      downloadBlob(content, "pdf-images.zip");
      toast({ title: "All pages downloaded as ZIP!" });
    } catch {
      toast({ title: "Failed to convert pages", variant: "destructive" });
    } finally {
      setConverting(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="PDF to Images" description="Convert each PDF page to a high-quality PNG image.">
      <div className="space-y-6">
        {!file ? (
          <DropZone onFiles={onFiles} label="Upload a PDF to convert" />
        ) : (
          <>
            <FileInfo file={file} pageCount={pageCount} onRemove={() => { setFile(null); setPdfDoc(null); setPreviews([]); }} />

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Rendering pages...</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={downloadAll}
                    disabled={converting}
                    data-testid="download-all-zip"
                    className="gap-2"
                  >
                    {converting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {progress}%
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download all as ZIP
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {previews.map((src, i) => (
                    <div key={i} className="group relative rounded-lg overflow-hidden border bg-card">
                      <img src={src} alt={`Page ${i + 1}`} className="w-full object-contain" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => downloadOne(i + 1)}
                          data-testid={`download-page-${i + 1}`}
                          className="gap-1 text-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download PNG
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1">
                        Page {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}

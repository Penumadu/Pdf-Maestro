import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { GripVertical, Trash2, FileText, Plus } from "lucide-react";
import ToolLayout from "@/components/pdf/ToolLayout";
import DropZone from "@/components/pdf/DropZone";
import ProcessButton from "@/components/pdf/ProcessButton";
import { formatFileSize, downloadBlob } from "@/lib/pdf-utils";
import { useToast } from "@/hooks/use-toast";

interface PdfEntry {
  id: string;
  file: File;
}

export default function Merge() {
  const [files, setFiles] = useState<PdfEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const { toast } = useToast();

  const onFiles = useCallback((accepted: File[]) => {
    const entries = accepted.map((f) => ({ id: crypto.randomUUID(), file: f }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = (id: string) => setFiles((prev) => prev.filter((e) => e.id !== id));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setFiles((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    setFiles((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const merge = async () => {
    if (files.length < 2) {
      toast({ title: "Add at least 2 PDF files to merge", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const merged = await PDFDocument.create();
      for (const entry of files) {
        const buf = await entry.file.arrayBuffer();
        const doc = await PDFDocument.load(buf);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const bytes = await merged.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "merged.pdf");
      toast({ title: "PDF merged and downloaded!" });
    } catch {
      toast({ title: "Failed to merge PDFs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout title="Merge PDFs" description="Combine multiple PDF files into a single document. Drag to reorder.">
      <div className="space-y-6">
        <DropZone onFiles={onFiles} multiple label="Add PDF files" sublabel="You can add multiple files at once" />

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Files to merge ({files.length})</p>
            <div className="space-y-2">
              {files.map((entry, idx) => (
                <div
                  key={entry.id}
                  data-testid={`merge-file-${idx}`}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
                  <div className="rounded-md bg-primary/10 p-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(entry.file.size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors text-xs"
                      data-testid={`move-up-${idx}`}
                    >↑</button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === files.length - 1}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors text-xs"
                      data-testid={`move-down-${idx}`}
                    >↓</button>
                    <button
                      onClick={() => removeFile(entry.id)}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      data-testid={`remove-merge-${idx}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = ".pdf"; input.multiple = true; input.onchange = (e) => { const f = Array.from((e.target as HTMLInputElement).files ?? []); onFiles(f); }; input.click(); }}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                data-testid="add-more-files"
              >
                <Plus className="h-3.5 w-3.5" /> Add more files
              </button>
              <ProcessButton onClick={merge} loading={loading} label="Merge & Download" />
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

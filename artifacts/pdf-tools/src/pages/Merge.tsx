import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { GripVertical, Trash2, FileText, Plus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import ToolLayout from "@/components/pdf/ToolLayout";
import DropZone from "@/components/pdf/DropZone";
import ProcessButton from "@/components/pdf/ProcessButton";
import PageThumbnail from "@/components/pdf/PageThumbnail";
import { formatFileSize, downloadBlob, loadPdfDocument } from "@/lib/pdf-utils";
import { pdfjsLib } from "@/lib/pdf-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PdfEntry {
  id: string;
  file: File;
  pageCount: number;
  doc: pdfjsLib.PDFDocumentProxy | null;
  selectedPages: Set<number>;
  expanded: boolean;
  loading: boolean;
}

export default function Merge() {
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const onFiles = useCallback(async (files: File[]) => {
    const newEntries: PdfEntry[] = files.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      pageCount: 0,
      doc: null,
      selectedPages: new Set<number>(),
      expanded: false,
      loading: true,
    }));
    setEntries((prev) => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      try {
        const doc = await loadPdfDocument(entry.file);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? {
                  ...e,
                  doc,
                  pageCount: doc.numPages,
                  selectedPages: new Set(Array.from({ length: doc.numPages }, (_, i) => i + 1)),
                  loading: false,
                }
              : e
          )
        );
      } catch {
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, loading: false } : e)));
      }
    }
  }, []);

  const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setEntries((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    setEntries((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e)));
  };

  const togglePage = (id: string, pageNum: number) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const next = new Set(e.selectedPages);
        if (next.has(pageNum)) next.delete(pageNum);
        else next.add(pageNum);
        return { ...e, selectedPages: next };
      })
    );
  };

  const selectAll = (id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, selectedPages: new Set(Array.from({ length: e.pageCount }, (_, i) => i + 1)) }
          : e
      )
    );
  };

  const deselectAll = (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, selectedPages: new Set<number>() } : e)));
  };

  const totalSelectedPages = entries.reduce((sum, e) => sum + e.selectedPages.size, 0);

  const merge = async () => {
    if (entries.length < 2) {
      toast({ title: "Add at least 2 PDF files to merge", variant: "destructive" });
      return;
    }
    if (totalSelectedPages === 0) {
      toast({ title: "Select at least one page to include", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const merged = await PDFDocument.create();
      for (const entry of entries) {
        if (entry.selectedPages.size === 0) continue;
        const buf = await entry.file.arrayBuffer();
        const doc = await PDFDocument.load(buf);
        const pages = Array.from(entry.selectedPages).sort((a, b) => a - b).map((n) => n - 1);
        const copied = await merged.copyPages(doc, pages);
        copied.forEach((p) => merged.addPage(p));
      }
      const bytes = await merged.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "merged.pdf");
      toast({ title: `PDF merged (${totalSelectedPages} pages) and downloaded!` });
    } catch {
      toast({ title: "Failed to merge PDFs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout title="Merge PDFs" description="Combine multiple PDFs. Choose specific pages from each file to include.">
      <div className="space-y-6">
        <DropZone onFiles={onFiles} multiple label="Add PDF files" sublabel="Select multiple files at once" />

        {entries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{entries.length} file{entries.length !== 1 ? "s" : ""} · {totalSelectedPages} page{totalSelectedPages !== 1 ? "s" : ""} selected</p>
              <button
                onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = ".pdf"; input.multiple = true; input.onchange = (e) => { const f = Array.from((e.target as HTMLInputElement).files ?? []); onFiles(f); }; input.click(); }}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                data-testid="add-more-files"
              >
                <Plus className="h-3.5 w-3.5" /> Add more
              </button>
            </div>

            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  data-testid={`merge-file-${idx}`}
                  className="rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-sm"
                >
                  {/* File header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="rounded-md bg-primary/10 p-1.5 shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(entry.file.size)}
                        {entry.loading ? (
                          <span className="ml-1 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</span>
                        ) : (
                          <span> · {entry.selectedPages.size}/{entry.pageCount} page{entry.pageCount !== 1 ? "s" : ""} selected</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded disabled:opacity-30 text-xs transition-colors" data-testid={`move-up-${idx}`}>↑</button>
                      <button onClick={() => moveDown(idx)} disabled={idx === entries.length - 1} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded disabled:opacity-30 text-xs transition-colors" data-testid={`move-down-${idx}`}>↓</button>
                      {!entry.loading && entry.pageCount > 0 && (
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          data-testid={`expand-${idx}`}
                          title="Select pages"
                        >
                          {entry.expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        data-testid={`remove-merge-${idx}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Page picker (expandable) */}
                  {entry.expanded && entry.doc && (
                    <div className="border-t bg-muted/30 px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Select pages to include
                        </span>
                        <div className="flex gap-3 text-xs">
                          <button onClick={() => selectAll(entry.id)} className="text-primary hover:underline" data-testid={`select-all-${idx}`}>All</button>
                          <button onClick={() => deselectAll(entry.id)} className="text-primary hover:underline" data-testid={`deselect-all-${idx}`}>None</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                        {Array.from({ length: entry.pageCount }, (_, i) => i + 1).map((n) => (
                          <div key={n} className="relative">
                            <PageThumbnail
                              doc={entry.doc!}
                              pageNum={n}
                              selected={entry.selectedPages.has(n)}
                              onClick={() => togglePage(entry.id, n)}
                            />
                            {!entry.selectedPages.has(n) && (
                              <div className="absolute inset-0 rounded-md bg-background/60 pointer-events-none" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <ProcessButton onClick={merge} loading={loading} label={`Merge ${totalSelectedPages} Page${totalSelectedPages !== 1 ? "s" : ""} & Download`} disabled={totalSelectedPages === 0} />
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

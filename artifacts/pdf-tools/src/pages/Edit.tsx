import { useState, useCallback, useRef, useEffect } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { loadPdfDocument, downloadBlob } from "@/lib/pdf-utils";
import { pdfjsLib } from "@/lib/pdf-utils";
import ToolLayout from "@/components/pdf/ToolLayout";
import DropZone from "@/components/pdf/DropZone";
import FileInfo from "@/components/pdf/FileInfo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Type,
  Highlighter,
  PenLine,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "select" | "text" | "highlight" | "draw";

interface TextAnnotation {
  type: "text";
  id: string;
  page: number;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

interface HighlightAnnotation {
  type: "highlight";
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface DrawAnnotation {
  type: "draw";
  id: string;
  page: number;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

type Annotation = TextAnnotation | HighlightAnnotation | DrawAnnotation;

const SCALE = 1.5;

function PageCanvas({
  doc,
  pageNum,
  annotations,
  tool,
  color,
  fontSize,
  strokeWidth,
  onAddAnnotation,
  onDeleteAnnotation,
}: {
  doc: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  annotations: Annotation[];
  tool: Tool;
  color: string;
  fontSize: number;
  strokeWidth: number;
  onAddAnnotation: (a: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [highlightStart, setHighlightStart] = useState<{ x: number; y: number } | null>(null);
  const [hlRect, setHlRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editingText, setEditingText] = useState<{ x: number; y: number; id?: string } | null>(null);
  const [textVal, setTextVal] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const page = await doc.getPage(pageNum);
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const viewport = page.getViewport({ scale: SCALE });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setDims({ w: viewport.width, h: viewport.height });
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
    }
    render();
    return () => { cancelled = true; };
  }, [doc, pageNum]);

  const getPos = (e: React.MouseEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === "draw") {
      setDrawing(true);
      const p = getPos(e);
      setCurrentPath([p]);
    } else if (tool === "highlight") {
      setHighlightStart(getPos(e));
    } else if (tool === "text") {
      const p = getPos(e);
      setEditingText(p);
      setTextVal("");
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tool === "draw" && drawing) {
      const p = getPos(e);
      setCurrentPath((prev) => [...prev, p]);
    } else if (tool === "highlight" && highlightStart) {
      const p = getPos(e);
      setHlRect({
        x: Math.min(highlightStart.x, p.x),
        y: Math.min(highlightStart.y, p.y),
        w: Math.abs(p.x - highlightStart.x),
        h: Math.abs(p.y - highlightStart.y),
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (tool === "draw" && drawing) {
      if (currentPath.length > 1) {
        onAddAnnotation({
          type: "draw",
          id: crypto.randomUUID(),
          page: pageNum,
          points: currentPath,
          color,
          strokeWidth,
        });
      }
      setDrawing(false);
      setCurrentPath([]);
    } else if (tool === "highlight" && highlightStart) {
      const p = getPos(e);
      const w = Math.abs(p.x - highlightStart.x);
      const h = Math.abs(p.y - highlightStart.y);
      if (w > 5 && h > 5) {
        onAddAnnotation({
          type: "highlight",
          id: crypto.randomUUID(),
          page: pageNum,
          x: Math.min(highlightStart.x, p.x),
          y: Math.min(highlightStart.y, p.y),
          width: w,
          height: h,
          color,
        });
      }
      setHighlightStart(null);
      setHlRect(null);
    }
  };

  const confirmText = () => {
    if (editingText && textVal.trim()) {
      onAddAnnotation({
        type: "text",
        id: crypto.randomUUID(),
        page: pageNum,
        x: editingText.x,
        y: editingText.y,
        text: textVal,
        color,
        fontSize,
      });
    }
    setEditingText(null);
    setTextVal("");
  };

  const pageAnnotations = annotations.filter((a) => a.page === pageNum);

  const getCursor = () => {
    if (tool === "draw") return "crosshair";
    if (tool === "highlight") return "crosshair";
    if (tool === "text") return "text";
    return "default";
  };

  return (
    <div className="relative inline-block shadow-lg border rounded-lg overflow-hidden" style={{ width: dims.w, height: dims.h }}>
      <canvas ref={canvasRef} className="block" />

      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        width={dims.w}
        height={dims.h}
        style={{ userSelect: "none" }}
      >
        {pageAnnotations.map((a) => {
          if (a.type === "highlight") {
            return (
              <rect
                key={a.id}
                x={a.x} y={a.y} width={a.width} height={a.height}
                fill={a.color}
                fillOpacity={0.3}
                stroke={a.color}
                strokeOpacity={0.5}
                strokeWidth={1}
              />
            );
          }
          if (a.type === "draw") {
            const d = a.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
            return (
              <path
                key={a.id}
                d={d}
                fill="none"
                stroke={a.color}
                strokeWidth={a.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          }
          return null;
        })}

        {drawing && currentPath.length > 1 && (
          <path
            d={currentPath.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
          />
        )}

        {hlRect && (
          <rect
            x={hlRect.x} y={hlRect.y} width={hlRect.w} height={hlRect.h}
            fill={color}
            fillOpacity={0.25}
            stroke={color}
            strokeDasharray="4 2"
            strokeWidth={1}
          />
        )}
      </svg>

      {pageAnnotations.filter((a) => a.type === "text").map((a) => {
        const t = a as TextAnnotation;
        return (
          <div
            key={t.id}
            className="absolute group"
            style={{ left: t.x, top: t.y - t.fontSize }}
          >
            <span
              style={{ color: t.color, fontSize: t.fontSize, fontFamily: "Helvetica, Arial, sans-serif", whiteSpace: "pre" }}
              className="select-none"
            >
              {t.text}
            </span>
            {tool === "select" && (
              <button
                onClick={() => onDeleteAnnotation(t.id)}
                className="absolute -top-2 -right-2 hidden group-hover:flex h-4 w-4 rounded-full bg-destructive text-white items-center justify-center text-xs"
              >×</button>
            )}
          </div>
        );
      })}

      {editingText && (
        <div className="absolute" style={{ left: editingText.x, top: editingText.y - fontSize }}>
          <input
            autoFocus
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmText(); if (e.key === "Escape") { setEditingText(null); setTextVal(""); } }}
            onBlur={confirmText}
            style={{ color, fontSize, fontFamily: "Helvetica, Arial, sans-serif", background: "transparent", border: "none", outline: "1px dashed " + color, minWidth: 100 }}
            data-testid="text-input"
          />
        </div>
      )}

      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{ cursor: getCursor(), pointerEvents: tool === "select" ? "none" : "all" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {tool === "select" && pageAnnotations.map((a) => {
        if (a.type === "highlight") {
          return (
            <button
              key={a.id}
              onClick={() => onDeleteAnnotation(a.id)}
              className="absolute opacity-0 hover:opacity-100 bg-destructive/80 text-white text-xs rounded px-1"
              style={{ left: a.x + a.width, top: a.y }}
              title="Delete"
            ><Trash2 className="h-3 w-3" /></button>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function Edit() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [tool, setTool] = useState<Tool>("text");
  const [color, setColor] = useState("#2563eb");
  const [fontSize, setFontSize] = useState(16);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setAnnotations([]);
    setCurrentPage(1);
    const doc = await loadPdfDocument(f);
    setPdfDoc(doc);
    setPageCount(doc.numPages);
  }, []);

  const addAnnotation = (a: Annotation) => setAnnotations((prev) => [...prev, a]);
  const deleteAnnotation = (id: string) => setAnnotations((prev) => prev.filter((a) => a.id !== id));
  const clearPage = () => setAnnotations((prev) => prev.filter((a) => a.page !== currentPage));

  const savePdf = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      const helvetica = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();

      for (const a of annotations) {
        const page = pages[a.page - 1];
        const { height } = page.getSize();

        if (a.type === "text") {
          const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return rgb(r, g, b);
          };
          page.drawText(a.text, {
            x: a.x / SCALE,
            y: (height - a.y / SCALE) - a.fontSize / SCALE,
            size: a.fontSize / SCALE,
            font: helvetica,
            color: hexToRgb(a.color),
          });
        } else if (a.type === "highlight") {
          const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return rgb(r, g, b);
          };
          page.drawRectangle({
            x: a.x / SCALE,
            y: height - (a.y + a.height) / SCALE,
            width: a.width / SCALE,
            height: a.height / SCALE,
            color: hexToRgb(a.color),
            opacity: 0.3,
          });
        } else if (a.type === "draw" && a.points.length > 1) {
          const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return rgb(r, g, b);
          };
          for (let i = 0; i < a.points.length - 1; i++) {
            const p1 = a.points[i];
            const p2 = a.points[i + 1];
            page.drawLine({
              start: { x: p1.x / SCALE, y: height - p1.y / SCALE },
              end: { x: p2.x / SCALE, y: height - p2.y / SCALE },
              thickness: a.strokeWidth / SCALE,
              color: hexToRgb(a.color),
            });
          }
        }
      }

      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), file.name.replace(".pdf", "-edited.pdf"));
      toast({ title: "Edited PDF downloaded!" });
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to save PDF", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "select", icon: <span className="text-xs font-bold">S</span>, label: "Select / Delete" },
    { id: "text", icon: <Type className="h-4 w-4" />, label: "Add Text" },
    { id: "highlight", icon: <Highlighter className="h-4 w-4" />, label: "Highlight" },
    { id: "draw", icon: <PenLine className="h-4 w-4" />, label: "Freehand Draw" },
  ];

  const colors = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2", "#000000"];

  return (
    <ToolLayout title="Edit PDF" description="Add text, highlights, and drawings to your PDF. Download when done.">
      <div className="space-y-4">
        {!file ? (
          <DropZone onFiles={onFiles} label="Upload a PDF to edit" />
        ) : (
          <>
            <FileInfo file={file} pageCount={pageCount} onRemove={() => { setFile(null); setPdfDoc(null); setAnnotations([]); }} />

            <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
              <div className="flex gap-1">
                {tools.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    title={t.label}
                    data-testid={`tool-${t.id}`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      tool === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-border" />

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Color:</span>
                <div className="flex gap-1">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition-transform",
                        color === c ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ background: c }}
                      data-testid={`color-${c}`}
                    />
                  ))}
                </div>
              </div>

              {tool === "text" && (
                <>
                  <div className="w-px h-5 bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Size:</span>
                    <input
                      type="number"
                      min={8}
                      max={72}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-14 rounded border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="font-size"
                    />
                  </div>
                </>
              )}

              {tool === "draw" && (
                <>
                  <div className="w-px h-5 bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Width:</span>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-20"
                      data-testid="stroke-width"
                    />
                    <span className="text-xs text-muted-foreground">{strokeWidth}px</span>
                  </div>
                </>
              )}

              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={clearPage} className="gap-1.5 text-xs" data-testid="clear-page">
                  <Trash2 className="h-3.5 w-3.5" /> Clear page
                </Button>
                <Button size="sm" onClick={savePdf} disabled={saving} className="gap-1.5 text-xs" data-testid="save-pdf">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download PDF
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                data-testid="prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page <strong className="text-foreground">{currentPage}</strong> of {pageCount}
                <span className="ml-2 text-xs">
                  ({annotations.filter((a) => a.page === currentPage).length} annotation{annotations.filter((a) => a.page === currentPage).length !== 1 ? "s" : ""})
                </span>
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
                data-testid="next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-auto rounded-xl border bg-muted/30 p-4">
              <div className="flex justify-center">
                {pdfDoc && (
                  <PageCanvas
                    doc={pdfDoc}
                    pageNum={currentPage}
                    annotations={annotations}
                    tool={tool}
                    color={color}
                    fontSize={fontSize}
                    strokeWidth={strokeWidth}
                    onAddAnnotation={addAnnotation}
                    onDeleteAnnotation={deleteAnnotation}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}

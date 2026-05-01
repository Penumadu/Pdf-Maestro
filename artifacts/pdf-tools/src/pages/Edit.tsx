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
  MousePointer2,
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

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [highlightStart, setHighlightStart] = useState<{ x: number; y: number } | null>(null);
  const [hlRect, setHlRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // activeTextBox: positioned text box open for editing
  const [activeTextBox, setActiveTextBox] = useState<{
    x: number;
    y: number;
    id: string;
    existing: boolean;
  } | null>(null);
  const [textVal, setTextVal] = useState("");
  const textInputRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-focus text area when it appears
  useEffect(() => {
    if (activeTextBox && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [activeTextBox]);

  const getPos = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  };

  const commitText = () => {
    if (!activeTextBox) return;
    const text = textVal.trim();
    if (text) {
      if (activeTextBox.existing) {
        onDeleteAnnotation(activeTextBox.id);
      }
      onAddAnnotation({
        type: "text",
        id: activeTextBox.id,
        page: pageNum,
        x: activeTextBox.x,
        y: activeTextBox.y,
        text,
        color,
        fontSize,
      });
    }
    setActiveTextBox(null);
    setTextVal("");
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't handle if click was on a text annotation box or delete button
    if ((e.target as HTMLElement).closest("[data-annotation]")) return;

    if (tool === "text") {
      // Commit any open text box first
      if (activeTextBox) {
        commitText();
        return;
      }
      const p = getPos(e);
      setActiveTextBox({ x: p.x, y: p.y, id: crypto.randomUUID(), existing: false });
      setTextVal("");
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-annotation]")) return;
    if (tool === "draw") {
      setDrawing(true);
      setCurrentPath([getPos(e)]);
    } else if (tool === "highlight") {
      setHighlightStart(getPos(e));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tool === "draw" && drawing) {
      setCurrentPath((prev) => [...prev, getPos(e)]);
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
          points: [...currentPath],
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
      if (w > 8 && h > 8) {
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

  const pageAnnotations = annotations.filter((a) => a.page === pageNum);

  const getCursor = () => {
    if (tool === "draw") return "crosshair";
    if (tool === "highlight") return "crosshair";
    if (tool === "text") return "text";
    if (tool === "select") return "default";
    return "default";
  };

  const drawPathD = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div
      ref={containerRef}
      data-testid="pdf-canvas-container"
      className="relative shadow-lg border rounded-lg select-none"
      style={{
        width: dims.w || "auto",
        height: dims.h || "auto",
        cursor: getCursor(),
      }}
      onClick={handleContainerClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* PDF rendered to canvas */}
      <canvas ref={canvasRef} className="block rounded-lg" />

      {/* SVG layer: highlights + drawings (pointer-events none so clicks pass through) */}
      {dims.w > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={dims.w}
          height={dims.h}
          style={{ zIndex: 1 }}
        >
          {pageAnnotations.map((a) => {
            if (a.type === "highlight") {
              return (
                <rect
                  key={a.id}
                  x={a.x} y={a.y} width={a.width} height={a.height}
                  fill={a.color} fillOpacity={0.35}
                  stroke={a.color} strokeOpacity={0.5} strokeWidth={1}
                />
              );
            }
            if (a.type === "draw") {
              return (
                <path
                  key={a.id}
                  d={drawPathD(a.points)}
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

          {/* Live drawing preview */}
          {drawing && currentPath.length > 1 && (
            <path
              d={drawPathD(currentPath)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.75}
            />
          )}

          {/* Live highlight preview */}
          {hlRect && (
            <rect
              x={hlRect.x} y={hlRect.y} width={hlRect.w} height={hlRect.h}
              fill={color} fillOpacity={0.2}
              stroke={color} strokeDasharray="4 2" strokeWidth={1.5}
            />
          )}
        </svg>
      )}

      {/* Text annotations rendered as positioned divs */}
      {pageAnnotations
        .filter((a): a is TextAnnotation => a.type === "text")
        .map((t) => (
          <div
            key={t.id}
            data-annotation="text"
            className="absolute group"
            style={{
              left: t.x,
              top: t.y,
              zIndex: 2,
              pointerEvents: tool === "select" || tool === "text" ? "auto" : "none",
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (tool === "text") {
                // Re-open for editing
                setActiveTextBox({ x: t.x, y: t.y, id: t.id, existing: true });
                setTextVal(t.text);
              }
            }}
          >
            <span
              style={{
                color: t.color,
                fontSize: t.fontSize,
                fontFamily: "Helvetica, Arial, sans-serif",
                whiteSpace: "pre-wrap",
                lineHeight: 1.2,
                display: "block",
              }}
            >
              {t.text}
            </span>
            {tool === "select" && (
              <button
                data-annotation="delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAnnotation(t.id);
                }}
                className="absolute -top-2 -right-2 hidden group-hover:flex h-5 w-5 rounded-full bg-destructive text-white items-center justify-center text-xs shadow"
                title="Delete"
              >
                ×
              </button>
            )}
          </div>
        ))}

      {/* Delete buttons for highlights in select mode */}
      {tool === "select" &&
        pageAnnotations
          .filter((a): a is HighlightAnnotation => a.type === "highlight")
          .map((a) => (
            <button
              key={a.id}
              data-annotation="delete"
              onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(a.id); }}
              className="absolute flex h-5 w-5 rounded-full bg-destructive/90 text-white items-center justify-center text-xs shadow opacity-0 hover:opacity-100 transition-opacity"
              style={{ left: a.x + a.width - 2, top: a.y - 2, zIndex: 3 }}
              title="Delete highlight"
            >
              ×
            </button>
          ))}

      {/* Active text editing box — rendered LAST so it's on top */}
      {activeTextBox && (
        <div
          data-annotation="textbox"
          className="absolute"
          style={{
            left: activeTextBox.x,
            top: activeTextBox.y,
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textInputRef}
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setActiveTextBox(null);
                setTextVal("");
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commitText();
              }
            }}
            onBlur={commitText}
            rows={1}
            placeholder="Type here..."
            data-testid="text-input"
            style={{
              color,
              fontSize,
              fontFamily: "Helvetica, Arial, sans-serif",
              lineHeight: 1.2,
              background: "rgba(255,255,255,0.85)",
              border: `2px dashed ${color}`,
              borderRadius: 4,
              padding: "2px 4px",
              outline: "none",
              resize: "both",
              minWidth: 120,
              minHeight: fontSize + 8,
              backdropFilter: "blur(2px)",
            }}
          />
          <div className="text-[10px] text-muted-foreground mt-0.5 bg-background/80 px-1 rounded">
            Enter to confirm · Esc to cancel · Shift+Enter for new line
          </div>
        </div>
      )}
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
  const [color, setColor] = useState("#1d4ed8");
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
          // Split multi-line text
          const lines = a.text.split("\n");
          const lineHeight = (a.fontSize / SCALE) * 1.2;
          lines.forEach((line, li) => {
            if (!line) return;
            page.drawText(line, {
              x: a.x / SCALE,
              y: height - a.y / SCALE - li * lineHeight - a.fontSize / SCALE,
              size: a.fontSize / SCALE,
              font: helvetica,
              color: hexToRgb(a.color),
            });
          });
        } else if (a.type === "highlight") {
          page.drawRectangle({
            x: a.x / SCALE,
            y: height - (a.y + a.height) / SCALE,
            width: a.width / SCALE,
            height: a.height / SCALE,
            color: hexToRgb(a.color),
            opacity: 0.35,
          });
        } else if (a.type === "draw" && a.points.length > 1) {
          for (let i = 0; i < a.points.length - 1; i++) {
            const p1 = a.points[i];
            const p2 = a.points[i + 1];
            page.drawLine({
              start: { x: p1.x / SCALE, y: height - p1.y / SCALE },
              end: { x: p2.x / SCALE, y: height - p2.y / SCALE },
              thickness: Math.max(0.5, a.strokeWidth / SCALE),
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

  const toolDefs: { id: Tool; icon: React.ReactNode; label: string; hint: string }[] = [
    { id: "select", icon: <MousePointer2 className="h-3.5 w-3.5" />, label: "Select", hint: "Click annotations to delete" },
    { id: "text", icon: <Type className="h-3.5 w-3.5" />, label: "Text", hint: "Click anywhere on the PDF to add text" },
    { id: "highlight", icon: <Highlighter className="h-3.5 w-3.5" />, label: "Highlight", hint: "Click and drag to highlight an area" },
    { id: "draw", icon: <PenLine className="h-3.5 w-3.5" />, label: "Draw", hint: "Click and drag to draw freehand" },
  ];

  const colors = [
    { val: "#1d4ed8", name: "Blue" },
    { val: "#dc2626", name: "Red" },
    { val: "#16a34a", name: "Green" },
    { val: "#d97706", name: "Orange" },
    { val: "#9333ea", name: "Purple" },
    { val: "#0891b2", name: "Cyan" },
    { val: "#000000", name: "Black" },
  ];

  const currentTool = toolDefs.find((t) => t.id === tool)!;
  const pageAnnotationCount = annotations.filter((a) => a.page === currentPage).length;

  return (
    <ToolLayout title="Edit PDF" description="Click on the PDF to add text, highlights, or drawings. Download when done.">
      <div className="space-y-4">
        {!file ? (
          <DropZone onFiles={onFiles} label="Upload a PDF to edit" />
        ) : (
          <>
            <FileInfo file={file} pageCount={pageCount} onRemove={() => { setFile(null); setPdfDoc(null); setAnnotations([]); }} />

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2">
              {/* Tools */}
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {toolDefs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    title={t.hint}
                    data-testid={`tool-${t.id}`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                      tool === t.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-border" />

              {/* Colors */}
              <div className="flex items-center gap-1.5">
                {colors.map((c) => (
                  <button
                    key={c.val}
                    onClick={() => setColor(c.val)}
                    title={c.name}
                    className={cn(
                      "h-5 w-5 rounded-full transition-all",
                      color === c.val ? "ring-2 ring-offset-1 ring-foreground scale-110" : "hover:scale-110"
                    )}
                    style={{ background: c.val }}
                    data-testid={`color-${c.val}`}
                  />
                ))}
              </div>

              {tool === "text" && (
                <>
                  <div className="h-5 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Size:</span>
                    <input
                      type="number" min={8} max={96} value={fontSize}
                      onChange={(e) => setFontSize(Math.max(8, Math.min(96, Number(e.target.value))))}
                      className="w-14 rounded border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="font-size"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                </>
              )}

              {tool === "draw" && (
                <>
                  <div className="h-5 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Thickness:</span>
                    <input
                      type="range" min={1} max={20} value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-24"
                      data-testid="stroke-width"
                    />
                    <span className="text-xs text-muted-foreground w-5">{strokeWidth}</span>
                  </div>
                </>
              )}

              <div className="ml-auto flex gap-2 items-center">
                <span className="text-xs text-muted-foreground hidden sm:block">{currentTool.hint}</span>
                <Button variant="outline" size="sm" onClick={clearPage} className="gap-1.5 text-xs h-7" data-testid="clear-page">
                  <Trash2 className="h-3 w-3" /> Clear page
                </Button>
                <Button size="sm" onClick={savePdf} disabled={saving} className="gap-1.5 text-xs h-7" data-testid="save-pdf">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Page nav */}
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
                {pageAnnotationCount > 0 && (
                  <span className="ml-2 text-xs text-primary">· {pageAnnotationCount} annotation{pageAnnotationCount !== 1 ? "s" : ""}</span>
                )}
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

            {/* Canvas area */}
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

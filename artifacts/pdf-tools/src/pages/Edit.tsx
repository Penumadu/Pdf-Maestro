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
const FONT_FAMILY = "Helvetica, Arial, sans-serif";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").padStart(6, "0");
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  );
}

// pdf-lib's standard Helvetica only supports WinAnsi (latin1) characters.
// Strip anything outside that range to prevent draw errors.
function toLatinSafe(text: string): string {
  return text
    .split("")
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return c >= 0x20 && c <= 0xff;
    })
    .join("");
}

// Auto-resize a textarea to exactly fit its content
function autoSize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.width = "auto";
  // Measure single-line width using a hidden span
  const span = document.createElement("span");
  span.style.cssText = `
    position:absolute; visibility:hidden; white-space:pre;
    font:${el.style.fontSize} ${el.style.fontFamily};
    letter-spacing:normal; padding:0;
  `;
  span.textContent = el.value || el.placeholder || " ";
  document.body.appendChild(span);
  const w = Math.max(span.offsetWidth + 20, 80);
  document.body.removeChild(span);
  el.style.width = w + "px";
  el.style.height = el.scrollHeight + "px";
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
  const [activeBox, setActiveBox] = useState<{ x: number; y: number; id: string; existing: boolean } | null>(null);
  const [textVal, setTextVal] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNum);
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const vp = page.getViewport({ scale: SCALE });
      canvas.width = vp.width;
      canvas.height = vp.height;
      setDims({ w: vp.width, h: vp.height });
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    })();
    return () => { cancelled = true; };
  }, [doc, pageNum]);

  // Focus + size textarea when it mounts
  useEffect(() => {
    if (activeBox && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      autoSize(el);
    }
  }, [activeBox]);

  // Close active box if tool changes away from text
  useEffect(() => {
    if (tool !== "text" && activeBox) {
      commitText();
    }
  }, [tool]);

  const getPos = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) };
  };

  const commitText = () => {
    if (!activeBox) return;
    const text = textVal.trim();
    if (text) {
      if (activeBox.existing) onDeleteAnnotation(activeBox.id);
      onAddAnnotation({
        type: "text",
        id: activeBox.id,
        page: pageNum,
        x: activeBox.x,
        y: activeBox.y,
        text,
        color,
        fontSize,
      });
    }
    setActiveBox(null);
    setTextVal("");
  };

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-annotation]")) return;
    if (tool !== "text") return;

    if (activeBox) {
      commitText();
      return;
    }
    const p = getPos(e);
    setActiveBox({ x: p.x, y: p.y, id: crypto.randomUUID(), existing: false });
    setTextVal("");
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
      setCurrentPath((p) => [...p, getPos(e)]);
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
        onAddAnnotation({ type: "draw", id: crypto.randomUUID(), page: pageNum, points: [...currentPath], color, strokeWidth });
      }
      setDrawing(false);
      setCurrentPath([]);
    } else if (tool === "highlight" && highlightStart) {
      const p = getPos(e);
      const w = Math.abs(p.x - highlightStart.x);
      const h = Math.abs(p.y - highlightStart.y);
      if (w > 8 && h > 8) {
        onAddAnnotation({ type: "highlight", id: crypto.randomUUID(), page: pageNum, x: Math.min(highlightStart.x, p.x), y: Math.min(highlightStart.y, p.y), width: w, height: h, color });
      }
      setHighlightStart(null);
      setHlRect(null);
    }
  };

  const pathD = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const pageAnnotations = annotations.filter((a) => a.page === pageNum);

  const cursor = tool === "draw" || tool === "highlight" ? "crosshair" : tool === "text" ? "text" : "default";

  return (
    <div
      ref={containerRef}
      data-testid="pdf-canvas-container"
      className="relative shadow-lg border rounded-lg select-none"
      style={{ width: dims.w || "auto", height: dims.h || "auto", cursor }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas ref={canvasRef} className="block rounded-lg" />

      {/* SVG: highlights + drawings */}
      {dims.w > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={dims.w} height={dims.h}
          style={{ zIndex: 1 }}
        >
          {pageAnnotations.map((a) => {
            if (a.type === "highlight") {
              return <rect key={a.id} x={a.x} y={a.y} width={a.width} height={a.height} fill={a.color} fillOpacity={0.35} stroke={a.color} strokeOpacity={0.5} strokeWidth={1} />;
            }
            if (a.type === "draw") {
              return <path key={a.id} d={pathD(a.points)} fill="none" stroke={a.color} strokeWidth={a.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
            }
            return null;
          })}
          {drawing && currentPath.length > 1 && (
            <path d={pathD(currentPath)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
          )}
          {hlRect && (
            <rect x={hlRect.x} y={hlRect.y} width={hlRect.w} height={hlRect.h} fill={color} fillOpacity={0.2} stroke={color} strokeDasharray="4 2" strokeWidth={1.5} />
          )}
        </svg>
      )}

      {/* Committed text annotations */}
      {pageAnnotations.filter((a): a is TextAnnotation => a.type === "text").map((t) => (
        <div
          key={t.id}
          data-annotation="text"
          className="absolute group"
          style={{ left: t.x, top: t.y, zIndex: 2, pointerEvents: tool === "select" || tool === "text" ? "auto" : "none" }}
          onClick={(e) => {
            e.stopPropagation();
            if (tool === "text") {
              setActiveBox({ x: t.x, y: t.y, id: t.id, existing: true });
              setTextVal(t.text);
            }
          }}
        >
          <span style={{ color: t.color, fontSize: t.fontSize, fontFamily: FONT_FAMILY, whiteSpace: "pre-wrap", lineHeight: 1.2, display: "block" }}>
            {t.text}
          </span>
          {tool === "select" && (
            <button
              data-annotation="delete"
              onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(t.id); }}
              className="absolute -top-2 -right-2 hidden group-hover:flex h-5 w-5 rounded-full bg-destructive text-white items-center justify-center text-xs shadow"
            >×</button>
          )}
        </div>
      ))}

      {/* Delete buttons for highlights in select mode */}
      {tool === "select" && pageAnnotations.filter((a): a is HighlightAnnotation => a.type === "highlight").map((a) => (
        <button
          key={a.id}
          data-annotation="delete"
          onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(a.id); }}
          className="absolute flex h-5 w-5 rounded-full bg-destructive/90 text-white items-center justify-center text-xs shadow opacity-0 hover:opacity-100 transition-opacity"
          style={{ left: a.x + a.width - 2, top: a.y - 2, zIndex: 3 }}
        >×</button>
      ))}

      {/* Active text input — auto-sizing, sits directly on the PDF */}
      {activeBox && (
        <div
          data-annotation="textbox"
          className="absolute"
          style={{ left: activeBox.x, top: activeBox.y, zIndex: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            value={textVal}
            rows={1}
            placeholder="Type here…"
            data-testid="text-input"
            onChange={(e) => {
              setTextVal(e.target.value);
              autoSize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setActiveBox(null); setTextVal(""); }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
            }}
            onBlur={commitText}
            style={{
              display: "block",
              resize: "none",
              overflow: "hidden",
              padding: "1px 3px",
              margin: 0,
              border: `1.5px dashed ${color}`,
              borderRadius: 3,
              outline: "none",
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(2px)",
              color,
              fontSize,
              fontFamily: FONT_FAMILY,
              lineHeight: 1.2,
              minWidth: 80,
              minHeight: fontSize + 6,
              boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 9, color: "#888", marginTop: 2, background: "rgba(255,255,255,0.75)", padding: "1px 3px", borderRadius: 2 }}>
            Enter to confirm · Shift+Enter new line · Esc cancel
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

  const addAnnotation = (a: Annotation) => setAnnotations((prev) => {
    // Replace if same id (re-editing)
    const exists = prev.some((x) => x.id === a.id);
    return exists ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a];
  });

  const deleteAnnotation = (id: string) => setAnnotations((prev) => prev.filter((a) => a.id !== id));
  const clearPage = () => setAnnotations((prev) => prev.filter((a) => a.page !== currentPage));

  const savePdf = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const helvetica = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();

      for (const a of annotations) {
        const page = pages[a.page - 1];
        if (!page) continue;
        const { height } = page.getSize();

        try {
          if (a.type === "text") {
            const lines = a.text.split("\n");
            const pdfFontSize = Math.max(4, a.fontSize / SCALE);
            const lineHeight = pdfFontSize * 1.2;
            lines.forEach((rawLine, li) => {
              const line = toLatinSafe(rawLine);
              if (!line) return;
              page.drawText(line, {
                x: a.x / SCALE,
                y: height - a.y / SCALE - li * lineHeight - pdfFontSize,
                size: pdfFontSize,
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
                end:   { x: p2.x / SCALE, y: height - p2.y / SCALE },
                thickness: Math.max(0.5, a.strokeWidth / SCALE),
                color: hexToRgb(a.color),
              });
            }
          }
        } catch (annotErr) {
          console.warn("Skipped annotation due to error:", annotErr);
        }
      }

      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), file.name.replace(/\.pdf$/i, "-edited.pdf"));
      toast({ title: "Edited PDF downloaded!" });
    } catch (e) {
      console.error("Save failed:", e);
      toast({ title: "Failed to save PDF. The file may be encrypted or unsupported.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toolDefs: { id: Tool; icon: React.ReactNode; label: string; hint: string }[] = [
    { id: "select",    icon: <MousePointer2 className="h-3.5 w-3.5" />, label: "Select",    hint: "Hover annotations to delete" },
    { id: "text",      icon: <Type          className="h-3.5 w-3.5" />, label: "Text",      hint: "Click anywhere on the PDF to type" },
    { id: "highlight", icon: <Highlighter   className="h-3.5 w-3.5" />, label: "Highlight", hint: "Click and drag to highlight" },
    { id: "draw",      icon: <PenLine       className="h-3.5 w-3.5" />, label: "Draw",      hint: "Click and drag to draw" },
  ];

  const colorOptions = [
    { val: "#1d4ed8", name: "Blue"   },
    { val: "#dc2626", name: "Red"    },
    { val: "#16a34a", name: "Green"  },
    { val: "#d97706", name: "Orange" },
    { val: "#9333ea", name: "Purple" },
    { val: "#0891b2", name: "Cyan"   },
    { val: "#111827", name: "Black"  },
  ];

  const pageAnnotCount = annotations.filter((a) => a.page === currentPage).length;

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
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {toolDefs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    title={t.hint}
                    data-testid={`tool-${t.id}`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                      tool === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-border" />

              <div className="flex items-center gap-1">
                {colorOptions.map((c) => (
                  <button
                    key={c.val}
                    onClick={() => setColor(c.val)}
                    title={c.name}
                    className={cn("h-5 w-5 rounded-full transition-all", color === c.val ? "ring-2 ring-offset-1 ring-foreground scale-110" : "hover:scale-110")}
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
                    <input type="range" min={1} max={20} value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="w-24" data-testid="stroke-width" />
                    <span className="text-xs text-muted-foreground w-5">{strokeWidth}</span>
                  </div>
                </>
              )}

              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={clearPage} className="gap-1.5 text-xs h-7" data-testid="clear-page">
                  <Trash2 className="h-3 w-3" /> Clear page
                </Button>
                <Button size="sm" onClick={savePdf} disabled={saving} className="gap-1.5 text-xs h-7" data-testid="save-pdf">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download PDF
                </Button>
              </div>
            </div>

            {/* Hint bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{toolDefs.find((t) => t.id === tool)?.hint}</span>
              {pageAnnotCount > 0 && <span className="text-primary">{pageAnnotCount} annotation{pageAnnotCount !== 1 ? "s" : ""} on this page</span>}
            </div>

            {/* Page navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} data-testid="prev-page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page <strong className="text-foreground">{currentPage}</strong> of {pageCount}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount} data-testid="next-page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Canvas */}
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

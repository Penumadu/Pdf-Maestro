import { useEffect, useRef } from "react";
import { pdfjsLib } from "@/lib/pdf-utils";
import { cn } from "@/lib/utils";

interface PageThumbnailProps {
  doc: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  selected?: boolean;
  onClick?: () => void;
  label?: string;
  className?: string;
}

export default function PageThumbnail({
  doc,
  pageNum,
  selected,
  onClick,
  label,
  className,
}: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const page = await doc.getPage(pageNum);
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const viewport = page.getViewport({ scale: 0.25 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
    }
    render();
    return () => { cancelled = true; };
  }, [doc, pageNum]);

  return (
    <div
      onClick={onClick}
      data-testid={`page-thumb-${pageNum}`}
      className={cn(
        "flex flex-col items-center gap-1 cursor-pointer group",
        className
      )}
    >
      <div
        className={cn(
          "rounded-md border-2 overflow-hidden transition-all duration-150",
          selected
            ? "border-primary shadow-md shadow-primary/20"
            : "border-border hover:border-primary/50"
        )}
      >
        <canvas ref={canvasRef} className="block max-w-[120px]" />
      </div>
      <span className={cn("text-xs font-medium", selected ? "text-primary" : "text-muted-foreground")}>
        {label ?? `Page ${pageNum}`}
      </span>
    </div>
  );
}

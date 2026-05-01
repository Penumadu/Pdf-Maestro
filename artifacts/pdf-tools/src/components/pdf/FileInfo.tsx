import { FileText, X, Hash } from "lucide-react";
import { formatFileSize } from "@/lib/pdf-utils";

interface FileInfoProps {
  file: File;
  pageCount?: number;
  onRemove?: () => void;
}

export default function FileInfo({ file, pageCount, onRemove }: FileInfoProps) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm"
      data-testid="file-info"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-foreground" data-testid="file-name">
          {file.name}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          {pageCount !== undefined && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
            </>
          )}
        </div>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          data-testid="remove-file"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

import { FileText, X } from "lucide-react";
import { formatFileSize } from "@/lib/pdf-utils";
import { Button } from "@/components/ui/button";

interface FileInfoProps {
  file: File;
  pageCount?: number;
  onRemove?: () => void;
}

export default function FileInfo({ file, pageCount, onRemove }: FileInfoProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3" data-testid="file-info">
      <div className="rounded-md bg-primary/10 p-2">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" data-testid="file-name">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
          {pageCount !== undefined && ` · ${pageCount} page${pageCount !== 1 ? "s" : ""}`}
        </p>
      </div>
      {onRemove && (
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemove} data-testid="remove-file">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

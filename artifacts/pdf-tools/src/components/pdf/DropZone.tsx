import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
  disabled?: boolean;
}

export default function DropZone({
  onFiles,
  multiple = false,
  label,
  sublabel,
  className,
  disabled,
}: DropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted.length > 0) onFiles(accepted); },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      data-testid="dropzone"
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all duration-200",
        isDragActive
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border bg-card hover:border-primary/50 hover:bg-primary/[0.02]",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      <input {...getInputProps()} data-testid="dropzone-input" />

      <div className={cn(
        "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors",
        isDragActive ? "bg-primary/15" : "bg-muted"
      )}>
        {isDragActive
          ? <FileText className="h-8 w-8 text-primary" />
          : <UploadCloud className="h-8 w-8 text-muted-foreground" />
        }
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          {isDragActive ? "Release to upload" : label ?? "Drop your PDF here"}
        </p>
        <p className="text-xs text-muted-foreground">
          {sublabel ?? (multiple ? "or click to browse multiple PDF files" : "or click to browse a PDF file")}
        </p>
      </div>

      {!isDragActive && (
        <div className="rounded-lg border bg-background px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          PDF files only
        </div>
      )}
    </div>
  );
}

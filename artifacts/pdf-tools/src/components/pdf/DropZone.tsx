import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
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
    (accepted: File[]) => {
      if (accepted.length > 0) onFiles(accepted);
    },
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
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200",
        isDragActive
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/60 hover:bg-muted/40",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input {...getInputProps()} data-testid="dropzone-input" />
      <div className={cn("rounded-full p-4 transition-colors", isDragActive ? "bg-primary/10" : "bg-muted")}>
        {isDragActive ? (
          <FileText className="h-8 w-8 text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isDragActive ? "Drop your PDF here" : label ?? "Drop PDF here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {sublabel ?? (multiple ? "Select multiple PDF files" : "Select a PDF file")}
        </p>
      </div>
    </div>
  );
}

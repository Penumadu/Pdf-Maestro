import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProcessButtonProps {
  onClick: () => void;
  loading: boolean;
  label: string;
  disabled?: boolean;
  className?: string;
}

export default function ProcessButton({ onClick, loading, label, disabled, className }: ProcessButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={loading || disabled}
      size="lg"
      className={cn("gap-2 min-w-[200px] h-11 rounded-xl font-semibold shadow-sm", className)}
      data-testid="process-button"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing…
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}

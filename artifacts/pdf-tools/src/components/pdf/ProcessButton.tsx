import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessButtonProps {
  onClick: () => void;
  loading: boolean;
  label: string;
  disabled?: boolean;
}

export default function ProcessButton({ onClick, loading, label, disabled }: ProcessButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={loading || disabled}
      size="lg"
      className="gap-2 min-w-[180px]"
      data-testid="process-button"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
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

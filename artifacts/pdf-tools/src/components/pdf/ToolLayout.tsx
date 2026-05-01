import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";

interface ToolLayoutProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function ToolLayout({ title, description, icon, children }: ToolLayoutProps) {
  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/">
            <button
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              data-testid="back-home"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Tools
            </button>
          </Link>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded-md bg-primary p-1 shrink-0">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold truncate">
              <span className="text-muted-foreground font-normal">Srini PDF Tools</span>
              <span className="mx-1.5 text-muted-foreground/40">/</span>
              {title}
            </span>
          </div>
        </div>
      </header>

      {/* Page title band */}
      <div className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start gap-4">
            {icon && (
              <div className="rounded-xl bg-primary/10 p-3 shrink-0 mt-0.5">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">{description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

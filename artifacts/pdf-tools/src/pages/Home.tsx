import { Link } from "wouter";
import {
  Merge,
  Scissors,
  PenLine,
  Minimize2,
  RotateCw,
  FileMinus,
  Image,
  FileText,
  Moon,
  Sun,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const tools = [
  {
    href: "/merge",
    icon: Merge,
    title: "Merge PDFs",
    description: "Combine multiple PDF files into one document in any order you choose.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    href: "/split",
    icon: Scissors,
    title: "Split PDF",
    description: "Divide a PDF into separate files by page ranges or individual pages.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    href: "/edit",
    icon: PenLine,
    title: "Edit PDF",
    description: "Add text, highlights, drawings, and sticky notes to any PDF.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    href: "/compress",
    icon: Minimize2,
    title: "Compress PDF",
    description: "Reduce PDF file size while preserving quality for easy sharing.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    href: "/rotate",
    icon: RotateCw,
    title: "Rotate PDF",
    description: "Rotate pages in your PDF individually or all at once.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    href: "/extract",
    icon: FileMinus,
    title: "Extract Pages",
    description: "Pull specific pages from a PDF and save them as a new file.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    href: "/pdf-to-images",
    icon: Image,
    title: "PDF to Images",
    description: "Convert PDF pages to high-quality PNG images, download individually or as ZIP.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
];

export default function Home() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight">PDF Tools</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(!dark)}
            data-testid="toggle-theme"
            className="h-8 w-8"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
            All processing happens in your browser — files never leave your device
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
            PDF Tools, Simplified
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Merge, split, edit, compress, and convert PDFs — no uploads, no accounts, no bloated software.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href}>
                <div
                  data-testid={`tool-card-${tool.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="group flex flex-col gap-3 rounded-xl border bg-card p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
                >
                  <div className={`w-10 h-10 rounded-lg ${tool.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${tool.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">{tool.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                  </div>
                  <div className="mt-auto pt-2">
                    <span className="text-xs font-medium text-primary group-hover:underline">Open tool &rarr;</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

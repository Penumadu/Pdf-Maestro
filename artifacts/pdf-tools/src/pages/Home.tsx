import { Link } from "wouter";
import {
  Merge, Scissors, PenLine, Minimize2, RotateCw,
  FileMinus, Image, FileText, Moon, Sun, Lock, Zap, Globe,
} from "lucide-react";
import { useState, useEffect } from "react";

const featuredTools = [
  {
    href: "/merge",
    icon: Merge,
    title: "Merge PDFs",
    description: "Combine multiple PDFs into one document. Reorder files and pick specific pages from each.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "hover:border-blue-400/40",
  },
  {
    href: "/split",
    icon: Scissors,
    title: "Split PDF",
    description: "Divide a PDF into separate files by page ranges or visually pick individual pages.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "hover:border-purple-400/40",
  },
  {
    href: "/edit",
    icon: PenLine,
    title: "Edit PDF",
    description: "Add text, highlights, and freehand drawings directly on your PDF pages.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "hover:border-orange-400/40",
  },
];

const utilityTools = [
  {
    href: "/compress",
    icon: Minimize2,
    title: "Compress",
    description: "Reduce file size with Auto, Low, Medium, or High compression.",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "hover:border-green-400/40",
  },
  {
    href: "/rotate",
    icon: RotateCw,
    title: "Rotate",
    description: "Rotate individual pages or all pages at once.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "hover:border-pink-400/40",
  },
  {
    href: "/extract",
    icon: FileMinus,
    title: "Extract Pages",
    description: "Pull specific pages out and save them as a new PDF.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "hover:border-cyan-400/40",
  },
  {
    href: "/pdf-to-images",
    icon: Image,
    title: "PDF to Images",
    description: "Convert pages to PNG images and download individually or as a ZIP.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "hover:border-yellow-400/40",
  },
];

const highlights = [
  { icon: Lock,  label: "100% Private",     desc: "Files never leave your browser" },
  { icon: Zap,   label: "Instant Results",  desc: "No servers, no waiting" },
  { icon: Globe, label: "Works Everywhere", desc: "Any browser, any device" },
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

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary p-1.5">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">Srini PDF Tools</span>
          </div>
          <button
            onClick={() => setDark(!dark)}
            data-testid="toggle-theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-purple-500/6 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6 shadow-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            All processing runs locally in your browser
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl mb-5 leading-tight">
            Srini <span className="text-primary">PDF Tools</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12">
            Merge, split, edit, compress, and convert PDFs — no file uploads, no accounts, no software installs. Everything runs privately in your browser.
          </p>

          {/* Highlight pills */}
          <div className="flex flex-wrap justify-center gap-4">
            {highlights.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.label} className="flex items-center gap-2.5 rounded-xl border bg-background/80 px-4 py-2.5 shadow-sm">
                  <div className="rounded-md bg-primary/10 p-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground leading-none">{h.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{h.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Tools ── */}
      <main className="max-w-6xl mx-auto px-6 py-14 space-y-12">

        {/* Featured tools */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Core Tools</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {featuredTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href}>
                  <div
                    data-testid={`tool-card-${tool.title.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`group flex flex-col gap-4 rounded-2xl border-2 border-border bg-card p-6 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${tool.border}`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${tool.bg} flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${tool.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base text-foreground mb-1.5">{tool.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      Open tool
                      <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Utility tools */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">More Tools</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {utilityTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href}>
                  <div
                    data-testid={`tool-card-${tool.title.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${tool.border}`}
                  >
                    <div className={`w-9 h-9 rounded-lg ${tool.bg} flex items-center justify-center`}>
                      <Icon className={`h-4.5 w-4.5 ${tool.color}`} style={{ height: 18, width: 18 }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground mb-1">{tool.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                    </div>
                    <span className="text-xs font-medium text-primary group-hover:underline mt-auto">Open &rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t mt-8">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary p-1">
              <FileText className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-foreground">Srini PDF Tools</span>
          </div>
          <p className="text-xs text-muted-foreground">Your files never leave your device.</p>
        </div>
      </footer>
    </div>
  );
}

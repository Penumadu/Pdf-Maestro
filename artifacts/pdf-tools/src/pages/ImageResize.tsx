import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, ArrowRight, ChevronDown } from "lucide-react";
import ToolLayout from "@/components/pdf/ToolLayout";
import ProcessButton from "@/components/pdf/ProcessButton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Spec {
  label: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  note?: string;
}

interface Country {
  country: string;
  flag: string;
  specs: { type: string; spec: Spec }[];
}

const COUNTRIES: Country[] = [
  {
    country: "USA", flag: "🇺🇸",
    specs: [
      { type: "Passport", spec: { label: "US Passport", widthMm: 51, heightMm: 51, dpi: 300, note: "2×2 inch (51×51 mm)" } },
      { type: "Visa", spec: { label: "US Visa", widthMm: 51, heightMm: 51, dpi: 300, note: "2×2 inch, same as passport" } },
    ]
  },
  {
    country: "UK", flag: "🇬🇧",
    specs: [
      { type: "Passport", spec: { label: "UK Passport", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
      { type: "Visa", spec: { label: "UK Visa", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
    ]
  },
  {
    country: "India", flag: "🇮🇳",
    specs: [
      { type: "Passport", spec: { label: "India Passport", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
      { type: "Visa", spec: { label: "India Visa", widthMm: 51, heightMm: 51, dpi: 300, note: "2×2 inch (51×51 mm)" } },
      { type: "OCI/PIO", spec: { label: "OCI Card", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
    ]
  },
  {
    country: "Canada", flag: "🇨🇦",
    specs: [
      { type: "Passport", spec: { label: "Canada Passport", widthMm: 50, heightMm: 70, dpi: 300, note: "50×70 mm" } },
      { type: "Visa", spec: { label: "Canada Visa", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
    ]
  },
  {
    country: "Australia", flag: "🇦🇺",
    specs: [
      { type: "Passport", spec: { label: "Australia Passport", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
      { type: "Visa", spec: { label: "Australia Visa", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
    ]
  },
  {
    country: "Schengen (EU)", flag: "🇪🇺",
    specs: [
      { type: "Visa", spec: { label: "Schengen Visa", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm (ICAO standard)" } },
    ]
  },
  {
    country: "Germany", flag: "🇩🇪",
    specs: [
      { type: "Passport", spec: { label: "Germany Passport", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
    ]
  },
  {
    country: "France", flag: "🇫🇷",
    specs: [
      { type: "Passport", spec: { label: "France Passport", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
    ]
  },
  {
    country: "China", flag: "🇨🇳",
    specs: [
      { type: "Passport", spec: { label: "China Passport", widthMm: 33, heightMm: 48, dpi: 300, note: "33×48 mm" } },
      { type: "Visa", spec: { label: "China Visa", widthMm: 33, heightMm: 48, dpi: 300, note: "33×48 mm" } },
    ]
  },
  {
    country: "Japan", flag: "🇯🇵",
    specs: [
      { type: "Passport", spec: { label: "Japan Passport", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
      { type: "Visa", spec: { label: "Japan Visa", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
    ]
  },
  {
    country: "UAE", flag: "🇦🇪",
    specs: [
      { type: "Visa", spec: { label: "UAE Visa", widthMm: 43, heightMm: 55, dpi: 300, note: "43×55 mm" } },
    ]
  },
  {
    country: "Saudi Arabia", flag: "🇸🇦",
    specs: [
      { type: "Visa", spec: { label: "Saudi Visa", widthMm: 40, heightMm: 60, dpi: 300, note: "40×60 mm" } },
    ]
  },
  {
    country: "Singapore", flag: "🇸🇬",
    specs: [
      { type: "Passport", spec: { label: "Singapore Passport", widthMm: 35, heightMm: 45, dpi: 300, note: "35×45 mm" } },
    ]
  },
  {
    country: "Custom", flag: "✏️",
    specs: [
      { type: "Custom Size", spec: { label: "Custom", widthMm: 35, heightMm: 45, dpi: 300 } },
    ]
  },
];

function mmToPx(mm: number, dpi: number) {
  return Math.round((mm / 25.4) * dpi);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImageResize() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [selectedSpec, setSelectedSpec] = useState<Spec>(COUNTRIES[0].specs[0].spec);
  const [customW, setCustomW] = useState(35);
  const [customH, setCustomH] = useState(45);
  const [customDpi, setCustomDpi] = useState(300);
  const [outputFormat, setOutputFormat] = useState<"jpeg" | "png">("jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string; name: string; widthPx: number; heightPx: number; size: number } | null>(null);
  const { toast } = useToast();

  const isCustom = selectedCountry.country === "Custom";
  const activeSpec = isCustom
    ? { ...selectedSpec, widthMm: customW, heightMm: customH, dpi: customDpi }
    : selectedSpec;

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: false,
  });

  const resize = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const targetW = mmToPx(activeSpec.widthMm, activeSpec.dpi);
      const targetH = mmToPx(activeSpec.heightMm, activeSpec.dpi);

      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d")!;
          if (outputFormat === "jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetW, targetH);
          }

          const srcAspect = img.naturalWidth / img.naturalHeight;
          const dstAspect = targetW / targetH;
          let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
          if (srcAspect > dstAspect) {
            sw = img.naturalHeight * dstAspect;
            sx = (img.naturalWidth - sw) / 2;
          } else {
            sh = img.naturalWidth / dstAspect;
            sy = (img.naturalHeight - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

          const mimeType = outputFormat === "png" ? "image/png" : "image/jpeg";
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("Resize failed"));
            const ext = outputFormat === "png" ? "png" : "jpg";
            const name = file.name.replace(/\.[^.]+$/, "") + `_${targetW}x${targetH}.${ext}`;
            setResult({ url: URL.createObjectURL(blob), name, widthPx: targetW, heightPx: targetH, size: blob.size });
            resolve();
          }, mimeType, 0.92);
          URL.revokeObjectURL(url);
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch (e: any) {
      toast({ title: "Resize failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.name;
    a.click();
  };

  return (
    <ToolLayout
      title="Image Resize"
      description="Resize images to exact passport or visa photo specifications for any country — or enter a custom size."
    >
      <div className="space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-primary/[0.02]"
          )}
        >
          <input {...getInputProps()} />
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", isDragActive ? "bg-primary/15" : "bg-muted")}>
            <UploadCloud className={cn("h-7 w-7", isDragActive ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">{file ? file.name : (isDragActive ? "Release to upload" : "Drop a photo here")}</p>
            <p className="text-xs text-muted-foreground mt-1">{file ? formatSize(file.size) + " · click to change" : "JPG, PNG, WebP · Click to browse"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Country + spec selector */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Country / Region</p>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.country}
                    onClick={() => {
                      setSelectedCountry(c);
                      setSelectedSpec(c.specs[0].spec);
                      setResult(null);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                      selectedCountry.country === c.country
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="truncate">{c.country}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Type selector */}
            {selectedCountry.specs.length > 1 && (
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold mb-3">Document Type</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCountry.specs.map((s) => (
                    <button
                      key={s.type}
                      onClick={() => { setSelectedSpec(s.spec); setResult(null); }}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                        selectedSpec.label === s.spec.label
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {s.type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom inputs */}
            {isCustom && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <p className="text-sm font-semibold">Custom Dimensions</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Width (mm)", value: customW, set: setCustomW },
                    { label: "Height (mm)", value: customH, set: setCustomH },
                    { label: "DPI", value: customDpi, set: setCustomDpi },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="text-[11px] text-muted-foreground mb-1 block">{f.label}</label>
                      <input
                        type="number"
                        min={1}
                        value={f.value}
                        onChange={(e) => { f.set(Number(e.target.value)); setResult(null); }}
                        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Format */}
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Output Format</p>
              <div className="flex gap-2">
                {(["jpeg", "png"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setOutputFormat(f); setResult(null); }}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase transition-colors",
                      outputFormat === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Spec summary + preview */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-primary/5 border-primary/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{selectedCountry.flag}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{activeSpec.label}</p>
                  {activeSpec.note && <p className="text-xs text-muted-foreground">{activeSpec.note}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                {[
                  { label: "Width", value: `${activeSpec.widthMm} mm` },
                  { label: "Height", value: `${activeSpec.heightMm} mm` },
                  { label: "Resolution", value: `${activeSpec.dpi} DPI` },
                  { label: "Pixels", value: `${mmToPx(activeSpec.widthMm, activeSpec.dpi)} × ${mmToPx(activeSpec.heightMm, activeSpec.dpi)}` },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-background border p-2">
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {preview && (
              <div className="rounded-xl border bg-card p-3 flex items-center justify-center min-h-[140px]">
                <img src={preview} alt="preview" className="max-h-48 rounded-lg object-contain shadow" />
              </div>
            )}

            {result && (
              <div className="rounded-xl border bg-green-500/5 border-green-500/20 p-4">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">Resize complete</p>
                <div className="flex items-center gap-2 text-sm mb-3">
                  <span className="text-muted-foreground">Original</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold">{result.widthPx} × {result.heightPx} px</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{formatSize(result.size)}</span>
                </div>
                <button
                  onClick={download}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                >
                  Download {result.name}
                </button>
              </div>
            )}
          </div>
        </div>

        {file && (
          <div className="flex justify-end">
            <ProcessButton onClick={resize} loading={loading} label="Resize Image" disabled={activeSpec.widthMm <= 0 || activeSpec.heightMm <= 0} />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

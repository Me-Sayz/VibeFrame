"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLicense } from "@/hooks/useLicense";
import { usePersistentState } from "@/hooks/usePersistentState";
import { LicenseError, requestVector } from "@/lib/ai";
import { ACCEPT, loadLayer } from "@/lib/assets";
import { MAX_AI_REFS } from "@/lib/prompt";
import { encodeReferences } from "@/lib/refEncode";
import { isAbort } from "@/lib/render";
import { dimOthers, rasterize, sanitizeSvg, toDataUrl, viewBoxSize } from "@/lib/svg";
import {
  VECTOR_COLORS_MAX,
  VECTOR_COLORS_MIN,
  VECTOR_FORMATS,
  VECTOR_IDEA_MAX,
  VECTOR_NOTE_MAX,
  VECTOR_STYLES,
  buildVectorPrompt,
  isVectorIdeaValid,
  type VectorFormat,
  type VectorStyle,
} from "@/lib/svgPrompt";
import type { AssetLayer } from "@/types/assets";
import LicenseModal from "./LicenseModal";
import VectorColors from "./VectorColors";
import { btn, card, field, mono, sectionTitle } from "./ui";

const isString = (v: unknown) => typeof v === "string";
const isBool = (v: unknown) => typeof v === "boolean";
const oneOf = (list: readonly unknown[]) => (v: unknown) => list.includes(v);
const isColors = (v: unknown) => typeof v === "number" && v >= VECTOR_COLORS_MIN && v <= VECTOR_COLORS_MAX;
const PNG_WIDTHS = [1024, 2048, 4096];

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function Thumb({ layer }: { layer: AssetLayer }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const k = Math.min(canvas.width / layer.source.width, canvas.height / layer.source.height);
    const w = layer.source.width * k;
    const h = layer.source.height * k;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(layer.source, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }, [layer]);
  return <canvas ref={ref} width={96} height={96} className="h-12 w-12 shrink-0 rounded border-[3px] border-ink bg-paper" />;
}

export default function VectorStudio() {
  const license = useLicense();
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [licenseNotice, setLicenseNotice] = useState<string | null>(null);

  const [idea, setIdea] = usePersistentState("vector:idea", "", isString);
  const [style, setStyle] = usePersistentState<VectorStyle>("vector:style", "flat", oneOf(VECTOR_STYLES.map((s) => s.id)));
  const [format, setFormat] = usePersistentState<VectorFormat>("vector:format", "square", oneOf(VECTOR_FORMATS.map((f) => f.id)));
  const [colors, setColors] = usePersistentState("vector:colors", 6, isColors);
  const [transparent, setTransparent] = usePersistentState("vector:transparent", true, isBool);
  const [svg, setSvg] = usePersistentState("vector:svg", "", isString);

  const [code, setCode] = useState(svg);
  const [refs, setRefs] = useState<AssetLayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [hover, setHover] = useState<number[] | null>(null);
  const [pngWidth, setPngWidth] = useState(2048);
  const [copied, setCopied] = useState(false);
  const [dark, setDark] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
    return () => {
      abortRef.current?.abort();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const toggleDark = () => {
    const next = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };

  const valid = isVectorIdeaValid(idea);
  const prompt = useMemo(
    () =>
      valid
        ? buildVectorPrompt({
            idea,
            style,
            format,
            colors,
            transparent,
            references: refs.map((r) => ({ name: r.name, note: r.note, width: r.width, height: r.height })),
          })
        : "",
    [valid, idea, style, format, colors, transparent, refs]
  );

  const size = useMemo(() => (svg ? viewBoxSize(svg) : { width: 1, height: 1 }), [svg]);
  const previewSrc = useMemo(() => (svg ? toDataUrl(hover && hover.length > 0 ? dimOthers(svg, hover) : svg) : ""), [svg, hover]);
  const styleInfo = VECTOR_STYLES.find((s) => s.id === style) ?? VECTOR_STYLES[0];

  const apply = (text: string): boolean => {
    const result = sanitizeSvg(text);
    if (!result.ok) {
      setCode(text);
      setError(result.error);
      return false;
    }
    setSvg(result.svg);
    setCode(result.svg);
    setError(null);
    const notes: string[] = [];
    if (result.removed.length > 0) notes.push(`Elemen dibuang demi keamanan: ${result.removed.join(", ")}.`);
    if (result.fixed.length > 0) notes.push(`${result.fixed.join(", ")}.`);
    setInfo(notes.length > 0 ? notes.join(" ") : null);
    return true;
  };

  const editSvg = (next: string) => {
    setSvg(next);
    setCode(next);
  };

  const copyPrompt = async () => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      ok = false;
      setError("Browser menolak menyalin otomatis. Salin manual dari kotak prompt.");
    }
    setCopied(ok);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2500);
  };

  const paste = async () => {
    try {
      setCode(await navigator.clipboard.readText());
      setError(null);
    } catch {
      setError("Browser menolak membaca clipboard. Tempel manual dengan Ctrl+V.");
    }
  };

  const generate = async () => {
    if (busy || !valid) return;
    if (!license.active) {
      setLicenseNotice("Buat Vector (AI) butuh lisensi. Masukkan kode lisensi di bawah.");
      setLicenseOpen(true);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const images = refs.length > 0 ? await encodeReferences(refs.slice(0, MAX_AI_REFS)) : [];
      const { text, model } = await requestVector(prompt, controller.signal, license.code, images);
      if (apply(text)) setInfo((prev) => [`Selesai (model: ${model || "?"}).`, prev].filter(Boolean).join(" "));
    } catch (e) {
      if (e instanceof LicenseError) {
        license.refresh();
        setLicenseNotice(e.message);
        setLicenseOpen(true);
      } else if (isAbort(e)) {
        setInfo("Dibatalkan.");
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const addRefs = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    let list = refs;
    for (const file of Array.from(files)) {
      if (list.length >= MAX_AI_REFS) {
        setError(`Maksimal ${MAX_AI_REFS} gambar referensi.`);
        break;
      }
      try {
        const layer = await loadLayer(file, list.map((l) => l.name));
        list = [...list, { ...layer, mode: "reference" }];
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setRefs(list);
  };

  const stamp = () => Date.now();
  const downloadSvg = () => svg && saveBlob(new Blob([svg], { type: "image/svg+xml" }), `vector-${stamp()}.svg`);
  const downloadPng = async () => {
    if (!svg) return;
    try {
      saveBlob(await rasterize(svg, pngWidth), `vector-${pngWidth}px-${stamp()}.png`);
    } catch (e) {
      setError(`PNG gagal: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <main className="mx-auto max-w-[1400px] p-4 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border-[3px] border-ink bg-sun text-2xl text-black shadow-brut">
            ◆
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-none tracking-tight">VIBEFRAME · VECTOR</h1>
            <p className="text-xs font-bold opacity-70">Buat gambar vector dari prompt, ubah warna per bagian</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className={`${btn.small} !px-4 !py-2 !text-sm`}>
            ← Animasi
          </Link>
          <button
            onClick={() => setLicenseOpen(true)}
            aria-haspopup="dialog"
            className={`${license.active ? btn.smallSun : btn.small} !px-4 !py-2 !text-sm`}
          >
            {license.active ? "👑 Premium" : "🔑 Lisensi"}
          </button>
          <button onClick={toggleDark} className={`${btn.small} !px-4 !py-2 !text-sm`} aria-label="Ganti tema">
            {dark ? "☀️ Terang" : "🌙 Gelap"}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full shrink-0 space-y-4 lg:w-[380px]">
          <section className={`${card} space-y-4 p-4`}>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase">Deskripsi gambar</span>
              <textarea
                rows={4}
                maxLength={VECTOR_IDEA_MAX}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Contoh: piring merah dengan lingkaran hitam di tengahnya, dilihat dari atas"
                className={`${field} resize-none`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase">Gaya</span>
                <select className={field} value={style} onChange={(e) => setStyle(e.target.value as VectorStyle)}>
                  {VECTOR_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase">Ukuran</span>
                <select className={field} value={format} onChange={(e) => setFormat(e.target.value as VectorFormat)}>
                  {VECTOR_FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs opacity-70">{styleInfo.hint}</p>

            <div>
              <div className="mb-1 flex justify-between text-xs font-bold uppercase">
                <span>Jumlah warna utama</span>
                <span>{colors}</span>
              </div>
              <input
                type="range"
                min={VECTOR_COLORS_MIN}
                max={VECTOR_COLORS_MAX}
                value={colors}
                onChange={(e) => setColors(Number(e.target.value))}
                aria-label="Jumlah warna utama"
                className="w-full"
              />
              <p className="mt-1 text-xs opacity-70">Warna lebih sedikit = bagian lebih sedikit dan lebih mudah diubah.</p>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="h-4 w-4" />
              Latar transparan
            </label>
          </section>

          <section className={`${card} space-y-3 p-4`}>
            <span className={sectionTitle}>🖼️ Referensi (opsional)</span>
            <p className="text-xs opacity-70">
              AI melihat gambar ini lalu menggambar ulang dengan bentuk SVG, jadi hasilnya mirip tapi tidak persis sama. Maks {MAX_AI_REFS} gambar.
            </p>
            {refs.length > 0 && (
              <ul className="space-y-2">
                {refs.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <Thumb layer={r} />
                    <input
                      value={r.note}
                      maxLength={VECTOR_NOTE_MAX}
                      onChange={(e) => setRefs((list) => list.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)))}
                      placeholder="Catatan, mis. tiru warnanya"
                      aria-label={`Catatan untuk ${r.name}`}
                      className={`${field} !py-1 text-xs`}
                    />
                    <button
                      onClick={() => setRefs((list) => list.filter((x) => x.id !== r.id))}
                      aria-label={`Hapus ${r.name}`}
                      className={`${btn.small} !px-2`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className={`${btn.small} inline-block cursor-pointer`}>
              + Tambah gambar
              <input
                type="file"
                accept={ACCEPT}
                multiple
                className="sr-only"
                disabled={refs.length >= MAX_AI_REFS}
                onChange={(e) => {
                  void addRefs(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {refs.length > 0 && (
              <p className="text-xs opacity-70">
                Buat Vector (AI): gambar diperkecil lalu dikirim lewat server ke Google Gemini. Untuk Salin prompt, lampirkan sendiri di chat AI.
              </p>
            )}
          </section>

          <section className={`${card} space-y-3 p-4`}>
            <textarea readOnly rows={6} value={prompt} placeholder="Prompt muncul setelah deskripsi diisi (minimal 10 karakter)." className={mono} aria-label="Prompt hasil" />
            <button onClick={() => void copyPrompt()} disabled={!valid} className={btn.primary}>
              {copied ? "✓ Tersalin" : "📋 Salin prompt"}
            </button>
            {busy ? (
              <button onClick={() => abortRef.current?.abort()} className={btn.secondary}>
                ✕ Batal
              </button>
            ) : (
              <button onClick={() => void generate()} disabled={!valid} className={btn.secondary}>
                {license.active ? "✨ Buat Vector (AI)" : "🔒 Buat Vector (butuh lisensi)"}
              </button>
            )}
            {busy && (
              <p role="status" className="text-xs font-bold">
                ⏳ AI sedang menggambar…
              </p>
            )}
            <p className="text-xs opacity-70">Atau tempel prompt di AI lain, lalu tempel kode SVG-nya di kotak sebelah kanan.</p>
          </section>
        </div>

        <section className="min-w-0 flex-1 space-y-6">
          {(error || info) && (
            <p
              role={error ? "alert" : "status"}
              className={`rounded-lg border-[3px] border-ink p-3 text-xs font-bold ${error ? "bg-pink text-black" : "bg-lime text-black"}`}
            >
              {error ?? info}
            </p>
          )}

          <div className={`${card} p-3`}>
            <div
              className="flex min-h-[260px] items-center justify-center rounded-lg border-[3px] border-ink p-3"
              style={{
                backgroundImage: "conic-gradient(#d9d9d9 25%, #ffffff 0 50%, #d9d9d9 0 75%, #ffffff 0)",
                backgroundSize: "20px 20px",
              }}
            >
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt="Pratinjau gambar vector"
                  style={{ aspectRatio: `${size.width} / ${size.height}` }}
                  className="max-h-[65vh] w-full object-contain"
                />
              ) : (
                <p className="rounded-lg border-[3px] border-ink bg-card p-3 text-xs font-bold text-ink">
                  Pratinjau muncul di sini setelah kode SVG ditampilkan.
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={downloadSvg} disabled={!svg} className={btn.medium}>
                ⬇ SVG
              </button>
              <button onClick={() => void downloadPng()} disabled={!svg} className={btn.medium}>
                ⬇ PNG
              </button>
              <select
                value={pngWidth}
                onChange={(e) => setPngWidth(Number(e.target.value))}
                aria-label="Lebar PNG"
                className={`${field} !w-auto !py-1.5 text-xs`}
              >
                {PNG_WIDTHS.map((w) => (
                  <option key={w} value={w}>
                    {w}px lebar
                  </option>
                ))}
              </select>
              {svg && (
                <span className="font-mono text-xs opacity-70">
                  viewBox {size.width}×{size.height}
                </span>
              )}
            </div>
          </div>

          {svg && (
            <div className={`${card} p-4`}>
              <VectorColors svg={svg} onChange={editSvg} onHover={setHover} />
            </div>
          )}

          <div className={`${card} space-y-3 p-4`}>
            <span className={sectionTitle}>Kode SVG</span>
            <textarea
              rows={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Tempel kode SVG dari AI di sini (boleh beserta blok ```svg)."
              spellCheck={false}
              className={mono}
              aria-label="Kode SVG"
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={() => apply(code)} disabled={code.trim() === ""} className={btn.medium}>
                ▶ Tampilkan
              </button>
              <button onClick={() => void paste()} className={btn.small}>
                📋 Paste
              </button>
              <button
                onClick={() => {
                  setCode("");
                  setSvg("");
                  setError(null);
                  setInfo(null);
                  setHover(null);
                }}
                disabled={code === "" && svg === ""}
                className={btn.small}
              >
                🗑 Kosongkan
              </button>
            </div>
          </div>
        </section>
      </div>

      {licenseOpen && (
        <LicenseModal
          license={license}
          notice={licenseNotice}
          onClose={() => {
            setLicenseOpen(false);
            setLicenseNotice(null);
          }}
        />
      )}
    </main>
  );
}

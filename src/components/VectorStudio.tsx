"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useLicense } from "@/hooks/useLicense";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useVector } from "@/hooks/useVector";
import { dimOthers, getParts, hitBounds, hitIndexAt, rasterizeHit, toDataUrl, viewBoxSize, type HitMap } from "@/lib/svg";
import { PNG_WIDTHS, PREVIEW_BGS, PREVIEW_BG_IDS, type PreviewBg } from "@/lib/vectorView";
import FloatingPanel from "./FloatingPanel";
import LicenseModal from "./LicenseModal";
import SvgHub from "./SvgHub";
import VectorConfig from "./VectorConfig";
import VectorPromptModal from "./VectorPromptModal";
import VectorSelected from "./VectorSelected";
import { btn, card, field } from "./ui";

const oneOf = (list: readonly unknown[]) => (v: unknown) => list.includes(v);
const isPngWidth = oneOf(PNG_WIDTHS);

export default function VectorStudio() {
  const v = useVector();
  const license = useLicense();
  const [promptOpen, setPromptOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [licenseNotice, setLicenseNotice] = useState<string | null>(null);
  const [hover, setHover] = useState<number[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const hitCache = useRef<{ svg: string; map: HitMap | null } | null>(null);
  const [previewBg, setPreviewBg] = usePersistentState<PreviewBg>("vector:previewbg", "checker", oneOf(PREVIEW_BG_IDS));
  const [pngWidth, setPngWidth] = usePersistentState("vector:pngwidth", 2048, isPngWidth);
  const [withBg, setWithBg] = usePersistentState("vector:withbg", false, (x) => typeof x === "boolean");
  const bgColor = PREVIEW_BGS[previewBg].color;
  const exportBg = withBg ? bgColor : null;

  const size = useMemo(() => (v.svg ? viewBoxSize(v.svg) : { width: 1, height: 1 }), [v.svg]);
  const partCount = useMemo(() => (v.svg ? getParts(v.svg).length : 0), [v.svg]);
  const shapeSig = useMemo(
    () => (v.svg ? getParts(v.svg).map((p) => p.tag).join(",") : ""),
    [v.svg]
  );

  const getHit = async (svg: string): Promise<HitMap | null> => {
    if (hitCache.current?.svg === svg) return hitCache.current.map;
    let map: HitMap | null = null;
    try {
      map = await rasterizeHit(svg);
    } catch {}
    hitCache.current = { svg, map };
    return map;
  };

  useEffect(() => {
    setSelected(null);
  }, [shapeSig]);

  useEffect(() => {
    if (selected === null || !v.svg) {
      setBox(null);
      return;
    }
    let live = true;
    const id = setTimeout(() => {
      void getHit(v.svg).then((map) => {
        if (live) setBox(map ? hitBounds(map, selected) : null);
      });
    }, 150);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [selected, v.svg]);

  const { undo, redo, canUndo, canRedo } = v;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "TEXTAREA" ||
        (target?.tagName === "INPUT" && !["color", "checkbox", "range", "radio", "button"].includes((target as HTMLInputElement).type));
      if (typing || target?.isContentEditable) return;
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const pick = async (e: MouseEvent<HTMLDivElement>) => {
    if (!v.svg) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const map = await getHit(v.svg);
    setSelected(map ? hitIndexAt(map, nx, ny) : null);
  };
  const previewSrc = useMemo(
    () => (v.svg ? toDataUrl(hover && hover.length > 0 ? dimOthers(v.svg, hover) : v.svg) : ""),
    [v.svg, hover]
  );

  const needLicense = (message: string) => {
    setLicenseNotice(message);
    setLicenseOpen(true);
  };

  const generate = async (prompt: string) => {
    setPromptOpen(false);
    if (!license.active) {
      needLicense("Buat Vector (AI) butuh lisensi. Masukkan kode lisensi di bawah.");
      return;
    }
    const outcome = await v.generate(prompt, license.code);
    if (outcome.status === "rejected") setTerminalOpen(true);
    if (outcome.status === "ok") setSelected(null);
    if (outcome.status === "license") {
      license.refresh();
      needLicense(outcome.message ?? "Lisensi tidak valid.");
    }
  };

  const message = v.error ?? v.notice;

  return (
    <main className="mx-auto max-w-[1400px] p-4 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border-[3px] border-ink bg-sun text-2xl text-black shadow-brut">
            ◆
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-none tracking-tight">VIBEFRAME · VECTOR</h1>
            <p className="text-xs font-bold opacity-70">Buat gambar vector, ubah warna per bagian</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setPromptOpen(true)} aria-haspopup="dialog" className={`${btn.smallSun} !px-4 !py-2 !text-sm`}>
            📝 Prompt AI
          </button>
          <button
            onClick={() => setTerminalOpen((open) => !open)}
            aria-pressed={terminalOpen}
            className={`${terminalOpen ? btn.smallSun : btn.small} !px-4 !py-2 !text-sm`}
          >
            🖥️ Terminal
          </button>
          <Link href="/" className={`${btn.small} !px-4 !py-2 !text-sm`}>
            🎬 Animasi
          </Link>
          <button
            onClick={() => setLicenseOpen(true)}
            aria-haspopup="dialog"
            className={`${license.active ? btn.smallSun : btn.small} !px-4 !py-2 !text-sm`}
          >
            {license.active ? "👑 Premium" : "🔑 Lisensi"}
          </button>
          <button onClick={v.toggleDark} className={`${btn.small} !px-4 !py-2 !text-sm`} aria-label="Ganti tema">
            {v.dark ? "☀️ Terang" : "🌙 Gelap"}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full shrink-0 lg:w-[340px]">
          <VectorConfig
            svg={v.svg}
            onSvgChange={v.editSvg}
            selected={selected}
            onSelect={setSelected}
            onHover={setHover}
            previewBg={previewBg}
            onPreviewBg={setPreviewBg}
            refs={v.refs}
            onAddRefs={(files) => void v.addRefs(files)}
            onRemoveRef={v.removeRef}
            onRefNote={v.setRefNote}
            onUseAi={() => setPromptOpen(true)}
            logs={v.logs}
            onClearLogs={v.clearLogs}
          />
        </div>

        <section className="min-w-0 flex-1 space-y-6">
          {v.busy && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-lg border-[3px] border-ink bg-lime p-3 text-xs font-bold text-black">
              <span>⏳ AI sedang menggambar…</span>
              <button onClick={v.cancelGenerate} className={btn.small}>
                ✕ Batal
              </button>
            </div>
          )}
          {message && !v.busy && (
            <p
              role={v.error ? "alert" : "status"}
              className={`rounded-lg border-[3px] border-ink p-3 text-xs font-bold text-black ${v.error ? "bg-pink" : "bg-lime"}`}
            >
              {message}
            </p>
          )}

          <div className={`${card} space-y-2 p-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold opacity-70">
                {v.svg ? "👆 Klik bagian gambar untuk memilih dan mengubah warnanya." : "\u00a0"}
              </p>
              <div className="flex gap-1.5">
                <button onClick={undo} disabled={!canUndo} aria-label="Urungkan" title="Urungkan (Ctrl+Z)" className={btn.small}>
                  ↶ Urungkan
                </button>
                <button onClick={redo} disabled={!canRedo} aria-label="Ulangi" title="Ulangi (Ctrl+Y)" className={btn.small}>
                  ↷ Ulangi
                </button>
              </div>
            </div>
            <div
              className="flex min-h-[320px] items-center justify-center rounded-lg border-[3px] border-ink p-3"
              style={PREVIEW_BGS[previewBg].style}
            >
              {previewSrc ? (
                <div
                  className="relative select-none"
                  style={{ aspectRatio: `${size.width} / ${size.height}`, width: `min(100%, calc(70vh * ${size.width / size.height}))` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSrc} alt="Pratinjau gambar vector" draggable={false} className="block h-full w-full" />
                  <div
                    data-testid="pick-layer"
                    onClick={(e) => void pick(e)}
                    className="absolute inset-0 cursor-crosshair"
                    aria-hidden="true"
                  />
                  {box && selected !== null && (
                    <div
                      data-testid="selection-box"
                      className="pointer-events-none absolute border-2 border-dashed border-pink outline outline-1 outline-black"
                      style={{
                        left: `${box.x * 100}%`,
                        top: `${box.y * 100}%`,
                        width: `${box.w * 100}%`,
                        height: `${box.h * 100}%`,
                      }}
                    />
                  )}
                </div>
              ) : (
                <p className="max-w-sm rounded-lg border-[3px] border-ink bg-card p-3 text-center text-xs font-bold text-ink">
                  Belum ada gambar. Klik 📝 Prompt AI untuk membuat, atau buka 🖥️ Terminal untuk menempel kode SVG.
                </p>
              )}
            </div>
          </div>

          <VectorSelected svg={v.svg} selected={selected} onChange={v.editSvg} onSelect={setSelected} />

          <div className={`${card} space-y-3 p-3`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-xs">
                {v.svg ? `SVG · viewBox ${size.width}×${size.height} · ${partCount} bentuk` : "SVG · belum ada gambar"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pngWidth}
                  onChange={(e) => setPngWidth(Number(e.target.value))}
                  aria-label="Lebar PNG"
                  className={`${field} !w-auto !py-1.5 text-xs`}
                >
                  {PNG_WIDTHS.map((w) => (
                    <option key={w} value={w}>
                      PNG {w}px
                    </option>
                  ))}
                </select>
                <button onClick={() => void v.downloadPng(pngWidth, exportBg)} disabled={!v.svg} className={btn.medium}>
                  ⬇ PNG
                </button>
                <button onClick={() => v.downloadSvg(exportBg)} disabled={!v.svg} className={btn.medium}>
                  ⬇ SVG
                </button>
                <button
                  onClick={() => {
                    setHover(null);
                    setSelected(null);
                    v.clearImage();
                  }}
                  disabled={!v.svg}
                  aria-label="Hapus gambar"
                  className={btn.small}
                >
                  🗑
                </button>
              </div>
            </div>
            {bgColor ? (
              <label className="flex items-center gap-2 text-xs font-bold">
                <input type="checkbox" checked={withBg} onChange={(e) => setWithBg(e.target.checked)} className="h-4 w-4" />
                Unduh dengan latar {PREVIEW_BGS[previewBg].label} ({bgColor})
              </label>
            ) : (
              <p className="text-xs opacity-70">Unduhan transparan (tanpa latar). Pilih latar lain di Config untuk mengunduh dengan latar.</p>
            )}
          </div>
        </section>
      </div>

      {terminalOpen && (
        <FloatingPanel title="Terminal · kode SVG" storageKey="panel:vector-terminal" onClose={() => setTerminalOpen(false)}>
          <SvgHub code={v.code} onChange={v.setCode} onShow={v.showCode} onPaste={() => void v.pasteFromClipboard()} />
        </FloatingPanel>
      )}

      {promptOpen && (
        <VectorPromptModal
          refs={v.refs}
          generating={v.busy}
          locked={!license.active}
          licenseCode={license.code}
          onNeedLicense={(message) => {
            setPromptOpen(false);
            needLicense(message);
          }}
          onGenerate={(prompt) => void generate(prompt)}
          onClose={() => setPromptOpen(false)}
        />
      )}

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

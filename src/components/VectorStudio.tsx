"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLicense } from "@/hooks/useLicense";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useVector } from "@/hooks/useVector";
import { dimOthers, getParts, toDataUrl, viewBoxSize } from "@/lib/svg";
import { PNG_WIDTHS, PREVIEW_BGS, PREVIEW_BG_IDS, type PreviewBg } from "@/lib/vectorView";
import FloatingPanel from "./FloatingPanel";
import LicenseModal from "./LicenseModal";
import SvgHub from "./SvgHub";
import VectorConfig from "./VectorConfig";
import VectorPromptModal from "./VectorPromptModal";
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
  const [previewBg, setPreviewBg] = usePersistentState<PreviewBg>("vector:previewbg", "checker", oneOf(PREVIEW_BG_IDS));
  const [pngWidth, setPngWidth] = usePersistentState("vector:pngwidth", 2048, isPngWidth);

  const size = useMemo(() => (v.svg ? viewBoxSize(v.svg) : { width: 1, height: 1 }), [v.svg]);
  const partCount = useMemo(() => (v.svg ? getParts(v.svg).length : 0), [v.svg]);
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

          <div className={`${card} p-3`}>
            <div
              className="flex min-h-[320px] items-center justify-center rounded-lg border-[3px] border-ink p-3"
              style={PREVIEW_BGS[previewBg].style}
            >
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt="Pratinjau gambar vector"
                  style={{ aspectRatio: `${size.width} / ${size.height}` }}
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                <p className="max-w-sm rounded-lg border-[3px] border-ink bg-card p-3 text-center text-xs font-bold text-ink">
                  Belum ada gambar. Klik 📝 Prompt AI untuk membuat, atau buka 🖥️ Terminal untuk menempel kode SVG.
                </p>
              )}
            </div>
          </div>

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
                <button onClick={() => void v.downloadPng(pngWidth)} disabled={!v.svg} className={btn.medium}>
                  ⬇ PNG
                </button>
                <button onClick={v.downloadSvg} disabled={!v.svg} className={btn.medium}>
                  ⬇ SVG
                </button>
                <button
                  onClick={() => {
                    setHover(null);
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

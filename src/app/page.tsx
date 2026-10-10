"use client";

import { useMemo, useState } from "react";
import CodeHub from "@/components/CodeHub";
import ConfigTabs from "@/components/ConfigTabs";
import FloatingPanel from "@/components/FloatingPanel";
import HistoryModal from "@/components/HistoryModal";
import PromptModal from "@/components/PromptModal";
import Viewport from "@/components/Viewport";
import { btn, card } from "@/components/ui";
import { usePlayer } from "@/hooks/usePlayer";
import { useStudio } from "@/hooks/useStudio";
import { renderParams } from "@/lib/presets";

export default function Home() {
  const studio = useStudio();
  const player = usePlayer(studio.result, studio.onPlayerError);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptWithLayers, setPromptWithLayers] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const layerNames = useMemo(() => studio.layers.map((l) => l.name), [studio.layers]);

  const view = studio.result ?? { ratio: studio.ratio, duration: studio.duration };
  const size = renderParams(view.ratio, studio.preset);
  const percent = studio.progress ? Math.round((studio.progress.done / studio.progress.total) * 100) : 0;

  return (
    <main className="mx-auto max-w-[1400px] p-4 lg:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border-[3px] border-ink bg-sun text-2xl text-black shadow-brut">
            ▶
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-none tracking-tight">VIBEFRAME</h1>
            <p className="text-xs font-bold opacity-70">VibeFrame · tempel kode, lihat animasinya</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPromptWithLayers(false);
              setPromptOpen(true);
            }}
            aria-haspopup="dialog"
            className={`${btn.smallSun} !px-4 !py-2 !text-sm`}
          >
            📝 Prompt AI
          </button>
          <button
            onClick={() => setTerminalOpen((v) => !v)}
            aria-pressed={terminalOpen}
            className={`${terminalOpen ? btn.smallSun : btn.small} !px-4 !py-2 !text-sm`}
          >
            🖥️ Terminal
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            aria-haspopup="dialog"
            className={`${btn.small} !px-4 !py-2 !text-sm`}
          >
            🕘 Riwayat
          </button>
          <button onClick={studio.toggleDark} className={`${btn.small} !px-4 !py-2 !text-sm`} aria-label="Ganti tema">
            {studio.dark ? "☀️ Terang" : "🌙 Gelap"}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full shrink-0 lg:w-[340px]">
          <ConfigTabs
            duration={studio.duration}
            onDuration={studio.setDuration}
            ratio={studio.ratio}
            onRatio={studio.setRatio}
            fps={studio.fps}
            onFps={studio.setFps}
            preset={studio.preset}
            onPreset={studio.setPreset}
            rendering={studio.rendering}
            logs={studio.logs}
            onClearLogs={studio.clearLogs}
            coverSource={studio.result ? { code: studio.result.code, ratio: studio.result.ratio } : null}
            coverTime={studio.coverAt}
            coverMax={studio.coverMax}
            playerTime={player.time}
            coverBusy={studio.coverBusy}
            onCoverTime={studio.setCoverTime}
            onSaveCover={studio.saveCover}
            layers={studio.layers}
            onAddLayers={studio.addFiles}
            onRemoveLayer={studio.removeLayer}
            onRenameLayer={studio.renameLayer}
            onLayerNote={studio.setLayerNote}
            onMoveLayer={studio.moveLayer}
            onLayerCutout={studio.setLayerCutout}
            onUseAi={() => {
              setPromptWithLayers(true);
              setPromptOpen(true);
            }}
          />
        </div>

        <section className="min-w-0 flex-1 space-y-6">
          <Viewport
            containerRef={player.containerRef}
            hasResult={!!studio.result}
            ratio={view.ratio}
            duration={view.duration}
            loadingLabel={null}
            playing={player.playing}
            time={player.time}
            onToggle={player.toggle}
            onSeek={player.seek}
            onRestart={player.restart}
          />

          <div className={`${card} space-y-3 p-3`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-xs">
                MP4 · {size.width}×{size.height} · {studio.fps} fps · {view.duration} detik
              </p>
              {studio.rendering ? (
                <button onClick={studio.cancelRender} className={btn.small}>
                  ✕ Batal
                </button>
              ) : (
                <button onClick={studio.exportMp4} disabled={!studio.result} className={btn.medium}>
                  ⬇ Render MP4
                </button>
              )}
            </div>

            {studio.progress && (
              <div>
                <div className="h-6 overflow-hidden rounded-lg border-[3px] border-ink bg-card">
                  <div className="h-full bg-lime transition-all" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-1 text-xs font-bold">
                  Merender frame {studio.progress.done} / {studio.progress.total} ({percent}%)
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {terminalOpen && (
        <FloatingPanel title="Terminal · kode draw()" storageKey="panel:terminal" onClose={() => setTerminalOpen(false)}>
          <CodeHub
            code={studio.code}
            onChange={studio.setCode}
            onRender={studio.renderCode}
            onPaste={studio.pasteFromClipboard}
            disabled={studio.rendering}
            layerNames={layerNames}
          />
        </FloatingPanel>
      )}

      {promptOpen && (
        <PromptModal
          duration={studio.duration}
          ratio={studio.ratio}
          onDuration={studio.setDuration}
          onRatio={studio.setRatio}
          layers={promptWithLayers ? studio.layers : []}
          onDropLayers={() => setPromptWithLayers(false)}
          generating={studio.generating}
          onGenerate={async (prompt) => {
            setPromptOpen(false);
            const outcome = await studio.generate(prompt);
            if (outcome === "rejected") setTerminalOpen(true);
          }}
          onClose={() => setPromptOpen(false)}
        />
      )}

      {historyOpen && (
        <HistoryModal
          items={studio.history.items}
          disabled={studio.rendering}
          onOpen={(entry) => {
            studio.openHistory(entry);
            setHistoryOpen(false);
          }}
          onRename={studio.history.rename}
          onRemove={studio.history.remove}
          onClear={studio.history.clear}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {studio.generating && (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-40 flex items-center gap-3 rounded-xl border-[3px] border-ink bg-sun p-3 text-sm font-bold text-black shadow-brut"
        >
          <span>✨ AI sedang membuat animasi…</span>
          <button onClick={studio.cancelGenerate} className={btn.small}>
            ✕ Batal
          </button>
        </div>
      )}

      {studio.error && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border-[3px] border-ink bg-pink p-4 text-sm font-bold text-black shadow-brut-lg"
        >
          <p className="min-w-0 flex-1 break-words">{studio.error}</p>
          <button
            onClick={studio.dismissError}
            aria-label="Tutup"
            className="rounded border-2 border-black px-1.5 leading-none hover:bg-black hover:text-pink"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
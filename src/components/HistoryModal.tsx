"use client";

import { useEffect, useMemo, useState } from "react";
import type { HistoryEntry } from "@/hooks/useHistory";
import { HISTORY_MAX } from "@/hooks/useHistory";
import Modal from "./Modal";
import { btn, field } from "./ui";

interface Props {
  items: HistoryEntry[];
  disabled: boolean;
  onOpen: (entry: HistoryEntry) => void;
  onRename: (id: string, raw: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function NameField({ entry, onRename }: { entry: HistoryEntry; onRename: (id: string, raw: string) => void }) {
  const [draft, setDraft] = useState(entry.name);

  useEffect(() => setDraft(entry.name), [entry.name]);

  const commit = () => {
    if (draft.trim() === "") setDraft(entry.name);
    else if (draft !== entry.name) onRename(entry.id, draft);
  };

  return (
    <input
      value={draft}
      maxLength={60}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      aria-label={`Nama riwayat ${entry.name}`}
      className={`${field} !px-2 !py-1 !text-xs font-bold`}
    />
  );
}

interface Group {
  root: HistoryEntry;
  fixes: HistoryEntry[];
  latest: number;
}

export function groupHistory(items: HistoryEntry[]): Group[] {
  const ids = new Set(items.map((e) => e.id));
  const fixesOf = new Map<string, HistoryEntry[]>();
  const roots: HistoryEntry[] = [];
  for (const e of items) {
    if (e.parentId && ids.has(e.parentId)) fixesOf.set(e.parentId, [...(fixesOf.get(e.parentId) ?? []), e]);
    else roots.push(e);
  }
  return roots
    .map((root) => {
      const fixes = (fixesOf.get(root.id) ?? []).sort((a, b) => (a.rev ?? 0) - (b.rev ?? 0));
      return { root, fixes, latest: Math.max(root.at, ...fixes.map((f) => f.at)) };
    })
    .sort((a, b) => b.latest - a.latest);
}

function Row({
  entry,
  disabled,
  onOpen,
  onRename,
  onRemove,
  fix,
}: {
  entry: HistoryEntry;
  disabled: boolean;
  onOpen: (entry: HistoryEntry) => void;
  onRename: (id: string, raw: string) => void;
  onRemove: (id: string) => void;
  fix?: boolean;
}) {
  return (
    <li className={`space-y-2 rounded-lg border-[3px] border-ink bg-paper p-2 ${fix ? "ml-5" : ""}`}>
      <div className="flex items-center gap-2">
        {fix && (
          <span className="shrink-0 rounded border-2 border-ink bg-sun px-1.5 text-[10px] font-bold text-black">
            🛠 {entry.rev ?? 1}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <NameField entry={entry} onRename={onRename} />
        </div>
        <button onClick={() => onOpen(entry)} disabled={disabled} className={`${btn.smallSun} shrink-0`}>
          Buka
        </button>
        <button
          onClick={() => onRemove(entry.id)}
          aria-label={`Hapus ${entry.name}`}
          className={`${btn.small} shrink-0 !px-2 hover:!bg-pink`}
        >
          ✕
        </button>
      </div>
      <p className="font-mono text-[10px] opacity-70">
        {entry.ratio} · {entry.duration} detik · {entry.code.split("\n").length} baris
      </p>
      {entry.layers.length > 0 && (
        <p className="text-[10px] font-bold">
          ⚠️ Butuh layer: {entry.layers.map((n) => `assets.${n}`).join(", ")}. Unggah ulang gambarnya dengan nama yang sama.
        </p>
      )}
    </li>
  );
}

export default function HistoryModal({ items, disabled, onOpen, onRename, onRemove, onClear, onClose }: Props) {
  const groups = useMemo(() => groupHistory(items), [items]);
  const handleClear = () => {
    if (window.confirm(`Hapus semua ${items.length} riwayat?`)) onClear();
  };

  return (
    <Modal title="Riwayat" onClose={onClose} widthClass="max-w-xl">
      {items.length === 0 ? (
        <p className="text-sm opacity-70">
          Belum ada riwayat. Setiap kali kamu menekan Render kode, hasilnya tersimpan di sini (di browser ini saja).
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs opacity-70">
            Tersimpan di browser ini, maksimal {HISTORY_MAX} item terbaru. Layer gambar tidak ikut tersimpan.
          </p>
          <ul className="space-y-2" aria-label="Daftar riwayat">
            {groups.map(({ root, fixes }) => (
              <li key={root.id} className="list-none space-y-2">
                <ul className="space-y-2">
                  <Row entry={root} disabled={disabled} onOpen={onOpen} onRename={onRename} onRemove={onRemove} />
                  {fixes.map((f) => (
                    <Row key={f.id} entry={f} fix disabled={disabled} onOpen={onOpen} onRename={onRename} onRemove={onRemove} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <button onClick={handleClear} className={`${btn.small} mt-3 hover:!bg-pink`}>
            Hapus semua
          </button>
        </>
      )}
    </Modal>
  );
}

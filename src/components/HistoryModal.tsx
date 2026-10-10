"use client";

import { useEffect, useState } from "react";
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

export default function HistoryModal({ items, disabled, onOpen, onRename, onRemove, onClear, onClose }: Props) {
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
            {items.map((e) => (
              <li key={e.id} className="space-y-2 rounded-lg border-[3px] border-ink bg-paper p-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <NameField entry={e} onRename={onRename} />
                  </div>
                  <button
                    onClick={() => onOpen(e)}
                    disabled={disabled}
                    className={`${btn.smallSun} shrink-0`}
                  >
                    Buka
                  </button>
                  <button
                    onClick={() => onRemove(e.id)}
                    aria-label={`Hapus ${e.name}`}
                    className={`${btn.small} shrink-0 !px-2 hover:!bg-pink`}
                  >
                    ✕
                  </button>
                </div>
                <p className="font-mono text-[10px] opacity-70">
                  {e.ratio} · {e.duration} detik · {e.code.split("\n").length} baris
                </p>
                {e.layers.length > 0 && (
                  <p className="text-[10px] font-bold">
                    ⚠️ Butuh layer: {e.layers.map((n) => `assets.${n}`).join(", ")}. Unggah ulang gambarnya dengan nama yang
                    sama.
                  </p>
                )}
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
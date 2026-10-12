"use client";

import { useState } from "react";
import { btn, field, sectionTitle } from "./ui";

const INSTRUCTION_MAX = 1000;
const FIT_TEXT = "Sesuaikan animasi agar pas dengan durasi dan rasio saat ini.";
const LOOP_TEXT =
  "Ubah agar video bisa di-loop mulus: keadaan di frame terakhir harus sama dengan frame pertama. Pakai gerakan periodik terhadap time / DURATION, tanpa fade ke warna latar dan tanpa loncatan.";

interface Props {
  locked: boolean;
  busy: boolean;
  hasCode: boolean;
  problem: string;
  canUndo: boolean;
  onFix: (instruction: string) => Promise<boolean>;
  onUndo: () => void;
}

export default function FixPanel({ locked, busy, hasCode, problem, canUndo, onFix, onUndo }: Props) {
  const [instruction, setInstruction] = useState("");
  const text = instruction.trim();
  const canRun = hasCode && !busy && (text !== "" || problem !== "");

  const run = async () => {
    if (!canRun) return;
    const done = await onFix(text);
    if (done) setInstruction("");
  };

  const label = busy
    ? "⏳ AI sedang bekerja…"
    : locked
      ? "🔒 Perbaiki dengan AI (butuh lisensi)"
      : text
        ? "✨ Terapkan perubahan"
        : "✨ Perbaiki error";

  return (
    <div className="space-y-2">
      <span className={sectionTitle}>✨ Perbaiki dengan AI</span>

      {problem && (
        <p role="status" className="rounded-lg border-[3px] border-ink bg-pink p-2 text-xs font-bold text-black">
          Kode bermasalah: {problem}
        </p>
      )}

      <textarea
        rows={3}
        maxLength={INSTRUCTION_MAX}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        disabled={busy}
        placeholder="Contoh: buat mobilnya lebih cepat, ganti warna jadi pastel. Kosongkan kalau hanya ingin memperbaiki error."
        className={`${field} resize-y`}
        aria-label="Permintaan perubahan"
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setInstruction(FIT_TEXT)} disabled={busy} className={btn.small}>
          Sesuaikan durasi dan rasio
        </button>
        <button onClick={() => setInstruction(LOOP_TEXT)} disabled={busy} className={btn.small}>
          Buat loop mulus
        </button>
        {canUndo && (
          <button onClick={onUndo} disabled={busy} className={btn.small}>
            ↩ Urungkan perbaikan
          </button>
        )}
      </div>

      <button onClick={() => void run()} disabled={!canRun} className={btn.secondary}>
        {label}
      </button>

      <p className="text-xs opacity-70">
        AI mengedit kode yang ada di Terminal, lalu hasilnya langsung dirender. Kalau hasilnya tidak valid, kode lama tidak
        diubah.
      </p>
    </div>
  );
}

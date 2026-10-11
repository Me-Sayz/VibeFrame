"use client";

import { useState } from "react";
import type { LicenseApi } from "@/hooks/useLicense";
import Modal from "./Modal";
import { btn, field, sectionTitle } from "./ui";

interface Props {
  license: LicenseApi;
  notice: string | null;
  onClose: () => void;
}

const DAY_MS = 86_400_000;

const when = (ms: number) =>
  new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

const remaining = (ms: number) => {
  const days = Math.ceil((ms - Date.now()) / DAY_MS);
  return days > 1 ? `${days} hari lagi` : "kurang dari 1 hari lagi";
};

export default function LicenseModal({ license, notice, onClose }: Props) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const { status, code, expiresAt } = license;

  const submit = async () => {
    const r = await license.activate(input);
    setResult({ ok: r.ok, text: r.message });
    if (r.ok) setInput("");
  };

  const remove = () => {
    if (window.confirm("Hapus lisensi dari browser ini? Kamu bisa memasukkannya lagi selama belum kedaluwarsa.")) {
      license.clear();
      setResult(null);
    }
  };

  const hasStored = status !== "none";

  return (
    <Modal title="Lisensi" onClose={onClose} widthClass="max-w-xl">
      <div className="space-y-4">
        {notice && (
          <p role="alert" className="rounded-lg border-[3px] border-ink bg-pink p-2 text-xs font-bold text-black">
            {notice}
          </p>
        )}

        {hasStored && (
          <section
            aria-label="Lisensi saat ini"
            className={`space-y-2 rounded-lg border-[3px] border-ink p-3 ${status === "active" ? "bg-lime text-black" : "bg-card"}`}
          >
            <p className="text-xs font-bold uppercase">
              {status === "active" && "👑 Lisensi aktif"}
              {status === "checking" && "⏳ Memeriksa lisensi…"}
              {status === "expired" && "⌛ Lisensi kedaluwarsa"}
              {status === "invalid" && "⚠️ Lisensi tidak valid"}
              {status === "error" && "⚠️ Lisensi belum bisa diperiksa"}
            </p>
            <p className="break-all font-mono text-sm font-bold">{code}</p>
            {expiresAt !== null && (
              <p className="text-xs">
                {status === "active" ? "Berlaku sampai" : "Berakhir pada"} {when(expiresAt)}
                {status === "active" && ` (${remaining(expiresAt)})`}
              </p>
            )}
            {license.message && status !== "active" && status !== "checking" && (
              <p className="text-xs font-bold">{license.message}</p>
            )}
            {status === "active" && <p className="text-xs">Fitur terbuka: Buat Animasi (AI).</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              {status === "error" && (
                <button onClick={license.refresh} className={btn.small}>
                  Coba periksa lagi
                </button>
              )}
              <button onClick={remove} className={`${btn.small} hover:!bg-pink`}>
                🗑 Hapus lisensi
              </button>
            </div>
          </section>
        )}

        <section aria-label="Masukkan lisensi" className="space-y-2">
          <span className={sectionTitle}>{hasStored ? "Ganti lisensi" : "Masukkan lisensi"}</span>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase">Kode lisensi</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !license.busy) void submit();
              }}
              placeholder="VF-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              maxLength={60}
              className={`${field} font-mono`}
            />
          </label>
          <button onClick={() => void submit()} disabled={license.busy || input.trim() === ""} className={btn.primary}>
            {license.busy ? "Memeriksa…" : hasStored ? "🔑 Update lisensi" : "🔑 Aktifkan lisensi"}
          </button>
          {result && (
            <p
              role="status"
              className={`rounded-lg border-[3px] border-ink p-2 text-xs font-bold text-black ${result.ok ? "bg-lime" : "bg-pink"}`}
            >
              {result.text}
            </p>
          )}
        </section>

        <p className="text-xs opacity-70">
          Kode lisensi dipakai seperti kode masuk: tersimpan di browser ini dan berlaku sampai masa aktifnya habis, jadi kamu
          bisa menutup dan membuka aplikasi lagi tanpa memasukkannya ulang. Menyalin prompt dan menempel kode ke Terminal
          tetap gratis tanpa lisensi.
        </p>
      </div>
    </Modal>
  );
}
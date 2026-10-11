"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "license";

export type LicenseStatus = "none" | "checking" | "active" | "expired" | "invalid" | "error";

interface Verdict {
  valid: boolean;
  reason?: string;
  code?: string;
  expiresAt?: number;
  features?: string[];
  message?: string;
}

async function verify(code: string): Promise<Verdict> {
  const res = await fetch("/api/license", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = (await res.json().catch(() => null)) as Verdict | null;
  if (!data) throw new Error("Balasan server tidak terbaca.");
  return data;
}

const store = (code: string | null) => {
  try {
    if (code) localStorage.setItem(STORAGE_KEY, code);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

export function useLicense() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<LicenseStatus>("none");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = useCallback((stored: string, v: Verdict) => {
    setCode(v.code ?? stored);
    setExpiresAt(v.expiresAt ?? null);
    if (v.valid) {
      setStatus("active");
      setMessage(null);
    } else {
      setStatus(v.reason === "expired" ? "expired" : "invalid");
      setMessage(v.message ?? "Lisensi tidak valid.");
    }
  }, []);

  const recheck = useCallback(
    async (stored: string) => {
      setStatus("checking");
      try {
        apply(stored, await verify(stored));
      } catch {
        setCode(stored);
        setStatus("error");
        setMessage("Tidak bisa memeriksa lisensi. Pastikan server berjalan.");
      }
    },
    [apply]
  );

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (stored) void recheck(stored);
  }, [recheck]);

  const activate = useCallback(
    async (raw: string): Promise<{ ok: boolean; message: string }> => {
      const input = raw.trim();
      if (!input) return { ok: false, message: "Masukkan kode lisensi dulu." };
      setBusy(true);
      try {
        const v = await verify(input);
        if (!v.valid) return { ok: false, message: v.message ?? "Kode lisensi tidak valid." };
        store(v.code ?? input);
        apply(input, v);
        return { ok: true, message: "Lisensi berhasil diaktifkan." };
      } catch {
        return { ok: false, message: "Tidak bisa menghubungi server. Pastikan npm run dev berjalan." };
      } finally {
        setBusy(false);
      }
    },
    [apply]
  );

  const clear = useCallback(() => {
    store(null);
    setCode("");
    setExpiresAt(null);
    setMessage(null);
    setStatus("none");
  }, []);

  const refresh = useCallback(() => {
    if (code) void recheck(code);
  }, [code, recheck]);

  return {
    status,
    code,
    expiresAt,
    message,
    busy,
    active: status === "active" && (expiresAt ?? 0) > Date.now(),
    activate,
    clear,
    refresh,
  };
}

export type LicenseApi = ReturnType<typeof useLicense>;
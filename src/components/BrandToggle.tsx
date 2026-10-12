"use client";

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function BrandToggle({ value, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border-[3px] border-ink bg-paper p-2">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-label="Izinkan logo dan brand"
      />
      <span className="text-xs">
        <span className="block font-bold">🏷️ Izinkan logo, brand, dan karakter</span>
        <span className="opacity-70">
          {value
            ? "AI boleh menggambar logo, brand, atau karakter yang kamu sebut di deskripsi. Situs stok biasanya menolak konten seperti ini kalau bukan milikmu."
            : "Mati: AI tidak akan menambahkan teks, logo, brand, watermark, atau karakter berlisensi. Disarankan untuk video stok."}
        </span>
      </span>
    </label>
  );
}

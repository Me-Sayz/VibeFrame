"use client";

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function LoopToggle({ value, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border-[3px] border-ink bg-paper p-2">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-label="Loop mulus"
      />
      <span className="text-xs">
        <span className="block font-bold">🔁 Loop mulus</span>
        <span className="opacity-70">
          {value
            ? "Gerakan berputar tanpa sambungan, cocok untuk video stok yang diputar berulang."
            : "Alur linear: intro, animasi utama, lalu ending."}
        </span>
      </span>
    </label>
  );
}

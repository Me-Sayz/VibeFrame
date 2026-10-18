"use client";

import dynamic from "next/dynamic";

const VectorStudio = dynamic(() => import("./VectorStudio"), {
  ssr: false,
  loading: () => <p className="p-8 text-sm font-bold">Memuat…</p>,
});

export default function VectorLoader() {
  return <VectorStudio />;
}

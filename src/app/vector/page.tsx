import type { Metadata } from "next";
import VectorLoader from "@/components/VectorLoader";

export const metadata: Metadata = {
  title: "VibeFrame — Vector",
  description: "Buat gambar vector dari prompt dan ubah warna per bagian.",
};

export default function VectorPage() {
  return <VectorLoader />;
}

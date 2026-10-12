"use client";

import type { MotionResult } from "@/types";
import LoopCheck from "./LoopCheck";
import MetadataTool from "./MetadataTool";
import Modal from "./Modal";

interface Props {
  source: MotionResult | null;
  fps: number;
  licenseActive: boolean;
  licenseCode: string;
  onNeedLicense: (message: string) => void;
  onClose: () => void;
}

export default function MicrostockModal({ source, fps, licenseActive, licenseCode, onNeedLicense, onClose }: Props) {
  return (
    <Modal title="Alat microstock" onClose={onClose} widthClass="max-w-xl">
      <div className="space-y-6">
        <LoopCheck source={source} fps={fps} />
        <MetadataTool licenseActive={licenseActive} licenseCode={licenseCode} onNeedLicense={onNeedLicense} />
      </div>
    </Modal>
  );
}

export const MAX_LAYERS = 8;
export const MAX_FILE_MB = 10;
export const MAX_SIDE = 4096;
export const DEFAULT_TOLERANCE = 20;
export const MAX_TOLERANCE = 100;

export interface Cutout {
  on: boolean;
  tolerance: number;
}

export interface AssetLayer {
  id: string;
  name: string;
  note: string;
  width: number;
  height: number;
  bitmap: ImageBitmap;
  source: ImageBitmap;
  cutout: Cutout;
}
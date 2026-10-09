export const MAX_LAYERS = 8;
export const MAX_FILE_MB = 10;
export const MAX_SIDE = 4096;

export interface AssetLayer {
  id: string;
  name: string;
  note: string;
  width: number;
  height: number;
  bitmap: ImageBitmap;
}
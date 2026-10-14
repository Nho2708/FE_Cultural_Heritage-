import taiNguyen from './anh-co-san.json';
import viTriDaDo from './vi-tri.json';
import type { NgonNgu } from './brand';

/** Toạ độ y (px trang) của các khối cần cuộn tới trong ảnh chụp dài, đo khi chụp (scripts/liet-ke-tai-nguyen.mjs). */
export interface ViTri {
  ganBan: number;
  tomTat: number;
  dongThoiGian: number;
  goiY: number;
  nguon: number;
}

const MAC_DINH: ViTri = { ganBan: 900, tomTat: 700, dongThoiGian: 600, goiY: 500, nguon: 1400 };

export function viTri(ngonNgu: NgonNgu): ViTri {
  return { ...MAC_DINH, ...((viTriDaDo as Record<string, Partial<ViTri>>)[ngonNgu] ?? {}) };
}

const CO = new Set<string>(taiNguyen as string[]);
export const coNhac = (duongDan: string) => CO.has(duongDan);

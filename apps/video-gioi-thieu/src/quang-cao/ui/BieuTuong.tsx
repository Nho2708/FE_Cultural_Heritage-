// Biểu tượng nét mảnh vẽ lại theo bộ biểu tượng của app (viền tròn đầu, nét 2 px trên lưới 24 px).
const NET = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function BieuTuongQuaCau({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" stroke={mau} {...NET}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

export function BieuTuongTamDung({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" fill={mau}>
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

export function BieuTuongPhat({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" fill={mau}>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

export function BieuTuongTaiNghe({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" stroke={mau} {...NET}>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <path d="M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2zM20 15a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2z" />
    </svg>
  );
}

export function BieuTuongTrang({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" stroke={mau} {...NET}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9.5 11h6M9.5 14.5h6M9.5 18h4" />
    </svg>
  );
}

export function BieuTuongKhoi({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" stroke={mau} {...NET}>
      <path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z" />
      <path d="M4 7.4l8 4.6 8-4.6M12 12v9.2" />
    </svg>
  );
}

export function BieuTuongGhim({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" stroke={mau} {...NET}>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function BieuTuongVeLai({ canh, mau }: { canh: number; mau: string }) {
  return (
    <svg width={canh} height={canh} viewBox="0 0 24 24" stroke={mau} {...NET}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

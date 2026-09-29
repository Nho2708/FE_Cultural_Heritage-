import { createContext, useContext } from 'react';

export type ToastKind = 'success' | 'info' | 'warning' | 'danger';

export interface ToastApi {
  success: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast phải nằm trong <ToastProvider>.');
  return api;
}

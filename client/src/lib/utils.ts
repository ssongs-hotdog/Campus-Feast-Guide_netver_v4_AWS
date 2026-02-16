import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent;
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

import { Buffer } from 'buffer';

// Polyfill Buffer for cryptocurrency libraries in browser environment
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (globalThis as any).Buffer = Buffer;
}

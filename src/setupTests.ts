import '@testing-library/jest-dom/vitest';

// jsdom não implementa ResizeObserver (usado pelo ResponsiveContainer do Recharts).
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

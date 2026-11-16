import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// jsdom não implementa ResizeObserver (usado pelo ResponsiveContainer do Recharts).
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Telas carregadas sob demanda (lazy) podem demorar mais de 1 s na primeira importação.
configure({ asyncUtilTimeout: 4000 });

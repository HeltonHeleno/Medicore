/**
 * Fase 27 (BL-01.7) — Modo API: toma o lugar de `services/atividades.ts` quando o app é construído com
 * `VITE_API_URL` (ver `vite.config.ts`). Mesmas funções e assinaturas; os dados vêm da API.
 */

import type * as L from '../atividades';
import { cadastros as c } from './cliente';

export const listarAtividades: typeof L.listarAtividades = c.listarAtividades;

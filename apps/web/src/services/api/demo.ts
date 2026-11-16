/**
 * Fase 27 (27.2.2) — Modo API: os dados de exemplo ficam no servidor e são restaurados pela rotina
 * da demonstração (todo dia, só nesse ambiente). O botão da vitrine só explica isso.
 */
import { t } from '@medicore/dominio/i18n/pt-BR';

export class RestaurarNoServidor extends Error {
  constructor() {
    super(t.demo.restaurarNoServidor);
    this.name = 'RestaurarNoServidor';
  }
}

export function restaurarDadosExemplo(): void {
  throw new RestaurarNoServidor();
}

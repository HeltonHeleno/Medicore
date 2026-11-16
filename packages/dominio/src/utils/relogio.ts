/**
 * Relógio da aplicação (M7). Nenhuma regra de negócio usa `new Date()` diretamente:
 * todas chamam `agora()`. Nos testes, o horário é controlado com `vi.setSystemTime`.
 */
let deslocamentoMs = 0;

export function agora(): Date {
  return new Date(Date.now() + deslocamentoMs);
}

/**
 * Fase 27 (27.T.1) — Adianta ou atrasa o relógio do processo. Só a rota de teste da API usa, para
 * o servidor ficar no mesmo instante que o navegador dos testes de ponta a ponta (`page.clock`).
 * A rota só existe com `AMBIENTE=teste` e `ROTAS_TESTE=sim`.
 */
export function definirDeslocamentoDoRelogio(ms: number): void {
  deslocamentoMs = ms;
}

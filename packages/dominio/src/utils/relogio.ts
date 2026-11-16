/**
 * Relógio da aplicação (M7). Nenhuma regra de negócio usa `new Date()` diretamente:
 * todas chamam `agora()`. Nos testes, o horário é controlado com `vi.setSystemTime`.
 */
export function agora(): Date {
  return new Date();
}

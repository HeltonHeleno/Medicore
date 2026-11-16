/** Fase 26 — Cliente HTTP de leitos, emergência e farmácia: as requisições que cada função monta. */
import { describe, expect, it, vi } from 'vitest';
import type { RequisicaoApi } from '../cliente/cadastros';
import { criarClienteOperacoes } from '../cliente/operacoes';

function cliente(corpo: unknown = null) {
  const transporte = vi.fn(async (_r: RequisicaoApi) => ({ status: 200, corpo }));
  return { c: criarClienteOperacoes(transporte), transporte };
}

describe('cliente dos módulos operacionais', () => {
  it('gravações sobre um registro mandam a versão (If-Match)', async () => {
    const { c, transporte } = cliente({});
    await c.transferir('int-1', { leitoDestinoId: 'l2', motivo: 'Piora' } as never, 4);
    await c.darAlta('int-1', { tipo: 'melhorada', em: 'x' } as never, 5);
    await c.chamar('ate/1', 'med-1', 2);
    await c.devolver('dis-1', 0, { quantidade: 1, motivo: 'Sobrou' } as never, 3);
    await c.desbloquearLote('lot-1', 7);
    expect(transporte.mock.calls.map(([r]) => [r.metodo, r.caminho, r.versao, r.corpo])).toEqual([
      ['POST', '/internacoes/int-1/transferir', 4, { leitoDestinoId: 'l2', motivo: 'Piora' }],
      ['POST', '/internacoes/int-1/alta', 5, { tipo: 'melhorada', em: 'x' }],
      ['POST', '/atendimentos/ate%2F1/chamar', 2, { medicoId: 'med-1' }],
      ['POST', '/dispensacoes/dis-1/itens/0/devolucao', 3, { quantidade: 1, motivo: 'Sobrou' }],
      ['POST', '/lotes/lot-1/desbloquear', 7, undefined],
    ]);
  });

  it('criações não mandam versão; edições usam PUT', async () => {
    const { c, transporte } = cliente({});
    await c.internar({ pacienteId: 'p' } as never);
    await c.editarMedicamento('med-1', { nome: 'X' } as never, 2);
    expect(transporte.mock.calls.map(([r]) => [r.metodo, r.caminho, r.versao])).toEqual([
      ['POST', '/internacoes', undefined],
      ['PUT', '/medicamentos/med-1', 2],
    ]);
  });

  it('filtros e critérios vão na query, sem os vazios', async () => {
    const { c, transporte } = cliente([]);
    await c.leitosCompativeis({ pacienteId: 'p', precaucao: 'contato' }, 'l-9');
    await c.listarMovimentacoes({ tipo: 'entrada', de: '' });
    await c.livroControlados('med-1', '2026-11-01', '2026-11-30');
    expect(transporte.mock.calls.map(([r]) => [r.caminho, r.consulta])).toEqual([
      ['/leitos/compativeis', { pacienteId: 'p', precaucao: 'contato', ignorarLeitoId: 'l-9' }],
      ['/movimentacoes', { tipo: 'entrada' }],
      ['/medicamentos/med-1/livro', { de: '2026-11-01', ate: '2026-11-30' }],
    ]);
  });

  it('destino da dispensação: o mesmo formato do navegador ({ tipo, id } ou null)', async () => {
    expect(
      await cliente({
        tipo: 'internacao',
        id: 'int-1',
        referencia: 'UTI-01',
      }).c.destinoDaDispensacao('p'),
    ).toEqual({ tipo: 'internacao', id: 'int-1' });
    expect(await cliente(null).c.destinoDaDispensacao('p')).toBeNull();
  });

  it('toda função do cliente vira uma requisição para /api/v1 (nenhuma fica sem rota)', async () => {
    const { c, transporte } = cliente({ tipo: 'internacao', id: 'x' });
    const funcoes = Object.entries(c) as [string, (...a: unknown[]) => Promise<unknown>][];
    for (const [, fn] of funcoes) await fn('id-1', { motivo: 'x' }, 1, 'extra');
    expect(transporte).toHaveBeenCalledTimes(funcoes.length);
    for (const [r] of transporte.mock.calls) {
      expect(r.caminho).toMatch(/^\/[a-z]/);
      expect(['GET', 'POST', 'PUT']).toContain(r.metodo);
    }
  });
});

/** Fase 29 (BL-03) — Contrato e cliente HTTP da auditoria. */
import { consultaDaAuditoria, criarClienteAuditoria } from '../cliente/auditoria';
import type { RequisicaoApi } from '../cliente/cadastros';
import { filtrosAuditoria, registroAuditoria } from '../contrato/auditoria';
import { ErroPermissao } from '../erros';
import { pode } from '../permissoes';

describe('contrato da auditoria', () => {
  it('filtros: datas AAAA-MM-DD, ação conhecida, paginação padrão', () => {
    expect(filtrosAuditoria.parse({})).toMatchObject({ pagina: 1, porPagina: 10 });
    expect(filtrosAuditoria.safeParse({ de: '16/11/2026' }).success).toBe(false);
    expect(filtrosAuditoria.safeParse({ acao: 'apagar' }).success).toBe(false);
    expect(filtrosAuditoria.parse({ acao: 'leitura', de: '2026-11-01' }).acao).toBe('leitura');
    expect(
      registroAuditoria.safeParse({
        id: 1,
        em: 'x',
        origem: 'api',
        acao: 'leitura',
        entidade: 'pacientes',
      }).success,
    ).toBe(true);
  });

  it('o titular é só do Administrador; a auditoria, de Administrador e Gestão', () => {
    expect(pode(['administrador'], 'titular.atender')).toBe(true);
    expect(pode(['gestao'], 'titular.atender')).toBe(false);
    expect(pode(['gestao'], 'auditoria.ver')).toBe(true);
    expect(pode(['recepcao'], 'auditoria.ver')).toBe(false);
  });
});

describe('cliente da auditoria', () => {
  it('rotas e filtros sem os vazios; erro vira a classe do contrato', async () => {
    const pedidos: RequisicaoApi[] = [];
    const c = criarClienteAuditoria(async (r) => {
      pedidos.push(r);
      return { status: 200, corpo: {} };
    });
    await c.listar({ pacienteId: 'p1', usuarioId: '', pagina: 2 });
    await c.pessoas();
    await c.integridade();
    await c.titular('p/1');
    expect(pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual([
      'GET /auditoria',
      'GET /auditoria/pessoas',
      'GET /auditoria/integridade',
      'GET /pacientes/p%2F1/titular',
    ]);
    expect(pedidos[0]!.consulta).toEqual({ pacienteId: 'p1', pagina: 2 });
    expect(consultaDaAuditoria({ acao: undefined, de: '2026-11-01' })).toEqual({
      de: '2026-11-01',
    });
    const negado = criarClienteAuditoria(async () => ({
      status: 403,
      corpo: { codigo: 'permissao', acao: 'consultar a auditoria' },
    }));
    await expect(negado.listar({})).rejects.toBeInstanceOf(ErroPermissao);
  });
});

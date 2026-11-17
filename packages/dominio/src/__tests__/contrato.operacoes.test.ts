/**
 * Fase 26 (contrato) — Os esquemas das rotas dos módulos aceitam os dados de exemplo (os mesmos
 * que o banco recebe na semeadura) e convertem a query string como as telas mandam.
 */
import { describe, expect, it } from 'vitest';
import * as c from '../contrato/operacoes';
import { semearMedicos } from '../seeds/medicos';
import { gerarDadosOperacionais } from '../seeds/operacoes';
import { semearPacientes } from '../seeds/pacientes';

const dados = gerarDadosOperacionais({
  pacientes: semearPacientes(),
  medicos: semearMedicos(),
  agora: new Date('2026-11-10T13:30:00Z'),
});

describe('contrato dos módulos sobre os dados de exemplo', () => {
  const casos: [string, readonly unknown[], { safeParse: (x: unknown) => { success: boolean } }][] =
    [
      ['leitos', dados.leitos, c.leito],
      ['internações', dados.internacoes, c.internacao],
      ['pedidos de leito', dados.solicitacoes, c.solicitacao],
      ['atendimentos', dados.atendimentos, c.atendimento],
      ['medicamentos', dados.medicamentos, c.medicamento],
      ['lotes', dados.lotes, c.lote],
      ['movimentações', dados.movimentacoes, c.movimentacao],
      ['dispensações', dados.dispensacoes, c.dispensacao],
    ];
  it.each(casos)('%s', (_nome, lista, esquema) => {
    expect(lista.length).toBeGreaterThan(0);
    for (const item of lista) {
      const r = esquema.safeParse(item);
      expect(r.success, JSON.stringify((r as { error?: unknown }).error)).toBe(true);
    }
  });

  it('respostas derivadas: listas, nulos e indicadores', () => {
    expect(
      c.listaEstoque.safeParse({ itens: [], total: 0, pagina: 1, porPagina: 10 }).success,
    ).toBe(true);
    expect(c.destinoDetalhado.safeParse(null).success).toBe(true);
    expect(c.correspondenciaAlergia.safeParse(null).success).toBe(true);
    expect(
      c.indicadoresEmergencia.safeParse({
        abertos: 1,
        altaPrioridade: 0,
        porCor: Object.fromEntries(
          ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'].map((k) => [
            k,
            { aguardando: 0, acimaDoPrazo: 0 },
          ]),
        ),
        acimaDoPrazo: 0,
        esperaMediaPorCor: { verde: 12 },
        atendimentosHoje: 3,
      }).success,
    ).toBe(true);
  });
});

describe('query string das telas', () => {
  it('booleanos e números chegam como texto e viram valores', () => {
    expect(c.filtrosLeitos.parse({ soIsolamento: 'true' })).toEqual({ soIsolamento: true });
    expect(c.filtrosEstoque.parse({ soControlados: 'false', porPagina: '50' })).toMatchObject({
      soControlados: false,
      porPagina: 50,
    });
    expect(c.consultaFefo.parse({ quantidade: '3' })).toEqual({ quantidade: 3 });
    expect(c.filtrosHistoricoEmergencia.safeParse({ porPagina: '500' }).success).toBe(false);
    expect(c.consultaLivro.safeParse({ de: '2026-11-01', ate: '01/11/2026' }).success).toBe(false);
  });
});

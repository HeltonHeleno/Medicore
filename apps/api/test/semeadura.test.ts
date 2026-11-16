/** 24.2.7 — Semeadura: mesmos registros e mesmos números dos dados de exemplo do navegador. */
import { SETORES_INTERNACAO } from '@medicore/dominio/config/setores';
import type {
  Atendimento,
  Consulta,
  Dispensacao,
  Internacao,
  Leito,
  Lote,
  Medicamento,
  Movimentacao,
  Paciente,
  SolicitacaoLeito,
} from '@medicore/dominio/types';
import { verificarConsistencia } from '@medicore/dominio/utils/consistencia';
import { hojeNoFuso } from '@medicore/dominio/utils/datas';
import { disponivelDe } from '@medicore/dominio/utils/fefo';
import type { PgTable } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { deLinha } from '../src/banco/conversao';
import * as e from '../src/banco/esquema';
import { dadosDeExemplo, semear } from '../src/banco/semear';
import { criarBancoDeTeste, type BancoDeTeste } from './apoio/banco';

const MOMENTO = new Date('2026-11-16T13:00:00.000Z'); // segunda, 10:00 em São Paulo
let b: BancoDeTeste;

async function ler<D>(tabela: PgTable): Promise<D[]> {
  const linhas = (await b.dono.select().from(tabela)) as Record<string, unknown>[];
  return linhas.map((l) => deLinha<D>(tabela, l));
}

beforeAll(async () => {
  // Só o relógio (o `pg` precisa dos timers de verdade).
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MOMENTO);
  b = await criarBancoDeTeste();
  await semear(b.dono, { momento: MOMENTO });
});
afterAll(async () => {
  vi.useRealTimers();
  await b.encerrar();
});

describe('semeadura (A16 no servidor)', () => {
  it('grava todos os registros dos dados de exemplo', async () => {
    const esperado = dadosDeExemplo(MOMENTO);
    for (const [nome, tabela] of Object.entries(e.TABELAS)) {
      const linhas = await b.dono.select().from(tabela as PgTable);
      expect(linhas.length, nome).toBe(esperado[nome as keyof typeof esperado].length);
    }
  });

  it('o que sai do banco é igual ao que entrou (ida e volta)', async () => {
    const esperado = dadosDeExemplo(MOMENTO);
    const ordenar = <T extends { id: string }>(l: T[]) =>
      [...l].sort((x, y) => x.id.localeCompare(y.id));
    expect(ordenar(await ler<Paciente>(e.pacientes))).toEqual(ordenar(esperado.pacientes));
    expect(ordenar(await ler<Consulta>(e.consultas))).toEqual(ordenar(esperado.consultas));
    expect(ordenar(await ler<Leito>(e.leitos))).toEqual(ordenar(esperado.leitos));
    expect(ordenar(await ler<Atendimento>(e.atendimentos))).toEqual(ordenar(esperado.atendimentos));
    expect(ordenar(await ler<Internacao>(e.internacoes))).toEqual(ordenar(esperado.internacoes));
    expect(ordenar(await ler<Lote>(e.lotes))).toEqual(ordenar(esperado.lotes));
    expect(ordenar(await ler<Movimentacao>(e.movimentacoes))).toEqual(
      ordenar(esperado.movimentacoes),
    );
    expect(ordenar(await ler<Dispensacao>(e.dispensacoes))).toEqual(ordenar(esperado.dispensacoes));
  });

  it('72% de ocupação e 3 medicamentos com estoque baixo, como no Painel', async () => {
    const leitos = (await ler<Leito>(e.leitos)).filter((l) =>
      (SETORES_INTERNACAO as readonly string[]).includes(l.setorId),
    );
    const operacionais = leitos.filter((l) => l.status !== 'bloqueado').length;
    const ocupados = leitos.filter((l) => l.status === 'ocupado').length;
    expect(Math.round((ocupados / operacionais) * 100)).toBe(72);

    const hoje = hojeNoFuso();
    const lotes = await ler<Lote>(e.lotes);
    const baixo = (await ler<Medicamento>(e.medicamentos))
      .filter((m) => m.ativo)
      .filter((m) => {
        const disponivel = disponivelDe(
          lotes.filter((l) => l.medicamentoId === m.id),
          hoje,
        );
        return disponivel > 0 && disponivel <= m.estoqueMinimo;
      });
    expect(baixo).toHaveLength(3);
  });

  it('as invariantes (A17) valem sobre os dados lidos do banco', async () => {
    const violacoes = verificarConsistencia(
      {
        leitos: await ler<Leito>(e.leitos),
        internacoes: await ler<Internacao>(e.internacoes),
        solicitacoes: await ler<SolicitacaoLeito>(e.solicitacoes),
        atendimentos: await ler<Atendimento>(e.atendimentos),
        lotes: await ler<Lote>(e.lotes),
        movimentacoes: await ler<Movimentacao>(e.movimentacoes),
        dispensacoes: await ler<Dispensacao>(e.dispensacoes),
        pacientes: await ler<Paciente>(e.pacientes),
        consultas: await ler<Consulta>(e.consultas),
      },
      MOMENTO.getTime(),
    );
    expect(violacoes).toEqual([]);
  });

  it('não semeia por cima de dados existentes, a não ser com "substituir"', async () => {
    await expect(semear(b.dono, { momento: MOMENTO })).rejects.toThrow(/já tem dados/);
    const { contagens } = await semear(b.dono, { momento: MOMENTO, substituir: true });
    expect(contagens.pacientes).toBe(120);
    expect(await b.dono.$count(e.pacientes)).toBe(120);
  });
});

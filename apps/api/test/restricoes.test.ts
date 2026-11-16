/**
 * 24.2.4 e 24.2.5 — Cada restrição do banco (D25) recusa a gravação que a viola, e o tradutor
 * de erros transforma a recusa no conflito do domínio. O usuário da aplicação não altera nem
 * apaga movimentações (R-F9).
 */
import { ErroConflito } from '@medicore/dominio/erros';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as e from '../src/banco/esquema';
import { dadosDeExemplo, linhaAtendimento, linhaConsulta, semear } from '../src/banco/semear';
import { conflitoDoBanco } from '../src/http/erros';
import { criarBancoDeTeste, type BancoDeTeste } from './apoio/banco';

const MOMENTO = new Date('2026-11-16T13:00:00.000Z');
let b: BancoDeTeste;
const d = () => dadosDeExemplo(MOMENTO);

/** Executa e devolve o erro do banco (falha o teste se a gravação passar). */
async function recusa(acao: () => Promise<unknown>) {
  try {
    await acao();
  } catch (erro) {
    const causa = (erro as { cause?: unknown }).cause ?? erro;
    return causa as { code: string; constraint?: string };
  }
  throw new Error('A gravação deveria ter sido recusada pelo banco.');
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MOMENTO);
  b = await criarBancoDeTeste();
});
beforeEach(async () => {
  await b.limpar();
  await semear(b.dono, { momento: MOMENTO });
});
afterAll(async () => {
  vi.useRealTimers();
  await b.encerrar();
});

describe('restrições do banco (D25)', () => {
  it('CPF único (R-P1) → cpf_duplicado', async () => {
    const [p] = d().pacientes;
    const erro = await recusa(() => b.app.insert(e.pacientes).values({ ...p!, id: 'pac-outro' }));
    expect(erro).toMatchObject({ code: '23505', constraint: 'pacientes_cpf_unico' });
    expect(conflitoDoBanco(erro)).toMatchObject({ codigo: 'cpf_duplicado', campo: 'cpf' });
  });

  it('CRM (número + UF) e e-mail únicos (R-M1) → crm_duplicado / email_duplicado', async () => {
    const [m] = d().medicos;
    const crm = await recusa(() =>
      b.app.insert(e.medicos).values({ ...m!, id: 'med-outro', email: 'outro@exemplo.com' }),
    );
    expect(crm).toMatchObject({ code: '23505', constraint: 'medicos_crm_unico' });
    expect(conflitoDoBanco(crm)?.codigo).toBe('crm_duplicado');

    const email = await recusa(() =>
      b.app.insert(e.medicos).values({
        ...m!,
        id: 'med-outro',
        crm: { numero: '999999', uf: 'SP' },
        email: m!.email.toUpperCase(),
      }),
    );
    expect(email).toMatchObject({ code: '23505', constraint: 'medicos_email_unico' });
    expect(conflitoDoBanco(email)?.codigo).toBe('email_duplicado');
  });

  it('consultas agendadas do mesmo médico não se sobrepõem (A1/A2) → medico_ocupado', async () => {
    const agendada = d().consultas.find((c) => c.status === 'agendada')!;
    const meiaHoraDepois = new Date(
      new Date(agendada.inicio).getTime() + 10 * 60_000,
    ).toISOString();
    const nova = linhaConsulta({ ...agendada, id: 'con-nova', inicio: meiaHoraDepois });
    const erro = await recusa(() => b.app.insert(e.consultas).values(nova));
    expect(erro).toMatchObject({
      code: '23P01',
      constraint: 'consultas_sem_sobreposicao_por_medico',
    });
    expect(conflitoDoBanco(erro)).toMatchObject({ codigo: 'medico_ocupado', campo: 'hora' });

    // Cancelada não ocupa o horário; encostada no fim também não ([inicio, fim)).
    await b.app.insert(e.consultas).values({ ...nova, id: 'con-cancelada', status: 'cancelada' });
    const fim = new Date(new Date(agendada.inicio).getTime() + agendada.duracaoMin * 60_000);
    await b.app
      .insert(e.consultas)
      .values(linhaConsulta({ ...agendada, id: 'con-seguinte', inicio: fim.toISOString() }));
  });

  it('uma internação ativa por leito e por paciente (R-L1)', async () => {
    const ativa = d().internacoes.find((i) => i.status === 'ativa')!;
    const outroPaciente = d().pacientes.find(
      (p) => !d().internacoes.some((i) => i.status === 'ativa' && i.pacienteId === p.id),
    )!;
    const leito = await recusa(() =>
      b.app
        .insert(e.internacoes)
        .values({ ...ativa, id: 'int-nova', pacienteId: outroPaciente.id }),
    );
    expect(leito).toMatchObject({ code: '23505', constraint: 'internacoes_uma_ativa_por_leito' });
    expect(conflitoDoBanco(leito)?.codigo).toBe('leito_indisponivel');

    const livre = d().leitos.find((l) => l.status === 'livre')!;
    const paciente = await recusa(() =>
      b.app.insert(e.internacoes).values({ ...ativa, id: 'int-nova', leitoId: livre.id }),
    );
    expect(paciente).toMatchObject({
      code: '23505',
      constraint: 'internacoes_uma_ativa_por_paciente',
    });
    expect(conflitoDoBanco(paciente)?.codigo).toBe('paciente_internado');

    // Encerrada não conta.
    await b.app
      .insert(e.internacoes)
      .values({ ...ativa, id: 'int-antiga', status: 'encerrada', pacienteId: outroPaciente.id });
  });

  it('um atendimento aberto por paciente (R-E10) e número único no dia (A8)', async () => {
    const aberto = d().atendimentos.find((a) => a.status !== 'encerrado' && a.pacienteId)!;
    const outro = await recusa(() =>
      b.app
        .insert(e.atendimentos)
        .values(linhaAtendimento({ ...aberto, id: 'ate-novo', numero: 'E-9999' })),
    );
    expect(outro).toMatchObject({
      code: '23505',
      constraint: 'atendimentos_um_aberto_por_paciente',
    });
    expect(conflitoDoBanco(outro)?.codigo).toBe('paciente_em_atendimento');

    const mesmoNumero = await recusa(() =>
      b.app.insert(e.atendimentos).values(
        linhaAtendimento({
          ...aberto,
          id: 'ate-novo',
          pacienteId: undefined,
          status: 'encerrado',
        }),
      ),
    );
    expect(mesmoNumero).toMatchObject({ code: '23505', constraint: 'atendimentos_numero_no_dia' });
    expect(conflitoDoBanco(mesmoNumero)?.codigo).toBe('conflito_dados');
  });

  it('o estoque do lote nunca fica negativo (INV-8) → estoque_insuficiente', async () => {
    const lote = d().lotes[0]!;
    const erro = await recusa(() =>
      b.app.update(e.lotes).set({ quantidadeAtual: -1 }).where(eq(e.lotes.id, lote.id)),
    );
    expect(erro).toMatchObject({
      code: '23514',
      constraint: 'lotes_quantidade_atual_nao_negativa',
    });
    expect(conflitoDoBanco(erro)).toMatchObject({
      codigo: 'estoque_insuficiente',
      campo: 'quantidade',
    });
  });

  it('chave estrangeira: consulta de paciente que não existe → conflito_dados', async () => {
    const c = d().consultas[0]!;
    const erro = await recusa(() =>
      b.app
        .insert(e.consultas)
        .values(
          linhaConsulta({ ...c, id: 'con-x', pacienteId: 'pac-nao-existe', status: 'cancelada' }),
        ),
    );
    expect(erro).toMatchObject({ code: '23503' });
    expect(conflitoDoBanco(erro)).toBeInstanceOf(ErroConflito);
    expect(conflitoDoBanco(erro)?.codigo).toBe('conflito_dados');
  });
});

describe('movimentações imutáveis para a aplicação (R-F9)', () => {
  it('a aplicação insere, mas não altera nem apaga', async () => {
    const m = d().movimentacoes[0]!;
    const alterar = await recusa(() =>
      b.app.update(e.movimentacoes).set({ motivo: 'x' }).where(eq(e.movimentacoes.id, m.id)),
    );
    expect(alterar.code).toBe('42501'); // permissão negada
    const apagar = await recusa(() =>
      b.app.delete(e.movimentacoes).where(eq(e.movimentacoes.id, m.id)),
    );
    expect(apagar.code).toBe('42501');
    const truncar = await recusa(() => b.app.execute(sql`truncate movimentacoes cascade`));
    expect(truncar.code).toBe('42501');

    await b.app.insert(e.movimentacoes).values({ ...m, id: 'mov-nova' });
    expect(await b.app.$count(e.movimentacoes, eq(e.movimentacoes.id, 'mov-nova'))).toBe(1);
  });

  it('as outras tabelas continuam editáveis pela aplicação', async () => {
    const p = d().pacientes[0]!;
    await b.app.update(e.pacientes).set({ observacoes: 'ok' }).where(eq(e.pacientes.id, p.id));
  });
});

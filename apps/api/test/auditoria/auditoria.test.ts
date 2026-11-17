/**
 * Fase 29 (29.T.1, 29.T.2) — Auditoria (BL-03):
 * - gravações: o gatilho de cada tabela grava quem, de onde, quando e o antes → depois, na mesma
 *   transação, com CPF mascarado e sem senha; o usuário da aplicação não altera nem desliga a trilha;
 * - leituras sensíveis: cadastro (com ou sem CPF completo), atendimento, busca por CPF; 304 também;
 * - consulta, CSV (a exportação também é registrada), pedido do titular;
 * - cadeia de hash por dia: alterar ou apagar um registro direto no banco é detectado;
 * - consulta por paciente em menos de 1 s com 1 milhão de registros.
 */
import { agora } from '@medicore/dominio/utils/relogio';
import { sql } from 'drizzle-orm';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  conferirIntegridade,
  listarAuditoria,
  registrarAcesso,
  selarDias,
} from '../../src/auditoria/servico';
import { auditoriaSelos, TABELAS } from '../../src/banco/esquema';
import { semear } from '../../src/banco/semear';
import { executarAuditoria } from '../../src/rotinas/agendador';
import { criarServidor } from '../../src/servidor';
import { criarBancoDeTeste, type BancoDeTeste } from '../apoio/banco';
import { entrarComo, type Credenciais } from '../apoio/sessao';

const INICIO = '2026-11-16T12:00:00.000Z';
const AGENTE = 'Mozilla/5.0 (teste da auditoria)';

let b: BancoDeTeste;
let app: FastifyInstance;

beforeAll(async () => {
  b = await criarBancoDeTeste();
  app = await criarServidor({
    config: { AMBIENTE: 'teste', LOG_NIVEL: 'silent', DOCS: false },
    banco: b.app,
    registrarErro: () => 'evento',
  });
  await app.ready();
});
afterAll(async () => {
  await app.close();
  await b.encerrar();
});
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(INICIO));
  await b.limpar();
  await semear(b.dono);
});
afterEach(() => vi.useRealTimers());

const inject = (o: InjectOptions) => app.inject(o);
const entrar = (conta: Parameters<typeof entrarComo>[1]) => entrarComo(inject as never, conta);

function pedir(
  c: Credenciais,
  metodo: 'GET' | 'POST' | 'PUT',
  url: string,
  extra: { payload?: unknown; headers?: Record<string, string> } = {},
) {
  return app.inject({
    method: metodo,
    url: `/api/v1${url}`,
    payload: extra.payload as InjectOptions['payload'],
    headers: {
      cookie: c.cookie,
      'x-csrf-token': c.csrf,
      'user-agent': AGENTE,
      ...extra.headers,
    },
  });
}

type Linha = Record<string, unknown> & { campos: Record<string, Record<string, unknown>> | null };
async function trilha(onde = sql`true`): Promise<Linha[]> {
  return (await b.dono.execute<Linha>(sql`select * from auditoria where ${onde} order by id`)).rows;
}

const pacienteNovo = {
  nome: 'Auditada da Silva',
  cpf: '52998224725',
  dataNascimento: '1990-01-01',
  sexo: 'feminino',
  telefone: '11987654321',
  convenio: { tipo: 'particular' },
  consentimentoLgpd: true,
  responsavel: {
    nome: 'Mãe da Auditada',
    cpf: '11144477735',
    parentesco: 'mãe',
    telefone: '11912345678',
  },
};

describe('gravações (BL-03.1)', () => {
  it('todas as tabelas que a API grava têm o gatilho (menos as derivadas)', async () => {
    const r = await b.dono.execute<{ tabela: string }>(sql`
      select c.relname as tabela from pg_trigger t join pg_class c on c.oid = t.tgrelid
       where t.tgname like '%_auditoria' order by 1`);
    const comGatilho = r.rows.map((x) => x.tabela);
    const derivadas = ['atividades', 'resumos'];
    for (const tabela of Object.values(TABELAS)) {
      const nome = (tabela as unknown as { [k: symbol]: string })[Symbol.for('drizzle:Name')];
      if (!derivadas.includes(nome)) expect(comGatilho, nome).toContain(nome);
    }
    expect(comGatilho).toEqual(expect.arrayContaining(['usuarios', 'perfis_usuario']));
  });

  it('paciente: inclusão e alteração com quem, IP, navegador, antes → depois e CPF mascarado', async () => {
    const c = await entrar('recepcao');
    const criado = await pedir(c, 'POST', '/pacientes', { payload: pacienteNovo });
    expect(criado.statusCode).toBe(201);
    const id = criado.json().id as string;
    const [inclusao] = await trilha(
      sql`entidade = 'pacientes' and acao = 'inclusao' and registro_id = ${id}`,
    );
    expect(inclusao).toMatchObject({
      usuario_id: 'usu-demo-recepcao',
      usuario_nome: 'Recepção (demonstração)',
      ip: '127.0.0.1',
      agente: AGENTE,
      origem: 'api',
      paciente_id: id,
      dia: '2026-11-16',
    });
    expect(new Date(inclusao!.em as string).toISOString()).toBe(INICIO);
    expect(inclusao!.campos!.cpf).toEqual({ antes: null, depois: '***.982.247-**' });
    expect(JSON.stringify(inclusao!.campos)).not.toContain('52998224725');
    expect(JSON.stringify(inclusao!.campos)).not.toContain('11144477735');
    expect(inclusao!.campos!.responsavel!.depois).toMatchObject({ cpf: '***.444.777-**' });

    const atual = criado.json();
    const editado = await pedir(c, 'PUT', `/pacientes/${id}`, {
      payload: { ...pacienteNovo, telefone: '11999998888' },
      headers: { 'if-match': `"v${atual.versao}"` },
    });
    expect(editado.statusCode).toBe(200);
    const [alteracao] = await trilha(
      sql`entidade = 'pacientes' and acao = 'alteracao' and registro_id = ${id}`,
    );
    // Só o que mudou (a versão e a data de atualização ficam de fora).
    expect(alteracao!.campos).toEqual({
      telefone: { antes: '11987654321', depois: '11999998888' },
    });
  });

  it('operações (unidade de trabalho): bloquear leito grava o leito e a atividade fica de fora', async () => {
    const c = await entrar('nir');
    const [leito] = (
      await b.dono.execute<{ id: string; versao: number }>(
        sql`select id, versao from leitos where status = 'livre' limit 1`,
      )
    ).rows;
    const r = await pedir(c, 'POST', `/leitos/${leito!.id}/bloquear`, {
      payload: { motivo: 'Manutenção' },
      headers: { 'if-match': `"v${leito!.versao}"` },
    });
    expect(r.statusCode).toBe(200);
    const linhas = await trilha(sql`registro_id = ${leito!.id}`);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      entidade: 'leitos',
      acao: 'alteracao',
      usuario_id: 'usu-demo-nir',
    });
    expect(linhas[0]!.campos!.status).toEqual({ antes: 'livre', depois: 'bloqueado' });
    expect(await trilha(sql`entidade = 'atividades'`)).toEqual([]);
  });

  it('listas que só crescem gravam só o que entrou', async () => {
    const [i] = (
      await b.dono.execute<{ id: string; n: number }>(
        sql`select id, jsonb_array_length(eventos) as n from internacoes where status = 'ativa' limit 1`,
      )
    ).rows;
    await b.app.transaction(async (tx) => {
      await tx.execute(sql`update internacoes set eventos = eventos || '[{"tipo":"teste"}]'::jsonb
                           where id = ${i!.id}`);
    });
    const [linha] = await trilha(sql`registro_id = ${i!.id}`);
    expect(linha!.campos).toEqual({ eventos: { adicionados: [{ tipo: 'teste' }] } });
    // Sem contexto de requisição: a rotina do servidor.
    expect(linha).toMatchObject({ origem: 'rotina', usuario_id: null });
  });

  it('usuários: senha e segredo do MFA nunca entram; o último acesso sozinho não gera registro', async () => {
    await entrar('administrador');
    const linhas = await trilha(sql`entidade in ('usuarios', 'perfis_usuario')`);
    expect(linhas.map((l) => `${l.entidade}:${l.acao}`)).toEqual([
      'usuarios:inclusao',
      'perfis_usuario:inclusao',
    ]);
    await b.app.transaction((tx) =>
      tx.execute(sql`update usuarios set senha_hash = 'x', mfa_segredo = 'y', ultimo_acesso_em = now()
                     where id = 'usu-demo-administrador'`),
    );
    expect(await trilha(sql`entidade = 'usuarios'`)).toHaveLength(1);
    expect(JSON.stringify(await trilha())).not.toMatch(/senha_hash|mfa_segredo/);
  });

  it('o usuário da aplicação não altera, não apaga e não desliga a trilha (BL-03.5)', async () => {
    await registrarAcesso(b.app, { acao: 'leitura', entidade: 'pacientes', detalhe: 'cadastro' });
    await expect(b.app.execute(sql`update auditoria set detalhe = 'x'`)).rejects.toThrow();
    await expect(b.app.execute(sql`delete from auditoria`)).rejects.toThrow();
    await expect(b.app.execute(sql`truncate auditoria`)).rejects.toThrow();
    await expect(b.app.execute(sql`delete from auditoria_selos`)).rejects.toThrow();
    await expect(b.app.execute(sql`alter table pacientes disable trigger all`)).rejects.toThrow();
    // Pedir para não auditar não adianta para o usuário da aplicação.
    await b.app.transaction(async (tx) => {
      await tx.execute(sql`set local medicore.auditar = 'nao'`);
      await tx.execute(
        sql`update pacientes set telefone = '11900000000' where id = 'pac-ana-silva'`,
      );
    });
    expect(await trilha(sql`registro_id = 'pac-ana-silva' and acao = 'alteracao'`)).toHaveLength(1);
  });
});

describe('leituras sensíveis (BL-03.2)', () => {
  it('cadastro: com CPF completo para quem pode; oculto para a Enfermagem; 304 também conta', async () => {
    const recepcao = await entrar('recepcao');
    const r = await pedir(recepcao, 'GET', '/pacientes/pac-ana-silva');
    expect(r.statusCode).toBe(200);
    const enf = await entrar('enfermagem');
    await pedir(enf, 'GET', '/pacientes/pac-ana-silva');
    await pedir(enf, 'GET', '/pacientes/pac-ana-silva', {
      headers: { 'if-none-match': r.headers.etag as string },
    });
    const leituras = await trilha(sql`acao = 'leitura'`);
    expect(leituras.map((l) => [l.usuario_id, l.detalhe, l.paciente_id])).toEqual([
      ['usu-demo-recepcao', 'cadastro,cpf_completo,alergias', 'pac-ana-silva'],
      ['usu-demo-enfermagem', 'cadastro,alergias', 'pac-ana-silva'],
      ['usu-demo-enfermagem', 'cadastro,alergias', 'pac-ana-silva'],
    ]);
    expect(leituras[0]).toMatchObject({
      campos: null,
      entidade: 'pacientes',
      registro_id: 'pac-ana-silva',
    });
  });

  it('atendimento e internação: o paciente vem do registro; 404 e listas não entram', async () => {
    const c = await entrar('medico');
    const [a] = (
      await b.dono.execute<{ id: string; paciente_id: string }>(
        sql`select id, paciente_id from atendimentos where paciente_id is not null limit 1`,
      )
    ).rows;
    const [i] = (
      await b.dono.execute<{ id: string; paciente_id: string }>(
        sql`select id, paciente_id from internacoes limit 1`,
      )
    ).rows;
    await pedir(c, 'GET', `/atendimentos/${a!.id}`);
    await pedir(c, 'GET', `/internacoes/${i!.id}`);
    await pedir(c, 'GET', '/atendimentos/nao-existe');
    await pedir(c, 'GET', '/pacientes');
    await pedir(c, 'GET', `/pacientes/${a!.paciente_id}/historico-hospitalar`);
    const leituras = await trilha(sql`acao = 'leitura'`);
    expect(leituras.map((l) => [l.entidade, l.detalhe, l.paciente_id])).toEqual([
      ['atendimentos', 'atendimento', a!.paciente_id],
      ['internacoes', 'internacao', i!.paciente_id],
      ['pacientes', 'historico_hospitalar', a!.paciente_id],
    ]);
  });

  it('busca por CPF: entra quando acha alguém', async () => {
    const c = await entrar('recepcao');
    const achou = await pedir(c, 'GET', '/pacientes/cpf/52998224725');
    const cpfAna = (
      await b.dono.execute<{ cpf: string }>(
        sql`select cpf from pacientes where id = 'pac-ana-silva'`,
      )
    ).rows[0]!.cpf;
    await pedir(c, 'GET', `/pacientes/cpf/${cpfAna}`);
    // Ninguém com esse CPF: a resposta vem vazia e nada entra na trilha.
    expect(achou.statusCode).toBe(200);
    const leituras = await trilha(sql`detalhe = 'busca_cpf'`);
    expect(leituras.map((l) => l.paciente_id)).toEqual(['pac-ana-silva']);
  });

  it('se a gravação da leitura falhar, o dado não sai', async () => {
    const c = await entrar('recepcao');
    await b.dono.execute(sql`revoke insert on auditoria from medicore_app`);
    try {
      const r = await pedir(c, 'GET', '/pacientes/pac-ana-silva');
      expect(r.statusCode).toBe(500);
      expect(r.body).not.toContain('Ana');
    } finally {
      await b.dono.execute(sql`grant insert on auditoria to medicore_app`);
    }
  });
});

describe('consultar, exportar e o titular (BL-03.3, BL-03.4)', () => {
  it('filtros por pessoa, paciente, ação e período, mais recente primeiro', async () => {
    const rec = await entrar('recepcao');
    await pedir(rec, 'GET', '/pacientes/pac-ana-silva');
    vi.setSystemTime(new Date('2026-11-17T12:00:00.000Z'));
    // Um dia depois, outra sessão (a de ontem terminou).
    await pedir(await entrar('recepcao'), 'GET', '/pacientes/pac-joao-pereira');
    const gestao = await entrar('gestao');
    const todas = (await pedir(gestao, 'GET', '/auditoria?acao=leitura')).json();
    expect(todas.itens.map((r: { pacienteId: string }) => r.pacienteId)).toEqual([
      'pac-joao-pereira',
      'pac-ana-silva',
    ]);
    expect(todas.itens[0]).toMatchObject({
      usuarioNome: 'Recepção (demonstração)',
      acao: 'leitura',
      agente: AGENTE,
    });
    const doDia = (
      await pedir(gestao, 'GET', '/auditoria?acao=leitura&de=2026-11-16&ate=2026-11-16')
    ).json();
    expect(doDia.total).toBe(1);
    const daAna = (await pedir(gestao, 'GET', '/auditoria?pacienteId=pac-ana-silva')).json();
    expect(daAna.itens.every((r: { pacienteId: string }) => r.pacienteId === 'pac-ana-silva')).toBe(
      true,
    );
    const daPessoa = (
      await pedir(gestao, 'GET', '/auditoria?usuarioId=usu-demo-recepcao&porPagina=1')
    ).json();
    expect(daPessoa).toMatchObject({ total: 2, porPagina: 1 });
    expect((await pedir(gestao, 'GET', '/auditoria?de=16-11-2026')).statusCode).toBe(422);
    const pessoas = (await pedir(gestao, 'GET', '/auditoria/pessoas')).json();
    expect(pessoas.map((p: { id: string }) => p.id)).toEqual(
      expect.arrayContaining(['usu-demo-recepcao']),
    );
  });

  it('as gravações aparecem com os nomes de campo do domínio', async () => {
    const rec = await entrar('recepcao');
    await pedir(rec, 'POST', '/pacientes', { payload: pacienteNovo });
    const admin = await entrar('administrador');
    const r = (await pedir(admin, 'GET', '/auditoria?entidade=pacientes&acao=inclusao')).json();
    expect(r.itens[0].campos).toHaveProperty('dataNascimento');
    expect(r.itens[0].campos).toHaveProperty('consentimentoLgpd');
  });

  it('CSV para o Excel (BOM, ";"), e a exportação também entra na trilha', async () => {
    const rec = await entrar('recepcao');
    await pedir(rec, 'GET', '/pacientes/pac-ana-silva');
    const gestao = await entrar('gestao');
    const r = await pedir(gestao, 'GET', '/auditoria/exportar?pacienteId=pac-ana-silva');
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/csv/);
    expect(r.headers['content-disposition']).toMatch(/auditoria\.csv/);
    expect(r.body.startsWith('﻿Quando;Pessoa;Ação')).toBe(true);
    expect(r.body).toContain('16/11/2026');
    expect(r.body).toContain('Recepção (demonstração);Leitura;pacientes;pac-ana-silva');
    const [exp] = await trilha(sql`acao = 'exportacao'`);
    expect(exp).toMatchObject({
      usuario_id: 'usu-demo-gestao',
      entidade: 'auditoria',
      paciente_id: 'pac-ana-silva',
      detalhe: 'exportacao_auditoria (pacienteId=pac-ana-silva)',
    });
  });

  it('pedido do titular: dados, consultas, internações e acessos; a geração é registrada', async () => {
    const rec = await entrar('recepcao');
    await pedir(rec, 'GET', '/pacientes/pac-joao-pereira');
    const admin = await entrar('administrador');
    const r = await pedir(admin, 'GET', '/pacientes/pac-joao-pereira/titular');
    expect(r.statusCode).toBe(200);
    const d = r.json();
    expect(d.paciente.id).toBe('pac-joao-pereira');
    expect(d.paciente.cpf).toMatch(/^\d{11}$/);
    expect(d.consultas.length).toBeGreaterThan(0);
    expect(d.acessos.map((a: { detalhe?: string }) => a.detalhe)).toEqual(
      expect.arrayContaining(['pedido_titular', 'cadastro,cpf_completo,alergias']),
    );
    expect((await pedir(admin, 'GET', '/pacientes/nao-existe/titular')).statusCode).toBe(404);
    // Só o Administrador.
    const gestao = await entrar('gestao');
    expect((await pedir(gestao, 'GET', '/pacientes/pac-joao-pereira/titular')).statusCode).toBe(
      403,
    );
  });
});

describe('cadeia de hash por dia (BL-03.5)', () => {
  async function doisDiasSelados() {
    await registrarAcesso(b.app, {
      acao: 'leitura',
      entidade: 'pacientes',
      pacienteId: 'p1',
      detalhe: 'cadastro',
    });
    await registrarAcesso(b.app, {
      acao: 'leitura',
      entidade: 'pacientes',
      pacienteId: 'p2',
      detalhe: 'cadastro',
    });
    vi.setSystemTime(new Date('2026-11-17T12:00:00.000Z'));
    await registrarAcesso(b.app, {
      acao: 'leitura',
      entidade: 'pacientes',
      pacienteId: 'p3',
      detalhe: 'cadastro',
    });
    vi.setSystemTime(new Date('2026-11-18T12:00:00.000Z'));
    return selarDias(b.app);
  }

  it('sela os dias fechados, em cadeia; hoje fica aberto; selar de novo não muda nada', async () => {
    expect(await doisDiasSelados()).toEqual(['2026-11-16', '2026-11-17']);
    const selos = await b.dono.select().from(auditoriaSelos).orderBy(auditoriaSelos.dia);
    expect(selos.map((s) => [s.dia, s.quantidade])).toEqual([
      ['2026-11-16', 2],
      ['2026-11-17', 1],
    ]);
    expect(selos[1]!.hashAnterior).toBe(selos[0]!.hash);
    await registrarAcesso(b.app, { acao: 'leitura', entidade: 'pacientes', detalhe: 'cadastro' });
    expect(await selarDias(b.app)).toEqual([]);
    expect(await conferirIntegridade(b.app)).toEqual({
      diasConferidos: 2,
      registrosConferidos: 3,
      violacoes: [],
      ultimoDiaSelado: '2026-11-17',
    });
  });

  it('alterar ou apagar um registro direto no banco é detectado (e vai para o monitoramento)', async () => {
    await doisDiasSelados();
    await b.dono.execute(
      sql`update auditoria set usuario_nome = 'Outra pessoa' where paciente_id = 'p1'`,
    );
    const r = await conferirIntegridade(b.app);
    expect(r.violacoes).toEqual([{ dia: '2026-11-16', quantidadeSelada: 2, quantidadeAtual: 2 }]);
    await b.dono.execute(sql`delete from auditoria where paciente_id = 'p3'`);
    expect((await conferirIntegridade(b.app)).violacoes.map((v) => v.dia)).toEqual([
      '2026-11-16',
      '2026-11-17',
    ]);
    const registrarErro = vi.fn(() => 'evento');
    const rotina = await executarAuditoria(b.app, registrarErro, true);
    expect(rotina).toEqual({ selados: 0, conferidos: 2, violacoes: 2 });
    expect(registrarErro).toHaveBeenCalledTimes(2);
  });

  it('a conferência pela tela (Administrador e Gestão)', async () => {
    await doisDiasSelados();
    const gestao = await entrar('gestao');
    const r = await pedir(gestao, 'GET', '/auditoria/integridade');
    expect(r.json()).toMatchObject({ diasConferidos: 2, violacoes: [] });
  });
});

describe('desempenho (29.T.2)', () => {
  it('consulta por paciente em menos de 1 s com 1 milhão de registros', async () => {
    await b.dono.execute(sql`
      insert into auditoria (em, dia, usuario_id, usuario_nome, origem, acao, entidade, registro_id,
                             paciente_id, detalhe)
      select ts, (ts at time zone 'America/Sao_Paulo')::date, 'usu-' || (g % 50), 'Pessoa ' || (g % 50),
             'api', 'leitura', 'pacientes', 'pac-' || (g % 20000), 'pac-' || (g % 20000), 'cadastro'
        from generate_series(1, 1000000) g,
             lateral (select timestamptz '2026-01-01' + (g || ' seconds')::interval * 25 as ts) t`);
    await b.dono.execute(sql`analyze auditoria`);
    const inicio = performance.now();
    const r = await listarAuditoria(b.app, { pacienteId: 'pac-1234', pagina: 1, porPagina: 50 });
    const ms = performance.now() - inicio;
    expect(r.total).toBe(50);
    expect(r.itens).toHaveLength(50);
    expect(ms).toBeLessThan(1000);
    const inicio2 = performance.now();
    await listarAuditoria(b.app, { usuarioId: 'usu-7', pagina: 3, porPagina: 50 });
    expect(performance.now() - inicio2).toBeLessThan(1000);
    expect(agora()).toBeInstanceOf(Date);
  }, 120_000);
});

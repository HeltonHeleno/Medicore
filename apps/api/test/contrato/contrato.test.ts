/**
 * 24.3.5 — Testes de contrato: formato das respostas e dos erros da API, e o caminho de volta
 * (resposta → classe de erro) que o navegador vai usar na Fase 27.
 */
import { erroDeResposta } from '@medicore/dominio/contrato/erros';
import {
  ErroConcorrencia,
  ErroConflito,
  ErroInterno,
  ErroNaoEncontrado,
  ErroValidacao,
  ErroVersaoObrigatoria,
} from '@medicore/dominio/erros';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { semear } from '../../src/banco/semear';
import { respostaSaude } from '../../src/rotas/saude';
import { criarApiDeTeste, type ApiDeTeste } from '../apoio/api';
import { itemExemplo, rotasExemplo } from '../apoio/rotas-exemplo';

let api: ApiDeTeste;
const P = '/api/v1/_exemplo/pacientes';
const ID = 'pac-ana-silva';

/** Formato de todo corpo de erro (tabela "Contrato da API e erros"). */
const corpoErro = z.union([
  z.object({ codigo: z.literal('validacao'), campos: z.record(z.string(), z.string()) }).strict(),
  z
    .object({
      codigo: z.string(),
      mensagem: z.string(),
      campo: z.string().optional(),
      detalhes: z.record(z.string(), z.unknown()).optional(),
    })
    .strict(),
  z.object({ codigo: z.literal('versao'), versaoAtual: z.number().int().optional() }).strict(),
  z.object({ codigo: z.literal('versao_obrigatoria') }).strict(),
  z.object({ codigo: z.literal('nao_encontrado'), mensagem: z.string().optional() }).strict(),
  z.object({ codigo: z.literal('interno'), id: z.string().optional() }).strict(),
]);

async function chamar(
  metodo: 'GET' | 'PATCH' | 'POST',
  url: string,
  opcoes: { corpo?: unknown; cabecalhos?: Record<string, string> } = {},
) {
  const r = await api.app.inject({
    method: metodo,
    url,
    payload: opcoes.corpo as never,
    headers: opcoes.cabecalhos,
  });
  return { status: r.statusCode, corpo: r.body ? r.json() : undefined, cabecalhos: r.headers };
}

beforeAll(async () => {
  api = await criarApiDeTeste((app, banco) => rotasExemplo(banco)(app));
});
beforeEach(async () => {
  await api.banco.limpar();
  await semear(api.banco.dono);
});
afterAll(async () => api.encerrar());

describe('rotas do sistema', () => {
  it('GET /api/v1/saude responde no formato declarado', async () => {
    const r = await chamar('GET', '/api/v1/saude');
    expect(r.status).toBe(200);
    expect(respostaSaude.parse(r.corpo)).toMatchObject({
      status: 'ok',
      banco: 'ok',
      ambiente: 'teste',
    });
  });

  it('OpenAPI publicado em /api/v1/openapi.json e a documentação em /api/v1/docs', async () => {
    const r = await chamar('GET', '/api/v1/openapi.json');
    expect(r.status).toBe(200);
    expect(r.corpo.openapi).toBe('3.1.0');
    expect(Object.keys(r.corpo.paths)).toContain('/api/v1/saude');
    expect(r.corpo.paths['/api/v1/saude'].get.responses['200']).toBeDefined();
    const docs = await api.app.inject({ method: 'GET', url: '/api/v1/docs/' });
    expect(docs.statusCode).toBe(200);
    expect(docs.headers['content-type']).toMatch(/html/);
  });

  it('toda rota GET sem parâmetros obrigatórios do OpenAPI responde 200 no formato declarado', async () => {
    const { corpo } = await chamar('GET', '/api/v1/openapi.json');
    type Operacao = { parameters?: { required?: boolean }[] };
    const rotas = Object.entries(corpo.paths as Record<string, { get?: Operacao }>)
      // As rotas `_exemplo` existem só nestes testes.
      .filter(
        ([caminho, op]) =>
          op.get &&
          !caminho.includes('{') &&
          !caminho.includes('/_') &&
          // A exportação da auditoria responde CSV (tem teste próprio).
          !caminho.endsWith('/exportar') &&
          !(op.get.parameters ?? []).some((p) => p.required),
      )
      .map(([caminho]) => caminho);
    expect(rotas.length).toBeGreaterThan(0);
    for (const rota of rotas) {
      const r = await chamar('GET', rota);
      expect(r.status, rota).toBe(200);
    }
  });

  it('rota inexistente → 404 { codigo: nao_encontrado }', async () => {
    const r = await chamar('GET', '/api/v1/nao-existe');
    expect(r.status).toBe(404);
    expect(corpoErro.parse(r.corpo)).toEqual({ codigo: 'nao_encontrado' });
  });

  it('cabeçalho de segurança básico em toda resposta', async () => {
    const r = await chamar('GET', '/api/v1/saude');
    expect(r.cabecalhos['x-content-type-options']).toBe('nosniff');
  });
});

describe('listas (R-API2)', () => {
  it('paginado, com total, página e por página; padrão de 10, só ativos', async () => {
    const r = await chamar('GET', P);
    expect(r.status).toBe(200);
    const corpo = z
      .object({
        itens: z.array(itemExemplo),
        total: z.number(),
        pagina: z.number(),
        porPagina: z.number(),
      })
      .strict()
      .parse(r.corpo);
    expect(corpo.porPagina).toBe(10);
    expect(corpo.pagina).toBe(1);
    expect(corpo.itens).toHaveLength(10);
    expect(corpo.itens.every((p) => p.ativo)).toBe(true);
  });

  it('busca, ordenação e página além da última (mostra a última, como as telas)', async () => {
    const busca = await chamar(
      'GET',
      `${P}?busca=ana&status=todos&ordenarPor=nome&ordem=desc&porPagina=100`,
    );
    const nomes = busca.corpo.itens.map((p: { nome: string }) => p.nome);
    expect(nomes.length).toBeGreaterThan(0);
    expect(nomes.every((n: string) => /ana/i.test(n))).toBe(true);
    // Mesma ordem das telas: sem diferença de acentos e maiúsculas (Intl.Collator pt-BR).
    const colador = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
    expect([...nomes].sort((a, b) => colador.compare(b, a))).toEqual(nomes);

    const alem = await chamar('GET', `${P}?pagina=999&porPagina=50`);
    expect(alem.corpo.pagina).toBe(Math.ceil(alem.corpo.total / 50));
    expect(alem.corpo.itens.length).toBeGreaterThan(0);
  });

  it('mais de 100 por página, página zero ou ordenação desconhecida → 422', async () => {
    for (const q of ['porPagina=101', 'pagina=0', 'ordenarPor=cpf', 'ordem=cima']) {
      const r = await chamar('GET', `${P}?${q}`);
      expect(r.status, q).toBe(422);
      const corpo = corpoErro.parse(r.corpo);
      expect(corpo.codigo).toBe('validacao');
    }
  });
});

describe('versão: ETag e If-Match (R-API1, D25)', () => {
  it('leitura devolve ETag; If-None-Match igual → 304 sem corpo', async () => {
    const r = await chamar('GET', `${P}/${ID}`);
    expect(r.status).toBe(200);
    expect(r.cabecalhos.etag).toBe('"v1"');
    const de_novo = await api.app.inject({
      method: 'GET',
      url: `${P}/${ID}`,
      headers: { 'if-none-match': '"v1"' },
    });
    expect(de_novo.statusCode).toBe(304);
    expect(de_novo.body).toBe('');
  });

  it('gravação sem If-Match → 428', async () => {
    const r = await chamar('PATCH', `${P}/${ID}`, { corpo: { nome: 'Ana Silva Souza' } });
    expect(r.status).toBe(428);
    expect(corpoErro.parse(r.corpo)).toEqual({ codigo: 'versao_obrigatoria' });
    expect(erroDeResposta(r.status, r.corpo)).toBeInstanceOf(ErroVersaoObrigatoria);
  });

  it('If-Match certo grava e sobe a versão; o mesmo If-Match de novo → 412 com a versão atual', async () => {
    const ok = await chamar('PATCH', `${P}/${ID}`, {
      corpo: { nome: 'Ana Silva Souza' },
      cabecalhos: { 'if-match': '"v1"' },
    });
    expect(ok.status).toBe(200);
    expect(ok.corpo).toMatchObject({ nome: 'Ana Silva Souza', versao: 2 });
    expect(ok.cabecalhos.etag).toBe('"v2"');

    const velho = await chamar('PATCH', `${P}/${ID}`, {
      corpo: { nome: 'Outra Pessoa' },
      cabecalhos: { 'if-match': '"v1"' },
    });
    expect(velho.status).toBe(412);
    expect(corpoErro.parse(velho.corpo)).toEqual({ codigo: 'versao', versaoAtual: 2 });
    const erro = erroDeResposta(velho.status, velho.corpo);
    expect(erro).toBeInstanceOf(ErroConcorrencia);
    expect((erro as ErroConcorrencia).versaoAtual).toBe(2);
  });

  it('duas gravações ao mesmo tempo com a mesma versão: uma passa, a outra recebe 412', async () => {
    const [a, b] = await Promise.all(
      ['Ana Primeira', 'Ana Segunda'].map((nome) =>
        chamar('PATCH', `${P}/${ID}`, { corpo: { nome }, cabecalhos: { 'if-match': '"v1"' } }),
      ),
    );
    expect([a!.status, b!.status].sort()).toEqual([200, 412]);
  });

  it('registro que não existe → 404 com a mensagem do domínio', async () => {
    const r = await chamar('PATCH', `${P}/pac-nao-existe`, {
      corpo: { nome: 'Fulano de Tal' },
      cabecalhos: { 'if-match': '"v1"' },
    });
    expect(r.status).toBe(404);
    expect(corpoErro.parse(r.corpo)).toEqual({
      codigo: 'nao_encontrado',
      mensagem: 'Paciente não encontrado',
    });
    expect(erroDeResposta(r.status, r.corpo)).toBeInstanceOf(ErroNaoEncontrado);
  });
});

describe('erros (tabela do contrato e R-API4)', () => {
  it('campo inválido → 422 { codigo: validacao, campos } e ErroValidacao no navegador', async () => {
    const r = await chamar('PATCH', `${P}/${ID}`, {
      corpo: { nome: 'A' },
      cabecalhos: { 'if-match': '"v1"' },
    });
    expect(r.status).toBe(422);
    expect(corpoErro.parse(r.corpo)).toEqual({
      codigo: 'validacao',
      campos: { nome: 'Informe o nome completo' },
    });
    const erro = erroDeResposta(r.status, r.corpo) as ErroValidacao;
    expect(erro).toBeInstanceOf(ErroValidacao);
    expect(erro.campos).toEqual({ nome: 'Informe o nome completo' });
  });

  it('JSON malformado → 422, sem detalhes do analisador', async () => {
    const r = await api.app.inject({
      method: 'PATCH',
      url: `${P}/${ID}`,
      headers: { 'content-type': 'application/json', 'if-match': '"v1"' },
      payload: '{"nome":',
    });
    expect(r.statusCode).toBe(422);
    expect(corpoErro.parse(r.json()).codigo).toBe('validacao');
  });

  it('restrição do banco → 409 com o código do conflito, sem SQL nem nome de tabela', async () => {
    const r = await chamar('POST', `${P}/${ID}/copiar`, { corpo: { novoId: 'pac-copia' } });
    expect(r.status).toBe(409);
    expect(corpoErro.parse(r.corpo)).toEqual({
      codigo: 'cpf_duplicado',
      mensagem: 'Já existe um paciente com este CPF',
      campo: 'cpf',
    });
    expect(JSON.stringify(r.corpo)).not.toMatch(/pacientes_|INSERT|duplicate|constraint/i);
    const erro = erroDeResposta(r.status, r.corpo) as ErroConflito;
    expect(erro).toBeInstanceOf(ErroConflito);
    expect(erro).toMatchObject({ codigo: 'cpf_duplicado', campo: 'cpf' });
  });

  it('erro inesperado → 500 { codigo: interno, id }, sem mensagem, pilha nem dados', async () => {
    const r = await chamar('GET', '/api/v1/_exemplo/falha');
    expect(r.status).toBe(500);
    expect(corpoErro.parse(r.corpo)).toEqual({
      codigo: 'interno',
      id: expect.stringMatching(/^evento\d+$/),
    });
    expect(JSON.stringify(r.corpo)).not.toMatch(/Maria|3905|SELECT|at |\.ts/);
    expect(api.erros.at(-1)).toBeInstanceOf(Error);
    const erro = erroDeResposta(r.status, r.corpo) as ErroInterno;
    expect(erro).toBeInstanceOf(ErroInterno);
    expect(erro.id).toBe(r.corpo.id);
  });
});

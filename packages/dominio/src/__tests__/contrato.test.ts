/** Fase 24 (24.3.2, 24.3.4) — Contrato de erros nos dois sentidos e o padrão das listas. */
import { describe, expect, it } from 'vitest';
import { erroDeResposta, respostaDeErro } from '../contrato/erros';
import { comOrdenacao, consultaLista, janela, paginaEfetiva, paginado } from '../contrato/lista';
import {
  ErroConcorrencia,
  ErroConflito,
  ErroInterno,
  ErroLimite,
  ErroNaoEncontrado,
  ErroPermissao,
  ErroRede,
  ErroSessao,
  ErroValidacao,
  ErroVersaoObrigatoria,
} from '../erros';
import { rotaSemParametros } from '../monitoramento/limpeza';

describe('respostaDeErro → erroDeResposta: cada erro volta como a mesma classe', () => {
  const casos: [Error, number][] = [
    [new ErroValidacao({ cpf: 'Informe um CPF válido' }), 422],
    [
      new ErroConflito('cpf_duplicado', 'Já existe', { campo: 'cpf', detalhes: { id: 'pac-1' } }),
      409,
    ],
    [new ErroConcorrencia(4), 412],
    [new ErroVersaoObrigatoria(), 428],
    [new ErroNaoEncontrado('Paciente não encontrado'), 404],
    [new ErroSessao(), 401],
    [new ErroPermissao('dar alta'), 403],
    [new ErroLimite(300), 429],
    [new ErroInterno('abc'), 500],
  ];
  it.each(casos)('%s → %s', (erro, status) => {
    const r = respostaDeErro(erro);
    expect(r.status).toBe(status);
    const volta = erroDeResposta(r.status, JSON.parse(JSON.stringify(r.corpo)));
    expect(volta.constructor).toBe(erro.constructor);
    expect(volta.message).toBe(erro.message);
  });

  it('os campos de cada erro chegam do outro lado', () => {
    const conflito = erroDeResposta(
      409,
      respostaDeErro(new ErroConflito('medico_ocupado', 'Ocupado', { campo: 'hora' })).corpo,
    );
    expect(conflito).toMatchObject({ codigo: 'medico_ocupado', campo: 'hora', message: 'Ocupado' });
    expect(erroDeResposta(412, { codigo: 'versao', versaoAtual: 7 })).toMatchObject({
      versaoAtual: 7,
    });
    expect(erroDeResposta(403, { codigo: 'permissao', acao: 'dar alta' })).toMatchObject({
      acao: 'dar alta',
    });
    expect(erroDeResposta(429, { codigo: 'limite', aguardarSegundos: 120 })).toMatchObject({
      aguardarSegundos: 120,
      message: 'Muitas tentativas. Tente de novo em 2 minutos.',
    });
    expect(erroDeResposta(422, { codigo: 'validacao', campos: { nome: 'x' } })).toMatchObject({
      campos: { nome: 'x' },
    });
  });

  it('erro qualquer vira 500 sem mensagem; sem rede ou 502–504 vira E-22', () => {
    expect(respostaDeErro(new TypeError('segredo'))).toEqual({
      status: 500,
      corpo: { codigo: 'interno' },
    });
    expect(erroDeResposta(undefined, undefined)).toBeInstanceOf(ErroRede);
    expect(erroDeResposta(0, null)).toBeInstanceOf(ErroRede);
    for (const s of [502, 503, 504]) expect(erroDeResposta(s, '<html>')).toBeInstanceOf(ErroRede);
    expect(erroDeResposta(500, 'texto')).toBeInstanceOf(ErroInterno);
    expect(erroDeResposta(409, {})).toMatchObject({ codigo: 'conflito_dados' });
  });

  it('mensagens E-19 a E-22', () => {
    expect(new ErroSessao().message).toBe('Sua sessão terminou. Entre de novo para continuar.');
    expect(new ErroPermissao('dar alta').message).toBe(
      'Seu perfil não permite dar alta. Fale com o administrador.',
    );
    expect(new ErroLimite(30).message).toBe('Muitas tentativas. Tente de novo em 1 minuto.');
    expect(new ErroRede().message).toBe(
      'Sem conexão com o servidor. Suas alterações não foram salvas.',
    );
  });
});

describe('listas (R-API2)', () => {
  it('padrões: página 1, 10 por página, ordem crescente', () => {
    expect(consultaLista.parse({})).toEqual({
      pagina: 1,
      porPagina: 10,
      ordem: 'asc',
      busca: undefined,
    });
  });

  it('a query string chega como texto e vira número; busca vazia some', () => {
    expect(consultaLista.parse({ pagina: '3', porPagina: '50', busca: '  ' })).toMatchObject({
      pagina: 3,
      porPagina: 50,
      busca: undefined,
    });
  });

  it('recusa mais de 100 por página e página zero', () => {
    expect(consultaLista.safeParse({ porPagina: '101' }).success).toBe(false);
    expect(consultaLista.safeParse({ pagina: '0' }).success).toBe(false);
  });

  it('ordenação permitida por rota, com o primeiro campo como padrão', () => {
    const q = comOrdenacao(['nome', 'idade'] as const);
    expect(q.parse({}).ordenarPor).toBe('nome');
    expect(q.safeParse({ ordenarPor: 'cpf' }).success).toBe(false);
  });

  it('página além da última mostra a última, como o `paginar` das telas', () => {
    expect(paginaEfetiva(9, 10, 25)).toBe(3);
    expect(paginaEfetiva(1, 10, 0)).toBe(1);
    expect(janela({ pagina: 9, porPagina: 10 }, 25)).toEqual({
      pagina: 3,
      limite: 10,
      deslocamento: 20,
    });
    expect(paginado(['a'], 25, { pagina: 9, porPagina: 10 })).toEqual({
      itens: ['a'],
      total: 25,
      pagina: 3,
      porPagina: 10,
    });
  });
});

describe('rotas da API sem parâmetros (monitoramento e logs)', () => {
  it('`v1` não é id; números e ids sim', () => {
    expect(rotaSemParametros('/api/v1/pacientes/pac-ana-silva')).toBe('/api/v1/pacientes/:id');
    expect(rotaSemParametros('/api/v1/resumos/2026')).toBe('/api/v1/resumos/:id');
    expect(rotaSemParametros('/api/v1/itens/42')).toBe('/api/v1/itens/:id');
  });
});

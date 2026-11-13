import { describe, expect, it } from 'vitest';
import {
  limparEvento,
  limparMigalha,
  limparSpan,
  limparTexto,
  rotaSemParametros,
  type EventoLimpavel,
} from '../monitoramento/limpeza';

/** Paciente fictício com todos os campos pessoais preenchidos. */
const PACIENTE = {
  id: 'pac-maria-oliveira',
  nome: 'Maria Aparecida Oliveira',
  nomeSocial: 'Mari Oliveira',
  cpf: '39053344705',
  cpfFormatado: '390.533.447-05',
  cns: '898001160624007',
  dataNascimento: '1984-03-12',
  telefone: '11987654321',
  telefoneFormatado: '(11) 98765-4321',
  email: 'maria.oliveira@exemplo.com.br',
  endereco: {
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    numero: '1578',
    bairro: 'Bela Vista',
  },
  alergias: 'Dipirona e frutos do mar',
  contatoEmergencia: { nome: 'José Oliveira', telefone: '11912345678' },
  observacoes: 'Gestante de 20 semanas',
};

/** Textos que não podem aparecer em nada que sai do navegador. */
const PROIBIDOS = [
  'Maria',
  'Oliveira',
  '39053344705',
  '390.533.447-05',
  '898001160624007',
  '1984-03-12',
  '11987654321',
  '98765-4321',
  'maria.oliveira',
  'exemplo.com.br',
  '01310-100',
  'Paulista',
  'Bela Vista',
  'Dipirona',
  'frutos do mar',
  'José',
  '11912345678',
  'Gestante',
  'pac-maria-oliveira',
];

function eventoComPacienteInteiro(): EventoLimpavel {
  const json = JSON.stringify(PACIENTE);
  const evento = {
    message: `Falha ao salvar ${json}`,
    transaction: `/pacientes/${PACIENTE.id}/editar?busca=Maria+Oliveira`,
    request: {
      url: `https://medicore.exemplo/pacientes/${PACIENTE.id}?cpf=${PACIENTE.cpf}#alergias`,
      ...{ query_string: `busca=${PACIENTE.nome}`, data: json, cookies: { sessao: 'x' } },
      ...{ headers: { Referer: `/pacientes?busca=${PACIENTE.nome}` } },
    },
    exception: {
      values: [
        {
          type: 'TypeError',
          value: `"${PACIENTE.nome}" (CPF ${PACIENTE.cpfFormatado}, ${PACIENTE.email}, tel. ${PACIENTE.telefoneFormatado}, CEP ${PACIENTE.endereco.cep}, CNS ${PACIENTE.cns}) não pôde ser lido`,
          stacktrace: {
            frames: [{ filename: 'assets/index-AbC12345.js', lineno: 1, vars: { PACIENTE } }],
          },
        },
      ],
    },
    breadcrumbs: [
      { category: 'console', message: `salvando ${json}`, data: { arguments: [PACIENTE] } },
      { category: 'ui.click', message: `button[aria-label="Editar ${PACIENTE.nome}"]` },
      { category: 'ui.input', message: `input[name="nome"]`, data: { valor: PACIENTE.nome } },
      {
        category: 'navigation',
        data: { from: '/pacientes?busca=Maria', to: `/pacientes/${PACIENTE.id}` },
      },
      {
        category: 'fetch',
        message: `GET https://viacep.com.br/ws/${PACIENTE.endereco.cep}/json/`,
        data: {
          method: 'GET',
          status_code: 200,
          url: `https://viacep.com.br/ws/01310100/json/`,
          response: PACIENTE.endereco,
        },
      },
    ],
    user: { id: PACIENTE.id, email: PACIENTE.email, username: PACIENTE.nome },
    extra: { paciente: PACIENTE },
    contexts: { paciente: PACIENTE, browser: { name: 'Chrome' }, os: { name: 'Windows' } },
    tags: { paciente: PACIENTE.nome, origem: 'rota', rota: '/pacientes/:id' },
  };
  return evento as EventoLimpavel;
}

describe('limparEvento (23.1.4)', () => {
  it('um evento com um paciente inteiro não sai com nenhum dado pessoal', () => {
    const texto = JSON.stringify(limparEvento(eventoComPacienteInteiro()));
    for (const proibido of PROIBIDOS) expect(texto).not.toContain(proibido);
  });

  it('mantém o que serve para achar o erro', () => {
    const limpo = limparEvento(eventoComPacienteInteiro());
    expect(limpo.exception?.values?.[0]?.type).toBe('TypeError');
    expect(limpo.exception?.values?.[0]?.value).toContain('não pôde ser lido');
    expect(limpo.exception?.values?.[0]?.stacktrace?.frames?.[0]).toEqual({
      filename: 'assets/index-AbC12345.js',
      lineno: 1,
    });
    expect(limpo.transaction).toBe('/pacientes/:id/editar');
    expect(limpo.request).toEqual({ url: '/pacientes/:id' });
    expect(limpo.contexts).toEqual({ browser: { name: 'Chrome' }, os: { name: 'Windows' } });
    expect(limpo.tags).toEqual({ origem: 'rota', rota: '/pacientes/:id' });
    expect(limpo.user).toBeUndefined();
    expect(limpo.extra).toBeUndefined();
  });

  it('migalhas: digitação sai, clique fica só com a categoria, navegação sem parâmetros', () => {
    const migalhas = limparEvento(eventoComPacienteInteiro()).breadcrumbs!;
    expect(migalhas.map((m) => m.category)).toEqual(['console', 'ui.click', 'navigation', 'fetch']);
    expect(migalhas[1]).toEqual({ category: 'ui.click', message: undefined, data: undefined });
    expect(migalhas[2]!.data).toEqual({ from: '/pacientes', to: '/pacientes/:id' });
    expect(migalhas[3]!.data).toEqual({
      method: 'GET',
      status_code: 200,
      url: 'https://viacep.com.br/[removido]',
    });
  });

  it('não altera o evento original', () => {
    const original = eventoComPacienteInteiro();
    limparEvento(original);
    expect(original.user).toBeDefined();
    expect(original.exception?.values?.[0]?.stacktrace?.frames?.[0]).toHaveProperty('vars');
  });
});

describe('limparTexto', () => {
  it.each([
    ['"Ana Silva" não está internada.', '"[removido]" não está internada.'],
    ['Paciente “Ana Silva” sem leito', 'Paciente “[removido]” sem leito'],
    ['CPF 123.456.789-09 e 12345678909', 'CPF [cpf] e [cpf]'],
    ['contato ana@x.com.br', 'contato [e-mail]'],
    ['ligar (11) 98765-4321 ou 1133334444', 'ligar [telefone] ou [telefone]'],
    ['CEP 01310-100', 'CEP [cep]'],
    ['CNS 898001160624007', 'CNS [número]'],
  ])('%s', (entrada, saida) => {
    expect(limparTexto(entrada)).toBe(saida);
  });

  it('mantém mensagens técnicas úteis', () => {
    const msg = "Cannot read properties of undefined (reading 'nome')";
    expect(limparTexto(msg)).toBe(msg);
    expect(limparTexto('Erro na linha 42 de 120')).toBe('Erro na linha 42 de 120');
  });
});

describe('rotaSemParametros', () => {
  it.each([
    ['/pacientes/pac-ana-silva/editar?busca=ana', '/pacientes/:id/editar'],
    ['https://medicore.exemplo/leitos/lei-uti-01#mapa', '/leitos/:id'],
    ['/leitos/internacoes/int-12', '/leitos/internacoes/:id'],
    ['/emergencia/ate-1/triagem', '/emergencia/:id/triagem'],
    ['/farmacia/dispensacoes/dis-3', '/farmacia/dispensacoes/:id'],
    ['/consultas/con-hoje-1030', '/consultas/:id'],
    ['/x/0b8e7f4a-1c2d-4e5f-8a9b-0c1d2e3f4a5b', '/x/:id'],
    ['/farmacia/medicamentos/novo', '/farmacia/medicamentos/novo'],
    ['/', '/'],
  ])('%s → %s', (entrada, saida) => {
    expect(rotaSemParametros(entrada)).toBe(saida);
  });
});

describe('limparMigalha e limparSpan', () => {
  it('console fica com o texto limpo e sem dados anexos', () => {
    expect(
      limparMigalha({ category: 'console', message: 'CPF 12345678909', data: { a: 1 } }),
    ).toEqual({ category: 'console', message: 'CPF [cpf]', data: undefined });
  });

  it('span: nome da rota sem parâmetros e atributos sem busca nem dados pessoais', () => {
    const span = limparSpan({
      name: '/pacientes/pac-ana-silva',
      attributes: {
        'sentry.op': 'navigation',
        'url.full': `${location.origin}/pacientes/pac-ana-silva?busca=Ana`,
        'http.url': 'https://viacep.com.br/ws/01310100/json/',
        'url.query': '?busca=Ana',
        'http.response.status_code': 200,
        descricao: 'abrir "Ana Silva"',
      },
    });
    expect(span).toEqual({
      name: '/pacientes/:id',
      attributes: {
        'sentry.op': 'navigation',
        'url.full': '/pacientes/:id',
        'http.url': 'https://viacep.com.br/[removido]',
        'http.response.status_code': 200,
        descricao: 'abrir "[removido]"',
      },
    });
  });
});

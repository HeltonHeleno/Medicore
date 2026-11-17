/**
 * 25.T.3 — Contrato das rotas de cadastros e agenda: formato de cada resposta (esquemas de
 * `@medicore/dominio/contrato/cadastros`), versão (ETag, 428, 412) e erros.
 */
import {
  atividade,
  consulta,
  consultaDetalhada,
  departamento,
  horarioAgenda,
  indicadoresCadastros,
  medico,
  medicoResumo,
  paciente,
  pacienteResumo,
  pendenciaModulo,
  referenciaCadastro,
} from '@medicore/dominio/contrato/cadastros';
import { respostaLista } from '@medicore/dominio/contrato/lista';
import { z } from 'zod';
import { usarApi } from '../apoio/cliente';

const { api } = usarApi('2026-11-09T08:00:00-03:00');

async function chamar(
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  opcoes: { corpo?: unknown; versao?: string } = {},
) {
  const r = await api().app.inject({
    method: metodo,
    url: `/api/v1${url}`,
    payload: opcoes.corpo as object | undefined,
    headers: opcoes.versao ? { 'if-match': opcoes.versao } : {},
  });
  return { status: r.statusCode, corpo: r.body ? r.json() : null, etag: r.headers.etag };
}

const PACIENTE = 'pac-ana-silva';
const MEDICO = 'med-paulo-mendes';
const CONSULTA = 'con-hoje-1030';

const pacienteNovo = {
  nome: 'Contrato da Silva',
  cpf: '52998224725',
  dataNascimento: '1990-01-01',
  sexo: 'feminino',
  telefone: '11987654321',
  convenio: { tipo: 'particular' },
  consentimentoLgpd: true,
};

describe('formato das respostas de leitura', () => {
  const casos: [string, z.ZodType][] = [
    ['/pacientes', respostaLista(pacienteResumo)],
    [
      '/pacientes?busca=ana&status=todos&ordenarPor=idade&ordem=desc&porPagina=5',
      respostaLista(pacienteResumo),
    ],
    [`/pacientes/${PACIENTE}`, paciente],
    ['/pacientes/cpf/52998224725', referenciaCadastro],
    [`/pacientes/${PACIENTE}/tem-consultas`, z.object({ temConsultas: z.boolean() })],
    [`/pacientes/${PACIENTE}/consultas-futuras`, z.array(consulta)],
    [`/pacientes/${PACIENTE}/pendencias`, z.array(pendenciaModulo)],
    ['/departamentos', z.array(departamento)],
    ['/medicos', respostaLista(medicoResumo)],
    ['/medicos?ordenarPor=departamento&departamentoId=cardiologia', respostaLista(medicoResumo)],
    [`/medicos/${MEDICO}`, medico],
    ['/medicos/crm/SP/536612', referenciaCadastro],
    [`/medicos/${MEDICO}/consultas-futuras`, z.array(consulta)],
    [`/medicos/${MEDICO}/pendencias`, z.array(pendenciaModulo)],
    ['/consultas?data=2026-11-09', z.array(consultaDetalhada)],
    [
      '/consultas?de=2026-11-02&ate=2026-11-16&medicoId=med-paulo-mendes',
      z.array(consultaDetalhada),
    ],
    ['/consultas?pendentes=true', z.array(consultaDetalhada)],
    [`/consultas/${CONSULTA}`, consultaDetalhada],
    [`/agenda/horarios?medicoId=${MEDICO}&data=2026-11-10&duracaoMin=30`, z.array(horarioAgenda)],
    [
      `/agenda/proximo-dia?medicoId=${MEDICO}&data=2026-11-10&duracaoMin=30`,
      z.object({ data: z.string().nullable() }),
    ],
    ['/atividades?limite=3', z.array(atividade)],
    ['/indicadores/cadastros', indicadoresCadastros],
  ];
  it.each(casos)('GET %s', async (url, esquema) => {
    const r = await chamar('GET', url);
    expect(r.status).toBe(200);
    expect(() => esquema.parse(r.corpo)).not.toThrow();
  });

  it('os registros vêm com ETag e respondem 304 à mesma versão', async () => {
    for (const url of [`/pacientes/${PACIENTE}`, `/medicos/${MEDICO}`]) {
      const r = await chamar('GET', url);
      expect(r.etag, url).toBe(`"v${r.corpo.versao}"`);
      const de_novo = await api().app.inject({
        method: 'GET',
        url: `/api/v1${url}`,
        headers: { 'if-none-match': r.etag! },
      });
      expect(de_novo.statusCode, url).toBe(304);
    }
  });

  it('Fase 27: a consulta detalhada (com `atrasada`, que muda com o tempo) tem ETag, mas nunca 304', async () => {
    const r = await chamar('GET', `/consultas/${CONSULTA}`);
    expect(r.etag).toBe(`"v${r.corpo.versao}"`);
    const de_novo = await api().app.inject({
      method: 'GET',
      url: `/api/v1/consultas/${CONSULTA}`,
      headers: { 'if-none-match': r.etag! },
    });
    expect(de_novo.statusCode).toBe(200);
    expect(de_novo.headers['cache-control']).toBe('no-store');
  });
});

describe('gravações: versão obrigatória nas edições (R-API1)', () => {
  it('PUT sem If-Match → 428; com versão antiga → 412 com a atual; com a certa → 200 e ETag novo', async () => {
    const p = await chamar('POST', '/pacientes', { corpo: pacienteNovo });
    expect(p.status).toBe(201);
    expect(paciente.parse(p.corpo).versao).toBe(1);
    expect(p.etag).toBe('"v1"');
    const url = `/pacientes/${p.corpo.id}`;

    expect((await chamar('PUT', url, { corpo: pacienteNovo })).status).toBe(428);
    const ok = await chamar('PUT', url, {
      corpo: { ...pacienteNovo, nome: 'Contrato Novo' },
      versao: '"v1"',
    });
    expect(ok.status).toBe(200);
    expect(ok.etag).toBe('"v2"');
    const velho = await chamar('PUT', url, { corpo: pacienteNovo, versao: '"v1"' });
    expect(velho).toMatchObject({ status: 412, corpo: { codigo: 'versao', versaoAtual: 2 } });
  });

  it('médico e consulta seguem o mesmo padrão; cancelar também exige a versão', async () => {
    const m = await chamar('GET', `/medicos/${MEDICO}`);
    const { id: _id, criadoEm: _c, atualizadoEm: _a, versao: _v, ativo: _at, ...dados } = m.corpo;
    expect((await chamar('PUT', `/medicos/${MEDICO}`, { corpo: dados })).status).toBe(428);
    const r = await chamar('PUT', `/medicos/${MEDICO}`, { corpo: dados, versao: m.etag });
    expect(r.status).toBe(200);
    expect(
      z.object({ medico, consultasForaDoHorario: z.number() }).parse(r.corpo).medico.versao,
    ).toBe(2);

    const c = await chamar('GET', `/consultas/${CONSULTA}`);
    expect(
      (
        await chamar('POST', `/consultas/${CONSULTA}/cancelar`, {
          corpo: { motivo: 'Paciente pediu' },
        })
      ).status,
    ).toBe(428);
    expect(
      (
        await chamar('POST', `/consultas/${CONSULTA}/cancelar`, {
          corpo: { motivo: 'Paciente pediu' },
          versao: '"v99"',
        })
      ).status,
    ).toBe(412);
    const cancelada = await chamar('POST', `/consultas/${CONSULTA}/cancelar`, {
      corpo: { motivo: 'Paciente pediu' },
      versao: c.etag,
    });
    expect(cancelada.status).toBe(200);
    expect(consultaDetalhada.parse(cancelada.corpo).status).toBe('cancelada');
  });

  it('ações (inativar, reativar, excluir) aceitam If-Match opcional e conferem quando vem', async () => {
    const p = await chamar('POST', '/pacientes', { corpo: pacienteNovo });
    const url = `/pacientes/${p.corpo.id}`;
    expect((await chamar('POST', `${url}/inativar`, { corpo: {}, versao: '"v9"' })).status).toBe(
      412,
    );
    const inativou = await chamar('POST', `${url}/inativar`, { corpo: { motivo: 'Mudou' } });
    expect(inativou).toMatchObject({ status: 200, corpo: { consultasCanceladas: 0 } });
    expect((await chamar('POST', `${url}/reativar`)).status).toBe(200);
    expect((await chamar('DELETE', url)).status).toBe(204);
    expect((await chamar('GET', url)).status).toBe(404);
  });
});

describe('erros', () => {
  it.each([`/pacientes/nao-existe`, `/medicos/nao-existe`, `/consultas/nao-existe`])(
    'GET %s → 404 com a mensagem do domínio',
    async (url) => {
      const r = await chamar('GET', url);
      expect(r.status).toBe(404);
      expect(r.corpo).toEqual({
        codigo: 'nao_encontrado',
        mensagem: expect.stringMatching(/não encontrad/),
      });
    },
  );

  it('corpo inválido → 422 com os campos (mesmas mensagens do formulário)', async () => {
    const r = await chamar('POST', '/pacientes', {
      corpo: { ...pacienteNovo, cpf: '123', dataNascimento: '2015-05-05' },
    });
    expect(r.status).toBe(422);
    expect(r.corpo.codigo).toBe('validacao');
    expect(Object.keys(r.corpo.campos)).toEqual(expect.arrayContaining(['cpf']));
  });

  it('regra de negócio → 409 com código e campo (E-04 no agendamento)', async () => {
    const corpo = {
      pacienteId: PACIENTE,
      medicoId: MEDICO,
      data: '2026-11-24',
      hora: '10:00',
      duracaoMin: 30,
      tipo: 'retorno',
    };
    expect((await chamar('POST', '/consultas', { corpo })).status).toBe(201);
    const r = await chamar('POST', '/consultas', {
      corpo: { ...corpo, pacienteId: 'pac-joao-pereira' },
    });
    expect(r).toMatchObject({ status: 409, corpo: { codigo: 'medico_ocupado', campo: 'hora' } });
  });

  it('pendências entre módulos (E-17) trazem os itens, sem dados de outro paciente', async () => {
    const lista = await chamar('GET', '/pacientes?status=todos&porPagina=100');
    for (const p of lista.corpo.itens as { id: string }[]) {
      const pend = await chamar('GET', `/pacientes/${p.id}/pendencias`);
      if (pend.corpo.length === 0) continue;
      const r = await chamar('POST', `/pacientes/${p.id}/inativar`, { corpo: {} });
      expect(r.status).toBe(409);
      expect(r.corpo).toMatchObject({
        codigo: 'pendencias_modulos',
        detalhes: { itens: pend.corpo },
      });
      return;
    }
    throw new Error('Os dados de exemplo deveriam ter um paciente internado.');
  });

  it('busca com mais de 100 caracteres, período inválido ou duração fora da faixa → 422', async () => {
    for (const url of [
      `/pacientes?busca=${'a'.repeat(101)}`,
      '/consultas?data=09/11/2026',
      `/agenda/horarios?medicoId=${MEDICO}&data=2026-11-10&duracaoMin=1`,
      '/atividades?limite=0',
    ]) {
      expect((await chamar('GET', url)).status, url).toBe(422);
    }
  });
});

describe('OpenAPI', () => {
  it('documenta todas as rotas de cadastros e agenda, com os grupos', async () => {
    const { corpo } = await chamar('GET', '/openapi.json');
    const caminhos = Object.keys(corpo.paths);
    for (const esperado of [
      '/api/v1/pacientes',
      '/api/v1/pacientes/{id}',
      '/api/v1/pacientes/{id}/inativar',
      '/api/v1/medicos',
      '/api/v1/medicos/{id}/consultas-afetadas',
      '/api/v1/consultas',
      '/api/v1/consultas/lote',
      '/api/v1/agenda/horarios',
      '/api/v1/indicadores/cadastros',
    ]) {
      expect(caminhos).toContain(esperado);
    }
    expect(corpo.paths['/api/v1/pacientes'].post.requestBody).toBeDefined();
    expect(corpo.tags.map((t: { name: string }) => t.name)).toEqual([
      'sistema',
      'pacientes',
      'médicos',
      'agenda',
      'leitos',
      'emergência',
      'farmácia',
      'painel',
      'acesso',
      'usuários',
    ]);
  });
});

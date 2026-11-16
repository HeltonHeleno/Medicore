/**
 * 26.T (contrato) — Rotas de leitos, emergência, farmácia, situação e indicadores:
 * - cada leitura confere com o esquema do contrato **e é igual ao que o serviço devolve** (nada é
 *   cortado na serialização);
 * - ETag e 304 nos registros; 428 sem `If-Match` e 412 com a versão antiga nas gravações;
 * - 404 com a mensagem do domínio; OpenAPI com todas as rotas.
 */
import * as c from '@medicore/dominio/contrato/operacoes';
import { z } from 'zod';
import * as farmacia from '../../src/servicos/operacoes/farmacia';
import * as ind from '../../src/servicos/operacoes/indicadores-operacionais';
import * as leitos from '../../src/servicos/operacoes/leitos';
import * as emergencia from '../../src/servicos/operacoes/emergencia';
import * as sit from '../../src/servicos/operacoes/situacao-hospitalar';
import { ler } from '../../src/servicos/operacoes/unidade';
import { usarOperacoes } from '../apoio/operacoes';

const { api, repoInternacoes, repoAtendimentos, repoDispensacoes, repoLeitos, repoSolicitacoes } =
  usarOperacoes('2026-11-10T10:30:00-03:00');

async function chamar(
  metodo: 'GET' | 'POST' | 'PUT',
  url: string,
  opcoes: { corpo?: unknown; versao?: string; seNao?: string } = {},
) {
  const r = await api().app.inject({
    method: metodo,
    url: `/api/v1${url}`,
    payload: opcoes.corpo as object | undefined,
    headers: {
      ...(opcoes.versao ? { 'if-match': opcoes.versao } : {}),
      ...(opcoes.seNao ? { 'if-none-match': opcoes.seNao } : {}),
    },
  });
  return { status: r.statusCode, corpo: r.body ? r.json() : null, etag: r.headers.etag };
}

const PACIENTE = 'pac-ana-silva';
const MEDICAMENTO = 'med-morfina-10';

describe('formato das leituras, igual ao serviço', () => {
  const casos = (): [string, z.ZodType, () => unknown][] => {
    const int = repoInternacoes.todos().find((i) => i.status === 'ativa')!;
    const ate = repoAtendimentos.todos().find((a) => a.status !== 'encerrado')!;
    const sol = repoSolicitacoes.todos().find((s) => s.status === 'pendente')!;
    const disp = repoDispensacoes.todos()[0]!;
    const leito = repoLeitos.todos()[0]!;
    return [
      ['/leitos', z.array(c.leitoDetalhado), () => leitos.listarLeitos()],
      [
        '/leitos?setorId=uti&status=ocupado&soIsolamento=false',
        z.array(c.leitoDetalhado),
        () => leitos.listarLeitos({ setorId: 'uti', status: 'ocupado', soIsolamento: false }),
      ],
      ['/leitos/busca?termo=a', z.array(c.leitoDetalhado), () => leitos.buscarPacienteNoMapa('a')],
      [`/leitos/${leito.id}`, c.leitoDetalhado, () => leitos.obterLeito(leito.id)],
      [
        `/leitos/${leito.id}/historico?dias=60`,
        z.array(c.internacaoDetalhada),
        () => leitos.historicoLeito(leito.id, 60),
      ],
      [
        `/leitos/compativeis?pacienteId=${PACIENTE}&precaucao=contato&setorDesejado=uti`,
        z.array(c.leitoAvaliado),
        () =>
          leitos.leitosCompativeis({
            pacienteId: PACIENTE,
            precaucao: 'contato',
            setorDesejado: 'uti',
          }),
      ],
      ['/internacoes', c.listaInternacoes, () => leitos.listarInternacoes()],
      [
        '/internacoes?status=encerrada&porPagina=50',
        c.listaInternacoes,
        () => leitos.listarInternacoes({ status: 'encerrada', porPagina: 50 }),
      ],
      [`/internacoes/${int.id}`, c.internacaoDetalhada, () => leitos.obterInternacao(int.id)],
      ['/solicitacoes', z.array(c.solicitacaoDetalhada), () => leitos.listarSolicitacoes()],
      [`/solicitacoes/${sol.id}`, c.solicitacaoDetalhada, () => leitos.obterSolicitacao(sol.id)],
      [
        '/medicos-responsaveis?setorId=uti',
        c.listaMedicos,
        () => leitos.medicosResponsaveis('uti'),
      ],
      ['/emergencia/fila', c.filaEmergencia, () => emergencia.listarFila()],
      ['/emergencia/medicos', c.listaMedicos, () => emergencia.medicosParaChamar()],
      [
        '/atendimentos?porPagina=100',
        c.listaHistoricoEmergencia,
        () => emergencia.listarHistorico({ porPagina: 100 }),
      ],
      [
        `/atendimentos/${ate.id}`,
        c.atendimentoDetalhado,
        () => emergencia.obterAtendimento(ate.id),
      ],
      [
        `/atendimentos/${ate.id}/leitos-observacao`,
        z.array(c.leitoAvaliado),
        () => emergencia.leitosParaObservacao(ate.id),
      ],
      [
        '/medicamentos?porPagina=100&status=todos',
        c.listaEstoque,
        () => farmacia.listarEstoque({ porPagina: 100, status: 'todos' }),
      ],
      [
        `/medicamentos/${MEDICAMENTO}`,
        c.detalheMedicamento,
        () => farmacia.obterMedicamento(MEDICAMENTO),
      ],
      [
        `/medicamentos/${MEDICAMENTO}/livro?de=2026-10-01&ate=2026-11-10`,
        c.livroControlados,
        () => farmacia.livroControlados(MEDICAMENTO, '2026-10-01', '2026-11-10'),
      ],
      [
        `/medicamentos/med-paracetamol-750/fefo?quantidade=30`,
        c.previaFefo,
        () => farmacia.previaFefo('med-paracetamol-750', 30),
      ],
      ['/lotes/vencimento', z.array(c.loteVencimento), () => farmacia.listarLotesVencimento()],
      [
        '/movimentacoes?porPagina=100',
        c.listaMovimentacoes,
        () => farmacia.listarMovimentacoes({ porPagina: 100 }),
      ],
      [
        '/movimentacoes?tipo=dispensacao&de=2026-11-05&ate=2026-11-10',
        c.listaMovimentacoes,
        () =>
          farmacia.listarMovimentacoes({
            tipo: 'dispensacao',
            de: '2026-11-05',
            ate: '2026-11-10',
          }),
      ],
      [
        `/dispensacoes/${disp.id}`,
        c.dispensacaoDetalhada,
        () => farmacia.obterDispensacao(disp.id),
      ],
      [
        `/pacientes/${disp.pacienteId}/dispensacoes`,
        z.array(c.dispensacao),
        () => farmacia.listarDispensacoesDoPaciente(disp.pacienteId),
      ],
      [
        `/pacientes/${int.pacienteId}/destino`,
        c.destinoDetalhado,
        () => farmacia.destinoDetalhado(int.pacienteId),
      ],
      [
        `/pacientes/${PACIENTE}/destino`,
        c.destinoDetalhado,
        () => farmacia.destinoDetalhado(PACIENTE),
      ],
      [
        `/pacientes/${PACIENTE}/alergia/med-amoxicilina-500`,
        c.correspondenciaAlergia,
        () => farmacia.verificarAlergia(PACIENTE, 'med-amoxicilina-500'),
      ],
      [
        `/destinos/${disp.destino.id}/dispensacoes`,
        z.array(c.dispensacaoResumida),
        () => farmacia.listarDispensacoesDoDestino(disp.destino.id),
      ],
      [
        `/pacientes/${int.pacienteId}/situacao`,
        c.situacaoResumida,
        () => sit.situacaoHospitalar(int.pacienteId),
      ],
      [
        `/pacientes/${int.pacienteId}/historico-hospitalar`,
        c.historicoHospitalar,
        () => sit.historicoHospitalar(int.pacienteId),
      ],
      ['/situacoes', z.record(z.string(), c.situacaoResumida), () => sit.situacoesHospitalares()],
      ['/situacoes/etiquetas', z.record(z.string(), z.string()), () => sit.etiquetasHospitalares()],
      [
        `/medicos/${int.medicoResponsavelId}/vinculos`,
        c.vinculosMedico,
        () => sit.vinculosDoMedico(int.medicoResponsavelId),
      ],
      [
        '/indicadores/operacionais',
        c.indicadoresOperacionais,
        () => ind.obterIndicadoresOperacionais(),
      ],
      ['/indicadores/leitos', c.indicadoresLeitos, () => ind.obterIndicadoresLeitos()],
      ['/indicadores/emergencia', c.indicadoresEmergencia, () => ind.obterIndicadoresEmergencia()],
      ['/indicadores/estoque', c.resumoEstoque, () => ind.obterResumoEstoque()],
      [
        '/indicadores/internacoes?periodo=ano',
        z.array(c.pontoInternacao),
        () => ind.obterSerieInternacoes('ano'),
      ],
      ['/alertas', z.array(c.alertaOperacional), () => ind.listarAlertas()],
    ];
  };

  it('cada rota responde 200, no esquema, com o mesmo conteúdo do serviço', async () => {
    for (const [url, esquema, servico] of casos()) {
      const r = await chamar('GET', url);
      expect(r.status, url).toBe(200);
      expect(() => esquema.parse(r.corpo), url).not.toThrow();
      const direto = JSON.parse(JSON.stringify(await ler(api().banco.app, servico)));
      expect(r.corpo, url).toEqual(direto);
    }
  });
});

describe('versão (R-API1)', () => {
  it('os registros vêm com ETag e respondem 304 à mesma versão', async () => {
    const leito = repoLeitos.todos()[0]!;
    for (const url of [
      `/leitos/${leito.id}`,
      `/internacoes/${repoInternacoes.todos()[0]!.id}`,
      `/atendimentos/${repoAtendimentos.todos()[0]!.id}`,
      `/medicamentos/${MEDICAMENTO}`,
      `/dispensacoes/${repoDispensacoes.todos()[0]!.id}`,
    ]) {
      const r = await chamar('GET', url);
      expect(r.etag, url).toMatch(/^"v\d+"$/);
      expect((await chamar('GET', url, { seNao: r.etag })).status, url).toBe(304);
    }
  });

  it('gravação sem If-Match → 428; com a versão antiga → 412 com a atual; com a certa → 200 e ETag', async () => {
    const leito = repoLeitos.todos().find((l) => l.status === 'livre' && l.setorId === 'uti')!;
    const corpo = { motivo: 'Manutenção do monitor' };
    expect((await chamar('POST', `/leitos/${leito.id}/bloquear`, { corpo })).status).toBe(428);
    const antiga = await chamar('POST', `/leitos/${leito.id}/bloquear`, {
      corpo,
      versao: `"v${leito.versao + 5}"`,
    });
    expect(antiga.status).toBe(412);
    expect(antiga.corpo).toMatchObject({ versaoAtual: leito.versao });
    const ok = await chamar('POST', `/leitos/${leito.id}/bloquear`, {
      corpo,
      versao: `"v${leito.versao}"`,
    });
    expect(ok.status).toBe(200);
    expect(ok.etag).toBe(`"v${leito.versao + 1}"`);
    expect(() => c.leito.parse(ok.corpo)).not.toThrow();
  });

  it('criação → 201 com ETag "v1"', async () => {
    const r = await chamar('POST', '/medicamentos', {
      corpo: {
        nome: 'Cefalexina',
        principioAtivo: 'Cefalexina',
        concentracao: '500 mg',
        forma: 'capsula',
        unidade: 'capsula',
        estoqueMinimo: 10,
      },
    });
    expect(r.status).toBe(201);
    expect(r.etag).toBe('"v1"');
    expect(() => c.medicamento.parse(r.corpo)).not.toThrow();
  });
});

describe('erros', () => {
  it('404 com a mensagem do domínio; 422 com os campos; 409 com o código', async () => {
    const n = await chamar('GET', '/leitos/nao-existe');
    expect(n.status).toBe(404);
    expect(n.corpo).toMatchObject({ codigo: 'nao_encontrado', mensagem: expect.any(String) });
    const v = await chamar('POST', '/atendimentos', { corpo: { queixa: '' } });
    expect(v.status).toBe(422);
    expect(v.corpo.campos).toBeDefined();
    const ocupado = repoLeitos.todos().find((l) => l.status === 'ocupado' && l.setorId === 'uti')!;
    const b = await chamar('POST', `/leitos/${ocupado.id}/bloquear`, {
      corpo: { motivo: 'Manutenção do monitor' },
      versao: `"v${ocupado.versao}"`,
    });
    expect(b.status).toBe(409);
    expect(b.corpo).toMatchObject({ codigo: expect.any(String) });
  });
});

describe('OpenAPI', () => {
  it('documenta as rotas dos módulos, com corpo nas gravações', async () => {
    const { corpo } = await chamar('GET', '/openapi.json');
    const caminhos = Object.keys(corpo.paths);
    for (const esperado of [
      '/api/v1/leitos',
      '/api/v1/leitos/compativeis',
      '/api/v1/internacoes/{id}/alta',
      '/api/v1/solicitacoes/{id}/reservar',
      '/api/v1/emergencia/fila',
      '/api/v1/atendimentos/{id}/triagem',
      '/api/v1/medicamentos/{id}/livro',
      '/api/v1/dispensacoes',
      '/api/v1/dispensacoes/{id}/itens/{indice}/devolucao',
      '/api/v1/indicadores/operacionais',
      '/api/v1/alertas',
    ]) {
      expect(caminhos).toContain(esperado);
    }
    expect(corpo.paths['/api/v1/internacoes'].post.requestBody).toBeDefined();
    expect(corpo.paths['/api/v1/dispensacoes'].post.requestBody).toBeDefined();
  });
});

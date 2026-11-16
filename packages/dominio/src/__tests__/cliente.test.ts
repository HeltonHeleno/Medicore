/** Fase 25 — Cliente HTTP dos cadastros: monta as requisições e devolve os erros do domínio. */
import { describe, expect, it, vi } from 'vitest';
import { criarClienteCadastros, type RequisicaoApi } from '../cliente/cadastros';
import { ErroConcorrencia, ErroConflito, ErroRede } from '../erros';

function cliente(resposta: { status: number; corpo: unknown } = { status: 200, corpo: null }) {
  const transporte = vi.fn(async (_r: RequisicaoApi) => resposta);
  return { c: criarClienteCadastros(transporte), transporte };
}

describe('cliente dos cadastros', () => {
  it('lista com filtros na query, sem os vazios', async () => {
    const { c, transporte } = cliente({ status: 200, corpo: { itens: [], total: 0 } });
    await c.listarPacientes({ busca: '', status: 'todos', pagina: 2 });
    expect(transporte).toHaveBeenCalledWith({
      metodo: 'GET',
      caminho: '/pacientes',
      consulta: { status: 'todos', pagina: 2 },
    });
  });

  it('edição manda a versão (If-Match) e o corpo', async () => {
    const { c, transporte } = cliente();
    await c.atualizarPaciente('pac-1', { nome: 'X' } as never, 3);
    await c.cancelarConsulta('con-1', 'Motivo bom', 2);
    expect(transporte.mock.calls.map(([r]) => r)).toEqual([
      expect.objectContaining({
        metodo: 'PUT',
        caminho: '/pacientes/pac-1',
        versao: 3,
        corpo: { nome: 'X' },
      }),
      expect.objectContaining({
        metodo: 'POST',
        caminho: '/consultas/con-1/cancelar',
        versao: 2,
        corpo: { motivo: 'Motivo bom' },
      }),
    ]);
  });

  it('ids e documentos vão codificados na URL', async () => {
    const { c, transporte } = cliente();
    await c.obterPaciente('pac/ä');
    await c.medicoComCrm('123456', 'SP');
    expect(transporte.mock.calls.map(([r]) => r.caminho)).toEqual([
      '/pacientes/pac%2F%C3%A4',
      '/medicos/crm/SP/123456',
    ]);
  });

  it('respostas embrulhadas viram o valor que os serviços do navegador devolvem', async () => {
    expect(await cliente({ status: 200, corpo: null }).c.cpfDisponivel('52998224725')).toBe(true);
    expect(
      await cliente({ status: 200, corpo: { id: 'x', nomeExibicao: 'X' } }).c.crmDisponivel(
        '1',
        'SP',
      ),
    ).toBe(false);
    expect(
      await cliente({ status: 200, corpo: { consultasCanceladas: 2 } }).c.inativarPaciente('p'),
    ).toBe(2);
    expect(
      await cliente({ status: 200, corpo: { temConsultas: true } }).c.pacienteTemConsultas('p'),
    ).toBe(true);
    expect(
      await cliente({ status: 200, corpo: { data: null } }).c.proximoDiaDisponivel(
        'm',
        '2026-11-10',
        30,
      ),
    ).toBeNull();
    expect(
      await cliente({ status: 200, corpo: { total: 3 } }).c.registrarEmLote(['a'], 'faltou'),
    ).toBe(3);
    await expect(
      cliente({ status: 204, corpo: null }).c.excluirPaciente('p'),
    ).resolves.toBeUndefined();
  });

  it('erros voltam como as classes do domínio', async () => {
    await expect(
      cliente({ status: 412, corpo: { codigo: 'versao', versaoAtual: 4 } }).c.reativarMedico('m'),
    ).rejects.toBeInstanceOf(ErroConcorrencia);
    await expect(
      cliente({
        status: 409,
        corpo: { codigo: 'medico_ocupado', mensagem: 'Ocupado', campo: 'hora' },
      }).c.agendarConsulta({} as never),
    ).rejects.toMatchObject({ codigo: 'medico_ocupado', campo: 'hora' });
    await expect(cliente({ status: 409, corpo: {} }).c.marcarFalta('x')).rejects.toBeInstanceOf(
      ErroConflito,
    );
    await expect(cliente({ status: 503, corpo: '' }).c.indicadoresPainel()).rejects.toBeInstanceOf(
      ErroRede,
    );
  });
});

describe('todas as funções do cliente chamam uma rota da API', () => {
  it('cada função monta uma requisição com método e caminho', async () => {
    const { c, transporte } = cliente({ status: 200, corpo: {} });
    const chamadas: [keyof typeof c, unknown[]][] = [
      ['listarPacientes', []],
      ['obterPaciente', ['p']],
      ['pacienteComCpf', ['52998224725', 'p']],
      ['consultasFuturasDoPaciente', ['p']],
      ['pendenciasDoPaciente', ['p']],
      ['criarPaciente', [{}]],
      ['reativarPaciente', ['p']],
      ['listarDepartamentos', []],
      ['listarMedicos', [{ ordenarPor: 'departamento' }]],
      ['obterMedico', ['m']],
      ['consultasFuturasDoMedico', ['m']],
      ['consultasAfetadas', ['m', {}]],
      ['pendenciasDoMedico', ['m']],
      ['criarMedico', [{}]],
      ['atualizarMedico', ['m', {}, 1]],
      ['inativarMedico', ['m', 'motivo']],
      ['listarConsultas', [{ pendentes: true }]],
      ['obterConsulta', ['c']],
      ['horariosLivres', ['m', '2026-11-10', 30, 'p', 'c']],
      ['reagendarConsulta', ['c', {}, 2]],
      ['concluirConsulta', ['c']],
      ['listarAtividades', []],
    ];
    for (const [nome, args] of chamadas) {
      await (c[nome] as (...a: unknown[]) => Promise<unknown>)(...args);
    }
    const caminhos = transporte.mock.calls.map(([r]) => `${r.metodo} ${r.caminho}`);
    expect(caminhos).toHaveLength(chamadas.length);
    expect(caminhos).toEqual(
      expect.arrayContaining([
        'GET /departamentos',
        'POST /medicos/m/consultas-afetadas',
        'GET /atividades',
      ]),
    );
    expect(transporte.mock.calls.find(([r]) => r.caminho === '/atividades')![0].consulta).toEqual({
      limite: 10,
    });
  });
});

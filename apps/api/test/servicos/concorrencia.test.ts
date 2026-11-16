/**
 * 25.T.2 — Concorrência real: várias requisições ao mesmo tempo, cada uma na sua conexão e na
 * sua transação do banco (o que o navegador simulava com duas abas).
 */
import { ErroConcorrencia, ErroConflito } from '@medicore/dominio/erros';
import type { EntradaAgendamento } from '@medicore/dominio/schemas/consulta';
import type { EntradaPaciente } from '@medicore/dominio/schemas/paciente';
import { erroDe, usarApi } from '../apoio/cliente';

const { cliente, ler } = usarApi('2026-11-09T08:00:00-03:00'); // segunda-feira

const PAULO = 'med-paulo-mendes';
const FERNANDA = 'med-fernanda-lima';

const consulta = (extra: Partial<EntradaAgendamento> = {}): EntradaAgendamento => ({
  pacienteId: 'pac-ana-silva',
  medicoId: PAULO,
  data: '2026-11-24',
  hora: '10:00',
  duracaoMin: 30,
  tipo: 'retorno',
  ...extra,
});

/** Resultado de cada promessa: o valor ou o erro. */
const todas = (promessas: Promise<unknown>[]) =>
  Promise.all(
    promessas.map((p) =>
      p.then(
        (v) => ({ ok: v }),
        (e: unknown) => ({ erro: e }),
      ),
    ),
  );

describe('agenda (A1/A2) com gravações simultâneas', () => {
  it('cinco pessoas agendam o mesmo horário do médico: uma consegue, as outras recebem E-04', async () => {
    const pacientesLivres = [
      'pac-ana-silva',
      'pac-joao-pereira',
      'pac-lucas-ferreira',
      'pac-mariana-alves',
      'pac-sofia-correia',
    ];
    const r = await todas(
      pacientesLivres.map((pacienteId) => cliente.agendarConsulta(consulta({ pacienteId }))),
    );
    expect(r.filter((x) => 'ok' in x)).toHaveLength(1);
    const erros = r.filter((x): x is { erro: unknown } => 'erro' in x).map((x) => x.erro);
    expect(erros).toHaveLength(4);
    for (const erro of erros) {
      expect(erro).toBeInstanceOf(ErroConflito);
      expect(erro).toMatchObject({ codigo: 'medico_ocupado', campo: 'hora' });
    }
    const doHorario = (await ler.consultas()).filter(
      (c) =>
        c.medicoId === PAULO && c.status === 'agendada' && c.inicio === '2026-11-24T13:00:00.000Z',
    );
    expect(doHorario).toHaveLength(1);
  });

  it('o mesmo paciente com dois médicos no mesmo horário: um agendamento recebe R-C4', async () => {
    const r = await todas([
      cliente.agendarConsulta(consulta({ medicoId: PAULO })),
      cliente.agendarConsulta(consulta({ medicoId: FERNANDA })),
    ]);
    expect(r.filter((x) => 'ok' in x)).toHaveLength(1);
    expect(r.find((x) => 'erro' in x)).toMatchObject({ erro: { codigo: 'paciente_ocupado' } });
  });

  it('reagendar para um horário que outra pessoa acabou de ocupar: E-04', async () => {
    const a = await cliente.agendarConsulta(consulta({ hora: '09:00' }));
    const r = await todas([
      cliente.agendarConsulta(consulta({ pacienteId: 'pac-joao-pereira', hora: '11:00' })),
      cliente.reagendarConsulta(a.id, consulta({ hora: '11:00' }), a.versao),
    ]);
    expect(r.filter((x) => 'ok' in x)).toHaveLength(1);
    expect(r.find((x) => 'erro' in x)).toMatchObject({
      erro: { codigo: expect.stringMatching(/_ocupado$/) },
    });
  });

  it('agendar enquanto outra pessoa inativa o médico: nunca sobra consulta futura de médico inativo', async () => {
    // Sem consultas futuras do Dr. Paulo, a inativação pode acontecer.
    for (const c of await ler.consultas()) {
      if (c.medicoId === PAULO && c.status === 'agendada' && new Date(c.inicio) >= new Date()) {
        await cliente.cancelarConsulta(c.id, 'Agenda fechada', c.versao);
      }
    }
    await todas([cliente.inativarMedico(PAULO, 'Licença'), cliente.agendarConsulta(consulta())]);
    const medico = (await ler.medico(PAULO))!;
    const futuras = (await ler.consultas()).filter(
      (c) => c.medicoId === PAULO && c.status === 'agendada' && new Date(c.inicio) >= new Date(),
    );
    // Ou o médico ficou ativo com a consulta, ou ficou inativo sem ela (R-M2).
    expect(medico.ativo ? futuras.length : 0).toBe(futuras.length);
    expect(medico.ativo || futuras.length === 0).toBe(true);
  });
});

describe('versão (R-G1) com gravações simultâneas', () => {
  const entrada = (nome: string): EntradaPaciente => ({
    nome,
    cpf: '529.982.247-25',
    dataNascimento: '1990-01-01',
    sexo: 'feminino',
    telefone: '(11) 98765-4321',
    convenio: { tipo: 'particular' },
    consentimentoLgpd: true,
  });

  it('duas edições do mesmo paciente com a mesma versão: uma grava, a outra recebe 412', async () => {
    const p = await cliente.criarPaciente(entrada('Teste Original'));
    const r = await todas([
      cliente.atualizarPaciente(p.id, entrada('Teste Primeira'), p.versao),
      cliente.atualizarPaciente(p.id, entrada('Teste Segunda'), p.versao),
    ]);
    expect(r.filter((x) => 'ok' in x)).toHaveLength(1);
    const erro = r.find((x): x is { erro: unknown } => 'erro' in x)!.erro as ErroConcorrencia;
    expect(erro).toBeInstanceOf(ErroConcorrencia);
    expect(erro.versaoAtual).toBe(2);
    expect((await cliente.obterPaciente(p.id)).versao).toBe(2);
  });

  it('dois cadastros com o mesmo CPF ao mesmo tempo: um grava, o outro recebe cpf_duplicado', async () => {
    const r = await todas([
      cliente.criarPaciente(entrada('Teste Um')),
      cliente.criarPaciente(entrada('Teste Dois')),
    ]);
    expect(r.filter((x) => 'ok' in x)).toHaveLength(1);
    expect(r.find((x) => 'erro' in x)).toMatchObject({
      erro: { codigo: 'cpf_duplicado', campo: 'cpf' },
    });
  });

  it('baixa em lote ao mesmo tempo que um registro avulso: uma só vale (P13)', async () => {
    const pendentes = await cliente.listarConsultas({ pendentes: true });
    const ids = pendentes.slice(0, 2).map((c) => c.id);
    expect(ids).toHaveLength(2);
    const r = await todas([
      cliente.registrarEmLote(ids, 'concluida'),
      cliente.marcarFalta(ids[1]!),
    ]);
    expect(r.filter((x) => 'ok' in x)).toHaveLength(1);
    const status = await Promise.all(ids.map(async (id) => (await ler.consulta(id))!.status));
    expect(new Set(status).size === 1 || status[1] === 'faltou').toBe(true);
    expect(await erroDe(cliente.concluirConsulta(ids[1]!))).toMatchObject({
      codigo: 'transicao_invalida',
    });
  });
});

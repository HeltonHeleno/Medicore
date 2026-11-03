import { repoAtividades, repoConsultas, repoPacientes } from '../services/colecoes';
import {
  repoAtendimentos,
  repoInternacoes,
  repoSolicitacoes,
} from '../services/colecoes-operacoes';
import { agendarConsulta, concluirConsulta } from '../services/consultas';
import { chamar, encerrar, reabrir, registrarChegada, triar } from '../services/emergencia';
import { darAlta, desfazerAlta, internar, solicitarLeitoEletivo } from '../services/leitos';
import { inativarMedico, pendenciasDoMedico } from '../services/medicos';
import {
  criarPaciente,
  excluirPaciente,
  inativarPaciente,
  pendenciasDoPaciente,
} from '../services/pacientes';
import { situacaoHospitalar } from '../services/situacao-hospitalar';
import {
  agoraIso,
  esperarConsistente,
  leitoLivre,
  medicoClinico,
  MEDICO_EMERGENCIA,
  pacienteLivre,
  prepararOperacoes,
} from './utils/operacoes';
import { ajustarRelogio, erroDe } from './utils/servicos';

prepararOperacoes('2026-11-10T10:30:00-03:00');

const internacaoAtiva = () =>
  repoInternacoes
    .todos()
    .filter((i) => i.status === 'ativa')
    .sort((a, b) => a.id.localeCompare(b.id))[0];

async function internarNovo(pacienteId: string) {
  return internar({
    pacienteId,
    origem: 'eletiva',
    precaucao: 'padrao',
    leitoId: leitoLivre('enfermaria', { isolamento: false }).id,
    medicoResponsavelId: medicoClinico().id,
    motivo: 'Pneumonia',
    inicio: agoraIso(),
  });
}

describe('R-X2 — inativar paciente', () => {
  it('bloqueado com internação ativa (E-17 com o link)', async () => {
    const int = internacaoAtiva();
    expect(await pendenciasDoPaciente(int.pacienteId)).toEqual([
      expect.objectContaining({ tipo: 'internacao', id: int.id }),
    ]);
    const erro = await erroDe(inativarPaciente(int.pacienteId));
    expect(erro).toMatchObject({
      codigo: 'pendencias_modulos',
      detalhes: { itens: [expect.objectContaining({ id: int.id })] },
    });
    expect(repoPacientes.obter(int.pacienteId)?.ativo).toBe(true);
  });

  it('bloqueado com atendimento aberto; liberado depois do desfecho', async () => {
    const p = pacienteLivre();
    const a = await registrarChegada({
      pacienteId: p.id,
      modoChegada: 'meios_proprios',
      queixa: 'Febre alta',
      chegadaEm: agoraIso(),
    });
    expect(await erroDe(inativarPaciente(p.id))).toMatchObject({ codigo: 'pendencias_modulos' });
    ajustarRelogio('2026-11-10T11:10:00-03:00');
    await encerrar(a.id, { tipo: 'evasao', em: agoraIso() }, a.versao);
    expect(await inativarPaciente(p.id)).toBe(0);
  });
});

describe('R-X3 — excluir paciente', () => {
  it('quem teve atendimento não é excluído; quem não teve nada, sim', async () => {
    const p = await criarPaciente({
      nome: 'Teste Exclusão',
      cpf: '529.982.247-25',
      dataNascimento: '1990-01-01',
      sexo: 'feminino',
      telefone: '(11) 98765-4321',
      convenio: { tipo: 'particular' },
      consentimentoLgpd: true,
    });
    const a = await registrarChegada({
      pacienteId: p.id,
      modoChegada: 'meios_proprios',
      queixa: 'Tontura',
      chegadaEm: agoraIso(),
    });
    ajustarRelogio('2026-11-10T11:10:00-03:00');
    await encerrar(a.id, { tipo: 'evasao', em: agoraIso() }, a.versao);
    expect(await erroDe(excluirPaciente(p.id))).toMatchObject({ codigo: 'tem_historico' });

    const q = await criarPaciente({
      nome: 'Teste Sem Histórico',
      cpf: '111.444.777-35',
      dataNascimento: '1990-01-01',
      sexo: 'masculino',
      telefone: '(11) 98765-4322',
      convenio: { tipo: 'particular' },
      consentimentoLgpd: true,
    });
    await excluirPaciente(q.id);
    expect(repoPacientes.obter(q.id)).toBeUndefined();
  });
});

describe('R-X4 — inativar médico', () => {
  /** Tira as consultas do médico, para isolar a R-X4 da R-M2 (consultas futuras). */
  const semConsultas = (medicoId: string) =>
    repoConsultas.substituirTodos(repoConsultas.todos().filter((c) => c.medicoId !== medicoId));

  it('responsável por internação ativa', async () => {
    const int = internacaoAtiva();
    expect((await pendenciasDoMedico(int.medicoResponsavelId)).length).toBeGreaterThan(0);
    semConsultas(int.medicoResponsavelId);
    expect(await erroDe(inativarMedico(int.medicoResponsavelId))).toMatchObject({
      codigo: 'pendencias_modulos',
    });
  });

  it('com atendimento aberto', async () => {
    semConsultas(MEDICO_EMERGENCIA);
    expect(await erroDe(inativarMedico(MEDICO_EMERGENCIA))).toMatchObject({
      codigo: 'pendencias_modulos',
    });
  });

  it('cardiologista sem pendências nos módulos (os fluxos de consulta continuam valendo)', async () => {
    expect(await pendenciasDoMedico('med-rafael-costa')).toEqual([]);
  });
});

describe('R-X7 — óbito', () => {
  it('alta por óbito: inativa, cancela só as consultas futuras e grava a atividade', async () => {
    const p = pacienteLivre();
    const passada = await agendarConsulta({
      pacienteId: p.id,
      medicoId: 'med-paulo-mendes',
      data: '2026-11-24',
      hora: '09:00',
      duracaoMin: 30,
      tipo: 'retorno',
    });
    const futura = await agendarConsulta({
      pacienteId: p.id,
      medicoId: 'med-paulo-mendes',
      data: '2026-11-26',
      hora: '09:00',
      duracaoMin: 30,
      tipo: 'retorno',
    });
    ajustarRelogio('2026-11-24T10:00:00-03:00');
    await concluirConsulta(passada.id);
    const int = await internarNovo(p.id);
    const r = await darAlta(int.id, { tipo: 'obito', em: agoraIso() }, int.versao);
    expect(r.consultasCanceladas).toBe(1);
    expect(repoPacientes.obter(p.id)).toMatchObject({
      ativo: false,
      motivoInativacao: 'Óbito em 24/11/2026',
      obito: { referencia: { tipo: 'internacao', id: int.id } },
    });
    expect(repoConsultas.obter(futura.id)).toMatchObject({
      status: 'cancelada',
      motivoCancelamento: 'Óbito do paciente',
    });
    expect(repoConsultas.obter(passada.id)?.status).toBe('concluida');
    expect(repoAtividades.todos().some((a) => a.tipo === 'obito_registrado')).toBe(true);
    // Não aparece para nova chegada nem internação.
    expect(
      await erroDe(
        registrarChegada({
          pacienteId: p.id,
          modoChegada: 'samu',
          queixa: 'Teste',
          chegadaEm: agoraIso(),
        }),
      ),
    ).toMatchObject({
      codigo: 'paciente_inativo',
    });
    esperarConsistente();

    // Desfazer o óbito reativa; as consultas não voltam.
    const d = await desfazerAlta(int.id, 'Registro de óbito equivocado', r.internacao.versao);
    expect(d.obitoDesfeito).toBe(true);
    expect(repoPacientes.obter(p.id)).toMatchObject({ ativo: true, obito: undefined });
    expect(repoConsultas.obter(futura.id)?.status).toBe('cancelada');
    esperarConsistente();
  });

  it('desfecho óbito na emergência; reabrir reativa', async () => {
    const p = pacienteLivre();
    const a = await registrarChegada({
      pacienteId: p.id,
      modoChegada: 'samu',
      queixa: 'Parada',
      chegadaEm: agoraIso(),
    });
    const t = await triar(
      a.id,
      { risco: 'vermelho', profissional: 'Enf. Teste', sinais: {} },
      a.versao,
    );
    const c = await chamar(a.id, MEDICO_EMERGENCIA, t.versao);
    const { atendimento } = await encerrar(a.id, { tipo: 'obito', em: agoraIso() }, c.versao);
    expect(repoPacientes.obter(p.id)?.obito?.referencia).toEqual({ tipo: 'atendimento', id: a.id });
    esperarConsistente();
    const r = await reabrir(a.id, 'Óbito registrado no atendimento errado', atendimento.versao);
    expect(r.obitoDesfeito).toBe(true);
    expect(repoPacientes.obter(p.id)?.ativo).toBe(true);
    esperarConsistente();
  });

  it('óbito cancela o pedido de leito eletivo em aberto', async () => {
    const p = pacienteLivre();
    const s = await solicitarLeitoEletivo({
      pacienteId: p.id,
      setorDesejado: 'apartamento',
      precaucao: 'padrao',
      dataPrevista: '2026-11-12',
      motivo: 'Cirurgia',
    });
    const a = await registrarChegada({
      pacienteId: p.id,
      modoChegada: 'samu',
      queixa: 'Parada',
      chegadaEm: agoraIso(),
      emergenciaImediata: true,
    });
    await encerrar(a.id, { tipo: 'obito', em: agoraIso() }, a.versao);
    expect(repoSolicitacoes.obter(s.id)?.status).toBe('cancelada');
    esperarConsistente();
  });
});

describe('R-X8 — situação hospitalar', () => {
  it('internado, em atendimento e sem situação', async () => {
    const int = internacaoAtiva();
    expect((await situacaoHospitalar(int.pacienteId)).internacao?.id).toBe(int.id);
    const aberto = repoAtendimentos
      .todos()
      .find((a) => a.status === 'em_atendimento' && a.pacienteId)!;
    expect((await situacaoHospitalar(aberto.pacienteId!)).atendimento?.numero).toBe(aberto.numero);
    expect(await situacaoHospitalar(pacienteLivre().id)).toEqual({});
  });
});

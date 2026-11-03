/**
 * 15.17 / M15, M33 — operações aleatórias com semente fixa sobre os dados de exemplo.
 * Depois de CADA operação, `verificarConsistencia()` precisa voltar vazia. Os erros de regra
 * esperados (validação, conflito, concorrência) contam como "a regra funcionou"; qualquer
 * outro erro, ou uma violação, falha mostrando a semente e a operação para reproduzir.
 */
import { criarAleatorio } from '../data/seeds/gerador';
import { repoMedicos, repoPacientes } from '../services/colecoes';
import {
  repoAtendimentos,
  repoDispensacoes,
  repoInternacoes,
  repoLeitos,
  repoLotes,
  repoMedicamentos,
  repoSolicitacoes,
  retratoAtual,
} from '../services/colecoes-operacoes';
import * as emergencia from '../services/emergencia';
import {
  ErroConcorrencia,
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../services/erros';
import * as farmacia from '../services/farmacia';
import * as leitos from '../services/leitos';
import { inativarPaciente } from '../services/pacientes';
import { executarRetencao } from '../services/retencao';
import type { CorRisco } from '../types';
import { verificarConsistencia } from '../utils/consistencia';
import { hojeNoFuso, somarDias } from '../utils/datas';
import { agora } from '../utils/relogio';
import { prepararOperacoes } from './utils/operacoes';

prepararOperacoes('2026-11-10T10:30:00-03:00');

const ESPERADOS = [ErroValidacao, ErroConflito, ErroConcorrencia, ErroNaoEncontrado];
const CORES: CorRisco[] = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'];

async function rodar(semente: number, quantidade: number) {
  const rand = criarAleatorio(semente);
  const um = <T>(lista: readonly T[]): T | undefined => lista[Math.floor(rand() * lista.length)];
  const iso = () => agora().toISOString();
  const medico = () => um(repoMedicos.todos().filter((m) => m.ativo))!.id;
  const pacienteAtivo = () => um(repoPacientes.todos().filter((p) => p.ativo))?.id ?? '';
  const leitoLivre = (setor?: string) =>
    um(
      repoLeitos
        .todos()
        .filter(
          (l) => l.status === 'livre' && (setor ? l.setorId === setor : l.setorId !== 'observacao'),
        ),
    );
  const ativas = () => repoInternacoes.todos().filter((i) => i.status === 'ativa');
  const abertos = (status?: string) =>
    repoAtendimentos
      .todos()
      .filter((a) => a.status !== 'encerrado' && (!status || a.status === status));
  const sinais = () => ({ fc: 50 + Math.floor(rand() * 100), spo2: 85 + Math.floor(rand() * 15) });
  const medicamento = () => um(repoMedicamentos.todos())!;

  const operacoes: [string, () => Promise<unknown>][] = [
    [
      'internar',
      async () => {
        const l = leitoLivre();
        return leitos.internar({
          pacienteId: pacienteAtivo(),
          origem: 'eletiva',
          precaucao: rand() < 0.8 ? 'padrao' : 'contato',
          leitoId: l?.id ?? '',
          medicoResponsavelId: medico(),
          motivo: 'Teste aleatório',
          inicio: iso(),
          ...(rand() < 0.5 ? { justificativa: 'Exceção no teste aleatório' } : {}),
        });
      },
    ],
    [
      'transferir',
      async () => {
        const i = um(ativas());
        return (
          i &&
          leitos.transferir(
            i.id,
            {
              leitoDestinoId: leitoLivre()?.id ?? '',
              motivo: 'Teste',
              justificativa: 'Exceção no teste aleatório',
            },
            i.versao,
          )
        );
      },
    ],
    [
      'darAlta',
      async () => {
        const i = um(ativas());
        return (
          i &&
          leitos.darAlta(i.id, { tipo: rand() < 0.1 ? 'obito' : 'melhorada', em: iso() }, i.versao)
        );
      },
    ],
    [
      'desfazerAlta',
      async () => {
        const i = um(
          repoInternacoes.todos().filter((x) => x.status === 'encerrada' && !x.arquivado),
        );
        return i && leitos.desfazerAlta(i.id, 'Teste aleatório', i.versao);
      },
    ],
    [
      'concluirHigienizacao',
      async () => {
        const l = um(repoLeitos.todos().filter((x) => x.status === 'higienizacao'));
        return l && leitos.concluirHigienizacao([{ id: l.id, versao: l.versao }]);
      },
    ],
    [
      'bloquear',
      async () => {
        const l = um(
          repoLeitos.todos().filter((x) => x.status === 'livre' || x.status === 'higienizacao'),
        );
        return l && leitos.bloquear(l.id, { motivo: 'Manutenção' }, l.versao);
      },
    ],
    [
      'desbloquear',
      async () => {
        const l = um(repoLeitos.todos().filter((x) => x.status === 'bloqueado'));
        return l && leitos.desbloquear(l.id, l.versao);
      },
    ],
    [
      'editarInternacao',
      async () => {
        const i = um(ativas());
        return (
          i &&
          leitos.editarInternacao(
            i.id,
            {
              medicoResponsavelId: medico(),
              precaucao: i.precaucao,
              motivo: 'Motivo editado',
              previsaoAlta: somarDias(hojeNoFuso(), 3),
            },
            i.versao,
          )
        );
      },
    ],
    [
      'solicitarEletivo',
      async () =>
        leitos.solicitarLeitoEletivo({
          pacienteId: pacienteAtivo(),
          setorDesejado: um(['uti', 'enfermaria', 'apartamento'] as const)!,
          precaucao: 'padrao',
          dataPrevista: hojeNoFuso(),
          motivo: 'Cirurgia',
        }),
    ],
    [
      'reservar',
      async () => {
        const s = um(
          repoSolicitacoes
            .todos()
            .filter((x) => x.status === 'pendente' || x.status === 'reservada'),
        );
        return s && leitos.reservarLeito(s.id, leitoLivre(s.setorDesejado)?.id ?? '', s.versao);
      },
    ],
    [
      'cancelarSolicitacao',
      async () => {
        const s = um(
          repoSolicitacoes
            .todos()
            .filter((x) => x.status === 'pendente' || x.status === 'reservada'),
        );
        return (
          s &&
          (rand() < 0.5 && s.status === 'reservada'
            ? leitos.cancelarReserva(s.id, s.versao)
            : leitos.cancelarSolicitacao(s.id, 'Teste aleatório', s.versao))
        );
      },
    ],
    [
      'internarPeloPedido',
      async () => {
        const s = um(
          repoSolicitacoes
            .todos()
            .filter((x) => x.status === 'pendente' || x.status === 'reservada'),
        );
        if (!s) return;
        return leitos.internar({
          pacienteId: s.pacienteId,
          origem: s.atendimentoId ? 'emergencia' : 'eletiva',
          solicitacaoId: s.id,
          precaucao: s.precaucao,
          leitoId: s.leitoReservadoId ?? leitoLivre(s.setorDesejado)?.id ?? '',
          medicoResponsavelId: medico(),
          motivo: s.motivo || 'Teste',
          inicio: iso(),
          justificativa: 'Exceção no teste aleatório',
        });
      },
    ],
    [
      'chegada',
      async () =>
        emergencia.registrarChegada(
          rand() < 0.7
            ? {
                pacienteId: pacienteAtivo(),
                modoChegada: 'samu',
                queixa: 'Teste aleatório',
                chegadaEm: iso(),
                emergenciaImediata: rand() < 0.1,
              }
            : {
                provisorio: {
                  descricao: 'Paciente sem identificação',
                  sexo: 'outro',
                  idadeAproximada: 30,
                },
                modoChegada: 'samu',
                queixa: 'Teste',
                chegadaEm: iso(),
              },
        ),
    ],
    [
      'triar',
      async () => {
        const a = um(abertos());
        return (
          a &&
          emergencia.triar(
            a.id,
            {
              risco: um(CORES)!,
              profissional: 'Enf. Teste',
              sinais: sinais(),
              justificativa: 'Justificativa do teste aleatório',
            },
            a.versao,
          )
        );
      },
    ],
    [
      'reavaliar',
      async () => {
        const a = um(abertos());
        return a && emergencia.reavaliar(a.id, { sinais: sinais() }, a.versao);
      },
    ],
    [
      'chamar',
      async () => {
        const a = um(abertos('aguardando_atendimento'));
        return a && emergencia.chamar(a.id, medico(), a.versao);
      },
    ],
    [
      'observacao',
      async () => {
        const a = um(abertos('em_atendimento'));
        return (
          a && emergencia.colocarEmObservacao(a.id, leitoLivre('observacao')?.id ?? '', a.versao)
        );
      },
    ],
    [
      'retomar',
      async () => {
        const a = um(abertos('em_observacao'));
        return a && emergencia.retomarAtendimento(a.id, a.versao);
      },
    ],
    [
      'pedirLeito',
      async () => {
        const a = um([...abertos('em_atendimento'), ...abertos('em_observacao')]);
        return (
          a &&
          emergencia.solicitarLeito(
            a.id,
            {
              setorDesejado: um(['uti', 'enfermaria'] as const)!,
              precaucao: 'padrao',
              motivo: 'Teste',
            },
            a.versao,
          )
        );
      },
    ],
    [
      'encerrar',
      async () => {
        const a = um(abertos());
        if (!a) return;
        const opcoes = emergencia.desfechosPermitidos(a.status);
        return emergencia.encerrar(
          a.id,
          { tipo: um(opcoes) ?? 'alta', em: iso(), hospitalDestino: 'Hospital Teste' },
          a.versao,
        );
      },
    ],
    [
      'reabrir',
      async () => {
        const a = um(
          repoAtendimentos.todos().filter((x) => x.status === 'encerrado' && !x.arquivado),
        );
        return (
          a && emergencia.reabrir(a.id, 'Teste aleatório', a.versao, leitoLivre('observacao')?.id)
        );
      },
    ],
    [
      'vincular',
      async () => {
        const a = um(abertos().filter((x) => !x.pacienteId));
        return a && emergencia.vincularPaciente(a.id, pacienteAtivo(), a.versao);
      },
    ],
    [
      'entrada',
      async () =>
        farmacia.registrarEntrada({
          medicamentoId: medicamento().id,
          numero: `R${Math.floor(rand() * 1e6)}`,
          validade: somarDias(hojeNoFuso(), 200),
          quantidade: 1 + Math.floor(rand() * 50),
        }),
    ],
    [
      'dispensar',
      async () => {
        const i = um(ativas());
        const a = um(abertos().filter((x) => x.pacienteId));
        const pacienteId = rand() < 0.7 ? i?.pacienteId : a?.pacienteId;
        const m = medicamento();
        return farmacia.dispensar({
          pacienteId: pacienteId ?? '',
          medicoSolicitanteId: medico(),
          itens: [{ medicamentoId: m.id, quantidade: 1 + Math.floor(rand() * 8) }],
          alertasConfirmados: [
            {
              tipo: 'alergia',
              medicamentoId: m.id,
              justificativa: 'Confirmado no teste aleatório',
            },
            { tipo: 'controlado', medicamentoId: m.id },
          ],
        });
      },
    ],
    [
      'devolver',
      async () => {
        const d = um(
          repoDispensacoes
            .todos()
            .filter((x) => x.status === 'realizada' && !x.arquivado && x.itens.length > 0),
        );
        return (
          d && farmacia.devolver(d.id, 0, { quantidade: 1, motivo: 'Não utilizado' }, d.versao)
        );
      },
    ],
    [
      'estornar',
      async () => {
        const d = um(
          repoDispensacoes.todos().filter((x) => x.status === 'realizada' && !x.arquivado),
        );
        return d && farmacia.estornar(d.id, 'Duplicidade', d.versao);
      },
    ],
    [
      'ajustar',
      async () => {
        const l = um(repoLotes.todos());
        return (
          l &&
          farmacia.ajustar(
            l.id,
            {
              tipo: um(['ajuste_positivo', 'ajuste_negativo', 'perda'] as const)!,
              quantidade: 1 + Math.floor(rand() * 5),
              motivo: 'Inventário do teste aleatório',
            },
            l.versao,
          )
        );
      },
    ],
    [
      'bloquearLote',
      async () => {
        const l = um(repoLotes.todos());
        return (
          l &&
          (l.bloqueio
            ? farmacia.desbloquearLote(l.id, l.versao)
            : farmacia.bloquearLote(l.id, { motivo: 'Quarentena' }, l.versao))
        );
      },
    ],
    [
      'descartar',
      async () => {
        const vencidos = repoLotes
          .todos()
          .filter((l) => l.validade < hojeNoFuso() && l.quantidadeAtual > 0);
        return (
          vencidos.length &&
          farmacia.descartarVencidos({
            loteIds: vencidos.map((l) => l.id),
            motivo: 'Validade expirada',
            termo: 'T-1',
          })
        );
      },
    ],
    ['inativarPaciente', async () => inativarPaciente(pacienteAtivo())],
  ];

  const contagem = { ok: 0, regra: 0 };
  for (let n = 1; n <= quantidade; n++) {
    vi.setSystemTime(new Date(agora().getTime() + (1 + Math.floor(rand() * 30)) * 60_000));
    if (n % 100 === 0) executarRetencao();
    const [nome, op] = operacoes[Math.floor(rand() * operacoes.length)];
    try {
      await op();
      contagem.ok++;
    } catch (e) {
      if (!ESPERADOS.some((Classe) => e instanceof Classe)) {
        throw new Error(
          `Semente ${semente}, operação ${n} (${nome}): erro inesperado: ${String(e)}`,
        );
      }
      contagem.regra++;
    }
    const violacoes = verificarConsistencia(retratoAtual(), agora().getTime());
    if (violacoes.length > 0) {
      throw new Error(
        `Semente ${semente}, operação ${n} (${nome}): ${JSON.stringify(violacoes.slice(0, 3))}`,
      );
    }
  }
  return contagem;
}

describe('invariantes com operações aleatórias (500 por semente)', () => {
  for (const semente of [11, 2026, 1510]) {
    it(`semente ${semente}`, async () => {
      const r = await rodar(semente, 500);
      // As duas coisas acontecem: operações aceitas e regras recusando o que não vale.
      expect(r.ok).toBeGreaterThan(100);
      expect(r.regra).toBeGreaterThan(20);
    }, 120_000);
  }
});

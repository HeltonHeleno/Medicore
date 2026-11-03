import {
  esquemaChegada,
  esquemaDesfecho,
  esquemaSinais,
  esquemaTriagem,
} from '../schemas/emergencia';
import { esquemaDispensacao, esquemaEntrada, esquemaMedicamento } from '../schemas/farmacia';
import {
  esquemaAlta,
  esquemaBloqueioLeito,
  esquemaInternacao,
  esquemaSolicitacaoEletiva,
} from '../schemas/internacao';

const AGORA = '2026-11-10T13:30:00.000Z'; // 10:30 em Brasília

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(AGORA));
});
afterEach(() => vi.useRealTimers());

const erros = (r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));

describe('esquemas da Gestão de leitos', () => {
  const internacao = {
    pacienteId: 'p1',
    origem: 'eletiva',
    precaucao: 'padrao',
    leitoId: 'l1',
    medicoResponsavelId: 'm1',
    motivo: 'Pneumonia',
    inicio: AGORA,
  };

  it('internação válida; transferência sem hospital; início futuro e antigo; previsão antes do início', () => {
    expect(esquemaInternacao.safeParse(internacao).success).toBe(true);
    expect(
      erros(esquemaInternacao.safeParse({ ...internacao, origem: 'transferencia_externa' })),
    ).toHaveProperty('hospitalOrigem');
    expect(
      erros(esquemaInternacao.safeParse({ ...internacao, inicio: '2026-11-10T15:00:00.000Z' })),
    ).toHaveProperty('inicio');
    expect(
      erros(esquemaInternacao.safeParse({ ...internacao, inicio: '2026-11-09T13:00:00.000Z' })),
    ).toHaveProperty('inicio');
    expect(
      erros(esquemaInternacao.safeParse({ ...internacao, previsaoAlta: '2026-11-09' })),
    ).toHaveProperty('previsaoAlta');
    expect(
      erros(esquemaInternacao.safeParse({ ...internacao, justificativa: 'curta' })),
    ).toHaveProperty('justificativa');
  });

  it('alta: transferência sem hospital; alta no futuro', () => {
    expect(esquemaAlta.safeParse({ tipo: 'melhorada', em: AGORA }).success).toBe(true);
    expect(erros(esquemaAlta.safeParse({ tipo: 'transferencia', em: AGORA }))).toHaveProperty(
      'hospitalDestino',
    );
    expect(
      erros(esquemaAlta.safeParse({ tipo: 'melhorada', em: '2026-11-11T13:30:00.000Z' })),
    ).toHaveProperty('em');
  });

  it('bloqueio: motivo com 5 a 200 caracteres', () => {
    expect(esquemaBloqueioLeito.safeParse({ motivo: 'Manutenção' }).success).toBe(true);
    expect(erros(esquemaBloqueioLeito.safeParse({ motivo: 'abc' }))).toHaveProperty('motivo');
  });

  it('pedido eletivo: data de hoje a 30 dias; amarelo exige justificativa', () => {
    const base = {
      pacienteId: 'p1',
      setorDesejado: 'uti',
      precaucao: 'padrao',
      dataPrevista: '2026-11-10',
      motivo: 'Cirurgia',
    };
    expect(esquemaSolicitacaoEletiva.safeParse(base).success).toBe(true);
    expect(
      erros(esquemaSolicitacaoEletiva.safeParse({ ...base, dataPrevista: '2026-11-09' })),
    ).toHaveProperty('dataPrevista');
    expect(
      erros(esquemaSolicitacaoEletiva.safeParse({ ...base, dataPrevista: '2026-12-11' })),
    ).toHaveProperty('dataPrevista');
    expect(
      erros(esquemaSolicitacaoEletiva.safeParse({ ...base, prioridade: 'amarelo' })),
    ).toHaveProperty('justificativaPrioridade');
  });
});

describe('esquemas da Emergência', () => {
  it('chegada: paciente ou provisório; idade 0–120; até 2 h retroativa', () => {
    const base = { modoChegada: 'samu', queixa: 'Dor torácica', chegadaEm: AGORA };
    expect(esquemaChegada.safeParse({ ...base, pacienteId: 'p1' }).success).toBe(true);
    expect(erros(esquemaChegada.safeParse(base))).toHaveProperty('pacienteId');
    const prov = { descricao: 'Homem, ~40 anos', sexo: 'masculino', idadeAproximada: 121 };
    expect(erros(esquemaChegada.safeParse({ ...base, provisorio: prov }))).toHaveProperty(
      'provisorio.idadeAproximada',
    );
    expect(
      esquemaChegada.safeParse({ ...base, provisorio: { ...prov, idadeAproximada: '' } }).success,
    ).toBe(true);
    expect(
      erros(
        esquemaChegada.safeParse({
          ...base,
          pacienteId: 'p1',
          chegadaEm: '2026-11-10T11:00:00.000Z',
        }),
      ),
    ).toHaveProperty('chegadaEm');
  });

  it('sinais vitais (R-E5): PAS ≤ PAD, SpO₂ 101, campos vazios aceitos', () => {
    expect(esquemaSinais.safeParse({ pas: 120, pad: 80, spo2: 98 }).success).toBe(true);
    expect(erros(esquemaSinais.safeParse({ pas: 80, pad: 80 }))).toHaveProperty('pas');
    expect(erros(esquemaSinais.safeParse({ spo2: 101 }))).toHaveProperty('spo2');
    expect(erros(esquemaSinais.safeParse({ fc: 251 }))).toHaveProperty('fc');
    expect(esquemaSinais.safeParse({ pas: '', fc: Number.NaN }).success).toBe(true);
  });

  it('retriagem menos grave sem justificativa', () => {
    const t = { risco: 'verde', profissional: 'Enf. Teste', sinais: {} };
    expect(esquemaTriagem().safeParse(t).success).toBe(true);
    expect(esquemaTriagem('laranja').safeParse({ ...t, risco: 'vermelho' }).success).toBe(true);
    expect(erros(esquemaTriagem('laranja').safeParse(t))).toHaveProperty('justificativa');
    expect(
      esquemaTriagem('laranja').safeParse({ ...t, justificativa: 'Melhora após medicação' })
        .success,
    ).toBe(true);
  });

  it('desfecho: transferência sem hospital; "internação" não é desfecho direto', () => {
    expect(erros(esquemaDesfecho.safeParse({ tipo: 'transferencia', em: AGORA }))).toHaveProperty(
      'hospitalDestino',
    );
    expect(esquemaDesfecho.safeParse({ tipo: 'internacao', em: AGORA }).success).toBe(false);
  });
});

describe('esquemas da Farmácia', () => {
  it('medicamento: mínimo inteiro ≥ 0; unidades por embalagem ≥ 1', () => {
    const m = {
      nome: 'Cefalexina',
      principioAtivo: 'Cefalexina',
      concentracao: '500 mg',
      forma: 'capsula',
      unidade: 'capsula',
      estoqueMinimo: 10,
    };
    expect(esquemaMedicamento.safeParse(m).success).toBe(true);
    expect(erros(esquemaMedicamento.safeParse({ ...m, estoqueMinimo: -1 }))).toHaveProperty(
      'estoqueMinimo',
    );
    expect(erros(esquemaMedicamento.safeParse({ ...m, unidadesPorEmbalagem: 0 }))).toHaveProperty(
      'unidadesPorEmbalagem',
    );
  });

  it('entrada: validade hoje aceita, ontem recusada; quantidade 0', () => {
    const e = { medicamentoId: 'm1', numero: 'L1', validade: '2026-11-10', quantidade: 5 };
    expect(esquemaEntrada.safeParse(e).success).toBe(true);
    expect(erros(esquemaEntrada.safeParse({ ...e, validade: '2026-11-09' }))).toHaveProperty(
      'validade',
    );
    expect(erros(esquemaEntrada.safeParse({ ...e, quantidade: 0 }))).toHaveProperty('quantidade');
    expect(erros(esquemaEntrada.safeParse({ ...e, quantidade: 1.5 }))).toHaveProperty('quantidade');
  });

  it('dispensação: 1 a 10 itens; alergia confirmada exige justificativa', () => {
    const item = { medicamentoId: 'm1', quantidade: 1 };
    const d = { pacienteId: 'p1', medicoSolicitanteId: 'm1', itens: [item] };
    expect(esquemaDispensacao.safeParse(d).success).toBe(true);
    expect(erros(esquemaDispensacao.safeParse({ ...d, itens: [] }))).toHaveProperty('itens');
    expect(
      erros(esquemaDispensacao.safeParse({ ...d, itens: Array(11).fill(item) })),
    ).toHaveProperty('itens');
    expect(
      erros(
        esquemaDispensacao.safeParse({
          ...d,
          alertasConfirmados: [{ tipo: 'alergia', medicamentoId: 'm1' }],
        }),
      ),
    ).toHaveProperty('alertasConfirmados.0.justificativa');
  });

  it('mensagens em PT-BR', () => {
    expect(
      erros(
        esquemaEntrada.safeParse({
          medicamentoId: 'm1',
          numero: 'L1',
          validade: '2026-11-09',
          quantidade: 0,
        }),
      ),
    ).toEqual({
      validade: 'A validade não pode estar vencida',
      quantidade: 'Informe um número inteiro maior que zero',
    });
  });
});

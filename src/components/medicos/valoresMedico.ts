import type { Medico, Tratamento } from '../../types';

/** Forma dos valores no formulário de médico (tudo controlado). */
export interface ValoresMedico {
  tratamento: Tratamento | '';
  nome: string;
  crm: { numero: string; uf: string };
  telefone: string;
  email: string;
  departamentoId: string;
  disponibilidade: {
    diasSemana: number[];
    inicio: string;
    fim: string;
    /** Vazia ('' e '') = sem pausa. */
    pausa: { inicio: string; fim: string };
    duracaoPadraoMin: number;
  };
}

/** Valores iniciais: os do médico em edição ou um padrão (Seg–Sex, 08–17, almoço 12–13, 30 min). */
export function valoresDoMedico(m?: Medico): ValoresMedico {
  return {
    tratamento: m?.tratamento ?? '',
    nome: m?.nome ?? '',
    crm: { numero: m?.crm.numero ?? '', uf: m?.crm.uf ?? '' },
    telefone: m?.telefone ?? '',
    email: m?.email ?? '',
    departamentoId: m?.departamentoId ?? '',
    disponibilidade: m
      ? {
          diasSemana: [...m.disponibilidade.diasSemana],
          inicio: m.disponibilidade.inicio,
          fim: m.disponibilidade.fim,
          pausa: m.disponibilidade.pausa ?? { inicio: '', fim: '' },
          duracaoPadraoMin: m.disponibilidade.duracaoPadraoMin,
        }
      : {
          diasSemana: [1, 2, 3, 4, 5],
          inicio: '08:00',
          fim: '17:00',
          pausa: { inicio: '12:00', fim: '13:00' },
          duracaoPadraoMin: 30,
        },
  };
}

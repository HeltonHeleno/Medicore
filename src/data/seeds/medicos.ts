/**
 * 8 médicos de exemplo (D6): os 4 da tabela de troca de nomes + 4.
 * Cobrem todos os departamentos; um com pausa, um que não atende às sextas, um inativo.
 */
import type { DiaSemana, Disponibilidade, Medico, Tratamento } from '../../types';
import { agora } from '../../utils/relogio';
import { criarAleatorio, gerarCrm, gerarFixo, unicos } from './gerador';

const SEG_SEX: DiaSemana[] = [1, 2, 3, 4, 5];

interface Modelo {
  id: string;
  tratamento: Tratamento;
  nome: string;
  email: string;
  departamentoId: string;
  disponibilidade: Disponibilidade;
  inativo?: boolean;
}

export const MODELOS_MEDICOS: Modelo[] = [
  {
    id: 'med-paulo-mendes',
    tratamento: 'Dr.',
    nome: 'Paulo Mendes',
    email: 'paulo.mendes@medicore.example',
    departamentoId: 'cardiologia',
    disponibilidade: {
      diasSemana: SEG_SEX,
      inicio: '08:00',
      fim: '17:00',
      pausa: { inicio: '12:00', fim: '13:00' },
      duracaoPadraoMin: 30,
    },
  },
  {
    id: 'med-marcos-ribeiro',
    tratamento: 'Dr.',
    nome: 'Marcos Ribeiro',
    email: 'marcos.ribeiro@medicore.example',
    departamentoId: 'emergencia',
    disponibilidade: {
      diasSemana: [0, 1, 2, 3, 4, 5, 6],
      inicio: '07:00',
      fim: '19:00',
      duracaoPadraoMin: 20,
    },
  },
  {
    id: 'med-fernanda-lima',
    tratamento: 'Dra.',
    nome: 'Fernanda Lima',
    email: 'fernanda.lima@medicore.example',
    departamentoId: 'neurologia',
    // Não atende às sextas.
    disponibilidade: {
      diasSemana: [1, 2, 3, 4],
      inicio: '09:00',
      fim: '18:00',
      duracaoPadraoMin: 30,
    },
  },
  {
    id: 'med-rafael-costa',
    tratamento: 'Dr.',
    nome: 'Rafael Costa',
    email: 'rafael.costa@medicore.example',
    departamentoId: 'cardiologia',
    disponibilidade: { diasSemana: [2, 3, 4], inicio: '13:00', fim: '19:00', duracaoPadraoMin: 30 },
  },
  {
    id: 'med-beatriz-nogueira',
    tratamento: 'Dra.',
    nome: 'Beatriz Nogueira',
    email: 'beatriz.nogueira@medicore.example',
    departamentoId: 'ortopedia',
    disponibilidade: { diasSemana: SEG_SEX, inicio: '08:00', fim: '18:00', duracaoPadraoMin: 20 },
  },
  {
    id: 'med-helena-duarte',
    tratamento: 'Dra.',
    nome: 'Helena Duarte',
    email: 'helena.duarte@medicore.example',
    departamentoId: 'clinica-geral',
    disponibilidade: {
      diasSemana: [1, 2, 3, 4, 5, 6],
      inicio: '07:00',
      fim: '19:00',
      duracaoPadraoMin: 15,
    },
  },
  {
    id: 'med-gustavo-martins',
    tratamento: 'Dr.',
    nome: 'Gustavo Martins',
    email: 'gustavo.martins@medicore.example',
    departamentoId: 'pediatria',
    disponibilidade: { diasSemana: SEG_SEX, inicio: '08:00', fim: '16:00', duracaoPadraoMin: 30 },
  },
  {
    id: 'med-sergio-tavares',
    tratamento: 'Dr.',
    nome: 'Sérgio Tavares',
    email: 'sergio.tavares@medicore.example',
    departamentoId: 'clinica-geral',
    disponibilidade: { diasSemana: SEG_SEX, inicio: '08:00', fim: '12:00', duracaoPadraoMin: 30 },
    inativo: true,
  },
];

export function semearMedicos(): Medico[] {
  const rand = criarAleatorio(2026);
  const crm = unicos(() => gerarCrm(rand));
  const momento = agora().toISOString();
  return MODELOS_MEDICOS.map(({ inativo, ...m }) => ({
    ...m,
    crm: { numero: crm(), uf: 'SP' as const },
    telefone: gerarFixo(rand),
    criadoEm: momento,
    atualizadoEm: momento,
    versao: 1,
    ativo: !inativo,
    ...(inativo ? { inativadoEm: momento, motivoInativacao: 'Desligado do corpo clínico' } : {}),
  }));
}

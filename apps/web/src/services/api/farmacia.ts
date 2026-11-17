/**
 * Fase 27 (BL-01.7) — Modo API: toma o lugar de `services/farmacia.ts` quando o app é construído com
 * `VITE_API_URL` (ver `vite.config.ts`). Mesmas funções e assinaturas; os dados vêm da API.
 */

import type * as L from '../farmacia';
import { operacoes as c } from './cliente';
import { emPaginas } from './paginas';

export const listarEstoque: typeof L.listarEstoque = emPaginas(c.listarEstoque);
export const obterMedicamento: typeof L.obterMedicamento = c.obterMedicamento;
export const listarLotesVencimento: typeof L.listarLotesVencimento = c.listarLotesVencimento;
export const listarMovimentacoes: typeof L.listarMovimentacoes = emPaginas(c.listarMovimentacoes);
export const obterDispensacao: typeof L.obterDispensacao = c.obterDispensacao;
export const listarDispensacoesDoPaciente: typeof L.listarDispensacoesDoPaciente =
  c.listarDispensacoesDoPaciente;
export const livroControlados: typeof L.livroControlados = c.livroControlados;
export const previaFefo: typeof L.previaFefo = c.previaFefo;
export const verificarAlergia: typeof L.verificarAlergia = c.verificarAlergia;
export const criarMedicamento: typeof L.criarMedicamento = c.criarMedicamento;
export const editarMedicamento: typeof L.editarMedicamento = c.editarMedicamento;
export const inativarMedicamento: typeof L.inativarMedicamento = c.inativarMedicamento;
export const reativarMedicamento: typeof L.reativarMedicamento = c.reativarMedicamento;
export const registrarEntrada: typeof L.registrarEntrada = c.registrarEntrada;
export const ajustar: typeof L.ajustar = c.ajustar;
export const descartarVencidos: typeof L.descartarVencidos = c.descartarVencidos;
export const bloquearLote: typeof L.bloquearLote = c.bloquearLote;
export const desbloquearLote: typeof L.desbloquearLote = c.desbloquearLote;
export const destinoDaDispensacao: typeof L.destinoDaDispensacao = c.destinoDaDispensacao;
export const destinoDetalhado: typeof L.destinoDetalhado = c.destinoDetalhado;
export const listarDispensacoesDoDestino: typeof L.listarDispensacoesDoDestino =
  c.listarDispensacoesDoDestino;
export const dispensar: typeof L.dispensar = c.dispensar;
export const devolver: typeof L.devolver = c.devolver;
export const estornar: typeof L.estornar = c.estornar;

export { nomeMedicamento, quantidadeComUnidade } from '@medicore/dominio/utils/operacoes';

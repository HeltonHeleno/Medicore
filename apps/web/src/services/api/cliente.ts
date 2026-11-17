/**
 * Fase 27 — Os clientes HTTP do domínio (as mesmas assinaturas dos serviços do navegador), ligados
 * à API de `VITE_API_URL`. Só entra no pacote no modo API (ver `vite.config.ts`).
 */
import { criarClienteCadastros } from '@medicore/dominio/cliente/cadastros';
import { criarClienteOperacoes } from '@medicore/dominio/cliente/operacoes';
import { baseDaApi, criarTransporte } from './rede';

export const transporte = criarTransporte(baseDaApi(import.meta.env.VITE_API_URL ?? ''));

export const cadastros = criarClienteCadastros(transporte);
export const operacoes = criarClienteOperacoes(transporte);

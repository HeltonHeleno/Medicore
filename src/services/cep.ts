/**
 * A6: busca de endereço pelo CEP no ViaCEP (D5). Só o CEP sai do navegador.
 * - Tempo limite de 5 s; uma nova busca pode cancelar a anterior pelo `signal`.
 * - `null` = CEP não encontrado; falha de rede ou tempo esgotado lança `ErroBuscaCep` (E-10).
 * - Resultados ficam em cache na memória durante a sessão.
 */
import type { UF } from '../types';
import { somenteDigitos, ufValida } from '../utils/validacao';

export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: UF;
}

export class ErroBuscaCep extends Error {
  constructor() {
    super('Falha ao buscar o CEP');
    this.name = 'ErroBuscaCep';
  }
}

export const TEMPO_LIMITE_CEP_MS = 5000;
const cache = new Map<string, EnderecoCep | null>();

/** Só para testes. */
export const limparCacheCep = () => cache.clear();

interface RespostaViaCep {
  erro?: boolean | string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

export async function buscarCep(cep: string, signal?: AbortSignal): Promise<EnderecoCep | null> {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return null;
  if (cache.has(digitos)) return cache.get(digitos)!;

  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_CEP_MS);
  const aoCancelar = () => controle.abort();
  signal?.addEventListener('abort', aoCancelar);

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: controle.signal,
    });
    if (!resposta.ok) {
      // ViaCEP responde 400 para formato inválido: trata como não encontrado.
      if (resposta.status === 400) return guardar(digitos, null);
      throw new ErroBuscaCep();
    }
    const dados = (await resposta.json()) as RespostaViaCep;
    if (dados.erro || !dados.uf || !ufValida(dados.uf)) return guardar(digitos, null);
    return guardar(digitos, {
      logradouro: dados.logradouro ?? '',
      bairro: dados.bairro ?? '',
      cidade: dados.localidade ?? '',
      uf: dados.uf,
    });
  } catch (e) {
    if (signal?.aborted) throw e; // cancelada por quem chamou: não é falha
    if (e instanceof ErroBuscaCep) throw e;
    throw new ErroBuscaCep();
  } finally {
    clearTimeout(limite);
    signal?.removeEventListener('abort', aoCancelar);
  }
}

function guardar(cep: string, valor: EnderecoCep | null) {
  cache.set(cep, valor);
  return valor;
}

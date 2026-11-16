/**
 * Fase 24 (BL-01.3) — Contrato de erros entre a API e o navegador.
 *
 * Os dois lados usam este arquivo: a API transforma as classes de erro em resposta HTTP
 * (`respostaDeErro`) e o navegador faz o caminho de volta (`erroDeResposta`, usado pelo adaptador
 * HTTP da Fase 27). Assim, a tela recebe as mesmas classes que recebe hoje do serviço local.
 *
 * R-API4: nenhuma resposta de erro traz pilha, SQL ou dado de outro registro.
 */
import {
  ErroConcorrencia,
  ErroConflito,
  ErroInterno,
  ErroLimite,
  ErroNaoEncontrado,
  ErroPermissao,
  ErroRede,
  ErroSessao,
  ErroValidacao,
  ErroVersaoObrigatoria,
  type CodigoConflito,
} from '../erros';

export type CorpoErro =
  | { codigo: 'validacao'; campos: Record<string, string> }
  | {
      codigo: CodigoConflito;
      mensagem: string;
      campo?: string;
      detalhes?: Record<string, unknown>;
    }
  | { codigo: 'versao'; versaoAtual?: number }
  | { codigo: 'versao_obrigatoria' }
  | { codigo: 'nao_encontrado'; mensagem?: string }
  | { codigo: 'sessao' }
  | { codigo: 'permissao'; acao: string }
  | { codigo: 'limite'; aguardarSegundos: number }
  | { codigo: 'interno'; id?: string };

export interface RespostaErro {
  status: 401 | 403 | 404 | 409 | 412 | 422 | 428 | 429 | 500;
  corpo: CorpoErro;
}

/**
 * Classe de erro → resposta HTTP. Erros que não são do domínio viram 500 (o `id` do
 * monitoramento entra depois, em quem chama).
 */
export function respostaDeErro(erro: unknown): RespostaErro {
  if (erro instanceof ErroValidacao) {
    return { status: 422, corpo: { codigo: 'validacao', campos: erro.campos } };
  }
  if (erro instanceof ErroConflito) {
    return {
      status: 409,
      corpo: {
        codigo: erro.codigo,
        mensagem: erro.message,
        ...(erro.campo ? { campo: erro.campo } : {}),
        ...(erro.detalhes ? { detalhes: erro.detalhes } : {}),
      },
    };
  }
  if (erro instanceof ErroConcorrencia) {
    return {
      status: 412,
      corpo: {
        codigo: 'versao',
        ...(erro.versaoAtual !== undefined ? { versaoAtual: erro.versaoAtual } : {}),
      },
    };
  }
  if (erro instanceof ErroVersaoObrigatoria) {
    return { status: 428, corpo: { codigo: 'versao_obrigatoria' } };
  }
  if (erro instanceof ErroNaoEncontrado) {
    return { status: 404, corpo: { codigo: 'nao_encontrado', mensagem: erro.message } };
  }
  if (erro instanceof ErroSessao) return { status: 401, corpo: { codigo: 'sessao' } };
  if (erro instanceof ErroPermissao) {
    return { status: 403, corpo: { codigo: 'permissao', acao: erro.acao } };
  }
  if (erro instanceof ErroLimite) {
    return { status: 429, corpo: { codigo: 'limite', aguardarSegundos: erro.aguardarSegundos } };
  }
  return {
    status: 500,
    corpo: {
      codigo: 'interno',
      ...(erro instanceof ErroInterno && erro.id ? { id: erro.id } : {}),
    },
  };
}

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Resposta HTTP de erro → classe de erro. `status` 0 (ou `undefined`) quer dizer que a
 * requisição nem chegou ao servidor (E-22).
 */
export function erroDeResposta(status: number | undefined, corpo: unknown): Error {
  if (!status) return new ErroRede();
  const c = ehObjeto(corpo) ? corpo : {};
  const codigo = typeof c.codigo === 'string' ? c.codigo : undefined;

  switch (status) {
    case 422:
      return new ErroValidacao(ehObjeto(c.campos) ? (c.campos as Record<string, string>) : {});
    case 409:
      return new ErroConflito(
        (codigo ?? 'conflito_dados') as CodigoConflito,
        typeof c.mensagem === 'string' ? c.mensagem : '',
        {
          campo: typeof c.campo === 'string' ? c.campo : undefined,
          detalhes: ehObjeto(c.detalhes) ? c.detalhes : undefined,
        },
      );
    case 412:
      return new ErroConcorrencia(typeof c.versaoAtual === 'number' ? c.versaoAtual : undefined);
    case 428:
      return new ErroVersaoObrigatoria();
    case 404:
      return new ErroNaoEncontrado(typeof c.mensagem === 'string' ? c.mensagem : '');
    case 401:
      return new ErroSessao();
    case 403:
      return new ErroPermissao(typeof c.acao === 'string' ? c.acao : '');
    case 429:
      return new ErroLimite(typeof c.aguardarSegundos === 'number' ? c.aguardarSegundos : 60);
    case 502:
    case 503:
    case 504:
      return new ErroRede();
    default:
      return new ErroInterno(typeof c.id === 'string' ? c.id : undefined);
  }
}

/**
 * Erros tipados dos serviços (seção "Tratamento de erros" da especificação).
 * As telas decidem como mostrar cada um; nenhum deles apaga o que o usuário digitou.
 */
import type { z } from 'zod';
import { t } from '../i18n/pt-BR';

/** E-01: dados que não passaram no esquema. `campos` usa caminhos com ponto, ex.: "endereco.cep". */
export class ErroValidacao extends Error {
  readonly campos: Record<string, string>;
  constructor(campos: Record<string, string>) {
    super(Object.values(campos)[0] ?? t.validacao.obrigatorio);
    this.name = 'ErroValidacao';
    this.campos = campos;
  }

  static deZod(erro: z.ZodError): ErroValidacao {
    const campos: Record<string, string> = {};
    for (const issue of erro.issues) {
      const caminho = issue.path.map(String).join('.');
      if (!(caminho in campos)) campos[caminho] = issue.message;
    }
    return new ErroValidacao(campos);
  }
}

/** Códigos de conflito, para a tela decidir onde e como mostrar (E-02, E-03, E-04). */
export type CodigoConflito =
  | 'cpf_duplicado'
  | 'crm_duplicado'
  | 'email_duplicado'
  | 'paciente_inativo'
  | 'medico_inativo'
  | 'horario_passado'
  | 'fora_expediente'
  | 'antecedencia_maxima'
  | 'medico_ocupado'
  | 'paciente_ocupado'
  | 'transicao_invalida'
  | 'consultas_futuras'
  | 'tem_historico';

/** E-02/E-03/E-04: a operação viola uma regra de negócio. */
export class ErroConflito extends Error {
  readonly codigo: CodigoConflito;
  readonly campo?: string;
  /** Informações extras (ex.: id do cadastro existente, consultas que bloqueiam). */
  readonly detalhes?: Record<string, unknown>;
  constructor(
    codigo: CodigoConflito,
    mensagem: string,
    opcoes: { campo?: string; detalhes?: Record<string, unknown> } = {},
  ) {
    super(mensagem);
    this.name = 'ErroConflito';
    this.codigo = codigo;
    this.campo = opcoes.campo;
    this.detalhes = opcoes.detalhes;
  }
}

/** E-05: o registro mudou desde que foi carregado (R-G1). */
export class ErroConcorrencia extends Error {
  constructor() {
    super(t.erros.concorrencia);
    this.name = 'ErroConcorrencia';
  }
}

/** E-08 */
export class ErroNaoEncontrado extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroNaoEncontrado';
  }
}

/** E-06: o navegador recusou gravar (cota do localStorage). */
export class ErroArmazenamento extends Error {
  constructor() {
    super(t.erros.armazenamentoCheio);
    this.name = 'ErroArmazenamento';
  }
}

type SetError = (campo: string, erro: { type: string; message: string }) => void;

/**
 * Leva os erros do serviço para os campos do formulário (react-hook-form `setError`).
 * Devolve `true` se o erro foi aplicado a algum campo; `false` se a tela precisa
 * mostrá-lo de outra forma (toast, diálogo).
 */
export function aplicarErrosNoFormulario(erro: unknown, setError: SetError): boolean {
  if (erro instanceof ErroValidacao) {
    for (const [campo, mensagem] of Object.entries(erro.campos)) {
      setError(campo, { type: 'servico', message: mensagem });
    }
    return Object.keys(erro.campos).length > 0;
  }
  if (erro instanceof ErroConflito && erro.campo) {
    setError(erro.campo, { type: erro.codigo, message: erro.message });
    return true;
  }
  return false;
}

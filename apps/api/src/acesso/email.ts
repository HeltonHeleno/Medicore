/**
 * Fase 28 (BL-02.2, BL-02.3) — Envio dos e-mails de convite e de senha nova.
 *
 * - `resend`: API HTTP do Resend (`RESEND_API_KEY`, `EMAIL_REMETENTE`);
 * - `memoria`: só nos testes, guarda as mensagens numa lista;
 * - sem provedor: nada sai, e quem convidou recebe o link para enviar (o "esqueci a senha" não
 *   consegue ajudar nesse caso, e a tela diz para falar com o administrador).
 *
 * R-AU5: o link leva um token; nem ele nem o corpo da mensagem vão para o log.
 */
export interface Mensagem {
  para: string;
  assunto: string;
  texto: string;
}

export interface Enviador {
  /** `false` quando não há provedor: o link volta para quem pediu (só o administrador). */
  readonly configurado: boolean;
  enviar(m: Mensagem): Promise<void>;
}

export const semEnvio: Enviador = {
  configurado: false,
  async enviar() {},
};

export function enviadorEmMemoria(): Enviador & { caixa: Mensagem[] } {
  const caixa: Mensagem[] = [];
  return {
    configurado: true,
    caixa,
    async enviar(m) {
      caixa.push(m);
    },
  };
}

export class ErroEnvioEmail extends Error {
  constructor(status: number) {
    super(`O provedor de e-mail recusou a mensagem (HTTP ${status}).`);
    this.name = 'ErroEnvioEmail';
  }
}

export function enviadorResend(
  chave: string,
  remetente: string,
  buscar: typeof fetch = fetch,
): Enviador {
  return {
    configurado: true,
    async enviar(m) {
      const resposta = await buscar('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: remetente, to: [m.para], subject: m.assunto, text: m.texto }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!resposta.ok) throw new ErroEnvioEmail(resposta.status);
    },
  };
}

/** Fase 28 — Senha nova e a confirmação (convite e redefinição). A força é conferida na API. */
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { Campo } from '../ui/form/Campo';
import { Input } from '../ui/form/Input';
import type { SenhaNova } from './senha-nova';

export function CamposSenhaNova({
  valor,
  aoMudar,
  erro,
  email,
}: {
  valor: SenhaNova;
  aoMudar: (v: SenhaNova) => void;
  erro?: string;
  /** Para o gerenciador de senhas salvar com o e-mail certo. */
  email?: string;
}) {
  return (
    <>
      {email && (
        <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
      )}
      <Campo rotulo={ta.senha.nova} nome="senha" obrigatorio dica={ta.senha.dica} erro={erro}>
        <Input
          name="senha"
          type="password"
          autoComplete="new-password"
          value={valor.senha}
          onChange={(e) => aoMudar({ ...valor, senha: e.target.value })}
          required
        />
      </Campo>
      <Campo rotulo={ta.senha.confirmar} nome="confirmacao" obrigatorio>
        <Input
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          value={valor.confirmacao}
          onChange={(e) => aoMudar({ ...valor, confirmacao: e.target.value })}
          required
        />
      </Campo>
    </>
  );
}

/** Fase 28 (BL-02.3) — Pede o link de senha nova. A resposta é a mesma exista a conta ou não. */
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LayoutAcesso } from '../../components/acesso/LayoutAcesso';
import { mensagemDeErro } from '../../components/acesso/erros';
import { Button } from '../../components/ui/Button';
import { Campo } from '../../components/ui/form/Campo';
import { Input } from '../../components/ui/form/Input';
import { esqueciSenha, opcoesAcesso } from '../../services/acesso';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [semEmail, setSemEmail] = useState(false);
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    opcoesAcesso()
      .then((o) => ativo && setSemEmail(!o.email))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(undefined);
    try {
      await esqueciSenha(email);
      setEnviado(true);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  const voltar = (
    <Link to="/entrar" className="text-[14px] font-medium text-primary hover:underline">
      {ta.esqueci.voltar}
    </Link>
  );

  return (
    <LayoutAcesso
      titulo={ta.esqueci.titulo}
      descricao={semEmail ? ta.esqueci.semEmail : ta.esqueci.descricao}
    >
      {semEmail ? (
        voltar
      ) : enviado ? (
        <div className="space-y-4">
          <p role="status" className="text-[14px]">
            {ta.esqueci.enviado}
          </p>
          {voltar}
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-4">
          <Campo rotulo={ta.login.email} nome="email" obrigatorio erro={erro}>
            <Input
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Campo>
          <Button type="submit" largo disabled={enviando || !email}>
            {ta.esqueci.enviar}
          </Button>
          <p className="text-center">{voltar}</p>
        </form>
      )}
    </LayoutAcesso>
  );
}

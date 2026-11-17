/** Fase 28 (BL-02.3) — Senha nova pelo link (30 min). Todas as sessões abertas terminam. */
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CamposSenhaNova } from '../../components/acesso/CamposSenhaNova';
import { problemaLocal, type SenhaNova } from '../../components/acesso/senha-nova';
import { LayoutAcesso } from '../../components/acesso/LayoutAcesso';
import { mensagemDeErro } from '../../components/acesso/erros';
import { Button } from '../../components/ui/Button';
import { ErroNaoEncontrado } from '@medicore/dominio/erros';
import { redefinirSenha, usarSessao } from '../../services/acesso';
import { tokenDoLink } from './rotas';

export default function RedefinirSenha() {
  const { hash } = useLocation();
  const [token] = useState(() => tokenDoLink(hash));
  const [valor, setValor] = useState<SenhaNova>({ senha: '', confirmacao: '' });
  const [erro, setErro] = useState<string>();
  const [situacao, setSituacao] = useState<'formulario' | 'concluido' | 'invalido'>(
    token ? 'formulario' : 'invalido',
  );
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (hash) window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const local = problemaLocal(valor);
    if (local) return setErro(local);
    setEnviando(true);
    setErro(undefined);
    try {
      await redefinirSenha(token, valor.senha);
      usarSessao(null);
      setSituacao('concluido');
    } catch (e) {
      if (e instanceof ErroNaoEncontrado) setSituacao('invalido');
      else setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  const entrar = (
    <Link to="/entrar" className="text-[14px] font-medium text-primary hover:underline">
      {ta.esqueci.voltar}
    </Link>
  );

  if (situacao !== 'formulario') {
    return (
      <LayoutAcesso
        titulo={ta.redefinir.titulo}
        descricao={situacao === 'concluido' ? ta.redefinir.concluido : ta.redefinir.invalido}
      >
        {entrar}
      </LayoutAcesso>
    );
  }
  return (
    <LayoutAcesso titulo={ta.redefinir.titulo}>
      <form onSubmit={enviar} noValidate className="space-y-4">
        <CamposSenhaNova valor={valor} aoMudar={setValor} erro={erro} />
        <Button type="submit" largo disabled={enviando}>
          {ta.senha.definir}
        </Button>
      </form>
    </LayoutAcesso>
  );
}

/** Fase 28 (BL-02.2) — Convite: define a senha e, se o perfil exigir, o segundo fator. */
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CamposSenhaNova } from '../../components/acesso/CamposSenhaNova';
import { problemaLocal, type SenhaNova } from '../../components/acesso/senha-nova';
import { EtapasMfa } from '../../components/acesso/EtapasMfa';
import { LayoutAcesso } from '../../components/acesso/LayoutAcesso';
import { mensagemDeErro } from '../../components/acesso/erros';
import { Button } from '../../components/ui/Button';
import { CarregandoPagina } from '../../components/ui/CarregandoPagina';
import { aceitarConvite, conferirConvite } from '../../services/acesso';
import { tokenDoLink } from './rotas';

export default function PrimeiroAcesso() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => tokenDoLink(hash));
  const [convite, setConvite] = useState<{ nome: string; email: string } | null>();
  const [valor, setValor] = useState<SenhaNova>({ senha: '', confirmacao: '' });
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [etapaMfa, setEtapaMfa] = useState<'mfa' | 'configurar_mfa'>();

  useEffect(() => {
    // Tira o token da barra de endereço (histórico, capturas de tela).
    if (hash) window.history.replaceState(null, '', window.location.pathname);
    let ativo = true;
    (token ? conferirConvite(token) : Promise.reject(new Error()))
      .then((c) => ativo && setConvite(c))
      .catch(() => ativo && setConvite(null));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const local = problemaLocal(valor);
    if (local) return setErro(local);
    setEnviando(true);
    setErro(undefined);
    try {
      const s = await aceitarConvite(token, valor.senha);
      if (s.etapa === 'ativa') navigate('/', { replace: true });
      else setEtapaMfa(s.etapa);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (convite === undefined) return <CarregandoPagina />;
  if (convite === null) {
    return (
      <LayoutAcesso titulo={ta.convite.titulo} descricao={ta.convite.invalido}>
        <Link to="/entrar" className="text-[14px] font-medium text-primary hover:underline">
          {ta.esqueci.voltar}
        </Link>
      </LayoutAcesso>
    );
  }
  return (
    <LayoutAcesso titulo={ta.convite.titulo} descricao={ta.convite.descricao(convite.nome)}>
      {etapaMfa ? (
        <EtapasMfa
          etapa={etapaMfa}
          aoConcluir={() => navigate('/', { replace: true })}
          aoExpirar={() => navigate('/entrar', { replace: true })}
        />
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-4">
          <CamposSenhaNova valor={valor} aoMudar={setValor} erro={erro} email={convite.email} />
          <Button type="submit" largo disabled={enviando}>
            {ta.senha.definir}
          </Button>
        </form>
      )}
    </LayoutAcesso>
  );
}

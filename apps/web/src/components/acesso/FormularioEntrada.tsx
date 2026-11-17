/**
 * Fase 28 (BL-02.1) — E-mail e senha, as contas de demonstração e, se o perfil exigir, o segundo
 * fator. Usado na página de login e no aviso "Sua sessão terminou" (E-19), que não sai da tela.
 */
import type { ContaDemonstracao, RespostaSessao } from '@medicore/dominio/contrato/acesso';
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { PERFIS } from '@medicore/dominio/permissoes';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { entrar, entrarDemonstracao, opcoesAcesso } from '../../services/acesso';
import { Button } from '../ui/Button';
import { Campo } from '../ui/form/Campo';
import { Input } from '../ui/form/Input';
import { EtapasMfa } from './EtapasMfa';
import { mensagemDeErro } from './erros';

interface Props {
  aoEntrar: (s: RespostaSessao) => void;
  /** E-mail já conhecido (a sessão que terminou). */
  emailInicial?: string;
}

const CONTAS: ContaDemonstracao[] = ['todos', ...PERFIS];
const rotuloConta = (c: ContaDemonstracao) =>
  c === 'todos' ? ta.login.demonstracaoTodos : ta.perfis[c];

export function FormularioEntrada({ aoEntrar, emailInicial = '' }: Props) {
  const [email, setEmail] = useState(emailInicial);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [etapa, setEtapa] = useState<'credenciais' | 'mfa' | 'configurar_mfa'>('credenciais');
  const [demonstracao, setDemonstracao] = useState(false);

  useEffect(() => {
    let ativo = true;
    opcoesAcesso()
      .then((o) => ativo && setDemonstracao(o.demonstracao))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  function seguir(s: RespostaSessao) {
    if (s.etapa === 'ativa') aoEntrar(s);
    else setEtapa(s.etapa);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(undefined);
    try {
      seguir(await entrar(email, senha));
    } catch (e) {
      setErro(mensagemDeErro(e));
      setSenha('');
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComo(conta: ContaDemonstracao) {
    setEnviando(true);
    setErro(undefined);
    try {
      seguir(await entrarDemonstracao(conta));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (etapa !== 'credenciais') {
    return (
      <EtapasMfa
        etapa={etapa}
        aoConcluir={aoEntrar}
        aoExpirar={() => {
          setEtapa('credenciais');
          setErro(ta.mfa.expirado);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={enviar} noValidate className="space-y-4" aria-label={ta.login.titulo}>
        <Campo rotulo={ta.login.email} obrigatorio>
          <Input
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Campo>
        <Campo rotulo={ta.login.senha} obrigatorio erro={erro}>
          <Input
            name="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </Campo>
        <Button type="submit" largo disabled={enviando || !email || !senha}>
          {enviando ? ta.login.entrando : ta.login.entrar}
        </Button>
        <p className="text-center">
          <Link
            to="/esqueci-senha"
            className="text-[13.5px] font-medium text-primary hover:underline"
          >
            {ta.login.esqueci}
          </Link>
        </p>
      </form>

      {demonstracao && (
        <section aria-labelledby="titulo-demonstracao" className="border-t border-border pt-5">
          <h2 id="titulo-demonstracao" className="text-[15px] font-semibold">
            {ta.login.demonstracaoTitulo}
          </h2>
          <p className="mt-1 text-[13px] text-text-muted">{ta.login.demonstracaoDescricao}</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {CONTAS.map((c) => (
              <li key={c} className={c === 'todos' ? 'col-span-2' : undefined}>
                <Button
                  type="button"
                  variante={c === 'todos' ? 'suave' : 'contorno'}
                  tamanho="sm"
                  largo
                  disabled={enviando}
                  aria-label={ta.login.entrarComo(rotuloConta(c))}
                  onClick={() => void entrarComo(c)}
                >
                  {rotuloConta(c)}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

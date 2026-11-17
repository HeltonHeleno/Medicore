/**
 * Fase 28 (BL-02.2) — O segundo fator depois da senha: o código do aplicativo (ou um de
 * recuperação) ou, no primeiro acesso, o QR code e os códigos de recuperação.
 */
import type { RespostaSessao } from '@medicore/dominio/contrato/acesso';
import { ErroConflito, ErroSessao } from '@medicore/dominio/erros';
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { concluirMfa, configurarMfa, confirmarMfa } from '../../services/acesso';
import { Button } from '../ui/Button';
import { Campo } from '../ui/form/Campo';
import { Input } from '../ui/form/Input';
import { mensagemDeErro } from './erros';

interface Props {
  etapa: 'mfa' | 'configurar_mfa';
  aoConcluir: (s: RespostaSessao) => void;
  /** A etapa do código venceu (5 min) ou a sessão sumiu: volta para a senha. */
  aoExpirar: () => void;
}

function CampoCodigo({
  rotulo,
  valor,
  aoMudar,
  erro,
  recuperacao,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  erro?: string;
  recuperacao?: boolean;
}) {
  return (
    <Campo rotulo={rotulo} obrigatorio erro={erro}>
      <Input
        name="codigo"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        autoComplete="one-time-code"
        inputMode={recuperacao ? 'text' : 'numeric'}
        maxLength={recuperacao ? 9 : 6}
        autoFocus
        className="tracking-[0.2em]"
      />
    </Campo>
  );
}

export function EtapasMfa({ etapa, aoConcluir, aoExpirar }: Props) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [recuperacao, setRecuperacao] = useState(false);
  const [configuracao, setConfiguracao] = useState<{ segredo: string; qrSvg: string }>();
  const [codigos, setCodigos] = useState<{ lista: string[]; sessao: RespostaSessao }>();
  const [copiados, setCopiados] = useState(false);

  useEffect(() => {
    if (etapa !== 'configurar_mfa') return;
    let ativo = true;
    configurarMfa()
      .then((c) => ativo && setConfiguracao(c))
      .catch((e: unknown) => (e instanceof ErroSessao ? aoExpirar() : setErro(mensagemDeErro(e))));
    return () => {
      ativo = false;
    };
  }, [etapa, aoExpirar]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;
    setEnviando(true);
    setErro(undefined);
    try {
      if (etapa === 'mfa') {
        aoConcluir(await confirmarMfa(codigo.trim()));
      } else {
        const r = await concluirMfa(codigo.trim());
        const { codigosRecuperacao, ...sessao } = r;
        setCodigos({ lista: codigosRecuperacao, sessao });
      }
    } catch (e) {
      if (
        e instanceof ErroSessao ||
        (e instanceof ErroConflito && e.codigo === 'transicao_invalida')
      ) {
        aoExpirar();
        return;
      }
      setErro(mensagemDeErro(e));
      setCodigo('');
    } finally {
      setEnviando(false);
    }
  }

  if (codigos) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-[17px] font-semibold">{ta.mfa.recuperacaoTitulo}</h2>
          <p className="mt-1 text-[14px] text-text-muted">{ta.mfa.recuperacaoDescricao}</p>
        </div>
        <ul
          aria-label={ta.mfa.codigoRecuperacao}
          className="grid grid-cols-2 gap-2 rounded-md border border-border bg-bg p-3 font-mono text-[14px]"
        >
          {codigos.lista.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variante="contorno"
            iconeEsquerda={copiados ? <Check size={16} /> : <Copy size={16} />}
            onClick={() =>
              void navigator.clipboard
                ?.writeText(codigos.lista.join('\n'))
                .then(() => setCopiados(true))
                .catch(() => {})
            }
          >
            {copiados ? ta.mfa.copiados : ta.mfa.copiarCodigos}
          </Button>
          <Button type="button" onClick={() => aoConcluir(codigos.sessao)}>
            {ta.mfa.guardei}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {etapa === 'mfa' ? (
        <div>
          <h2 className="text-[17px] font-semibold">{ta.mfa.titulo}</h2>
          <p className="mt-1 text-[14px] text-text-muted">{ta.mfa.descricao}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <h2 className="text-[17px] font-semibold">{ta.mfa.configurarTitulo}</h2>
            <p className="mt-1 text-[14px] text-text-muted">{ta.mfa.configurarDescricao}</p>
          </div>
          {configuracao && (
            <>
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(configuracao.qrSvg)}`}
                alt={ta.mfa.qrRotulo}
                width={176}
                height={176}
                className="mx-auto rounded-md bg-white p-2"
              />
              <p className="text-[13px] text-text-muted">
                {ta.mfa.chaveManual}{' '}
                <code className="font-mono break-all text-text" data-testid="chave-mfa">
                  {configuracao.segredo}
                </code>
              </p>
            </>
          )}
        </div>
      )}
      <CampoCodigo
        rotulo={recuperacao ? ta.mfa.codigoRecuperacao : ta.mfa.codigo}
        valor={codigo}
        aoMudar={setCodigo}
        erro={erro}
        recuperacao={recuperacao}
      />
      <Button type="submit" largo disabled={enviando}>
        {ta.mfa.confirmar}
      </Button>
      {etapa === 'mfa' && (
        <button
          type="button"
          className="text-[13.5px] font-medium text-primary hover:underline"
          onClick={() => {
            setRecuperacao((r) => !r);
            setCodigo('');
            setErro(undefined);
          }}
        >
          {recuperacao ? ta.mfa.usarAplicativo : ta.mfa.usarRecuperacao}
        </button>
      )}
    </form>
  );
}

/** Fase 28 (BL-02.5) — Administração de usuários: convidar, editar, desativar, links e MFA. */
import type {
  EntradaUsuario,
  UsuarioAdministrado,
  UsuarioComLink,
} from '@medicore/dominio/contrato/acesso';
import { ErroConflito, ErroValidacao } from '@medicore/dominio/erros';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { PERFIS, type Perfil } from '@medicore/dominio/permissoes';
import { formatarDataHora } from '@medicore/dominio/utils/datas';
import { Copy, Link2, Pencil, RotateCcw, ShieldOff, Unlock, UserPlus, UserX } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { ConteudoAsync } from '../../components/ui/ConteudoAsync';
import { Modal } from '../../components/ui/feedback/Modal';
import { Campo } from '../../components/ui/form/Campo';
import { Checkbox } from '../../components/ui/form/Checkbox';
import { Input } from '../../components/ui/form/Input';
import { Select } from '../../components/ui/form/Select';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { MenuAcoes, type AcaoMenu } from '../../components/ui/lista/MenuAcoes';
import { useAsync } from '../../hooks/useAsync';
import { useConfirmar } from '../../hooks/useConfirmar';
import { useToast } from '../../hooks/useToast';
import {
  convidarUsuario,
  desativarUsuario,
  desbloquearUsuario,
  editarUsuario,
  listarUsuarios,
  novoLinkUsuario,
  reativarUsuario,
  redefinirMfaUsuario,
} from '../../services/acesso';
import { listarMedicos } from '../../services/medicos';

const u = ta.usuarios;
const vazio: EntradaUsuario = { nome: '', email: '', perfis: [] };

function situacao(x: UsuarioAdministrado): string {
  if (!x.ativo) return u.inativo;
  if (x.bloqueadoAte) return u.bloqueado;
  if (x.convidado) return u.convidado;
  return u.ativo;
}

function FormularioUsuario({
  inicial,
  aoSalvar,
  aoCancelar,
}: {
  inicial: EntradaUsuario;
  aoSalvar: (e: EntradaUsuario) => Promise<void>;
  aoCancelar: () => void;
}) {
  const [valor, setValor] = useState(inicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const medicos = useAsync(() => listarMedicos({ status: 'ativos', porPagina: 500 }), []);

  const alternarPerfil = (p: Perfil) =>
    setValor((v) => ({
      ...v,
      perfis: v.perfis.includes(p) ? v.perfis.filter((x) => x !== p) : [...v.perfis, p],
    }));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErros({});
    try {
      await aoSalvar({
        ...valor,
        medicoId: valor.perfis.includes('medico') ? valor.medicoId || undefined : undefined,
      });
    } catch (e) {
      if (e instanceof ErroValidacao) setErros(e.campos);
      else if (e instanceof ErroConflito) setErros({ [e.campo ?? 'perfis']: e.message });
      else setErros({ perfis: e instanceof Error ? e.message : t.erros.inesperadoTitulo });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" aria-label={u.titulo}>
      <Campo rotulo={u.nome} nome="nome" obrigatorio erro={erros.nome}>
        <Input
          name="nome"
          value={valor.nome}
          onChange={(e) => setValor({ ...valor, nome: e.target.value })}
        />
      </Campo>
      <Campo rotulo={u.email} nome="email" obrigatorio erro={erros.email}>
        <Input
          name="email"
          type="email"
          value={valor.email}
          onChange={(e) => setValor({ ...valor, email: e.target.value })}
        />
      </Campo>
      <fieldset className="space-y-2">
        <legend className="text-[13.5px] font-medium">{u.perfis}</legend>
        <div className="grid grid-cols-2 gap-2">
          {PERFIS.map((p) => (
            <Checkbox
              key={p}
              name={`perfil-${p}`}
              rotulo={ta.perfis[p]}
              checked={valor.perfis.includes(p)}
              onChange={() => alternarPerfil(p)}
            />
          ))}
        </div>
        {erros.perfis && (
          <p role="alert" className="text-[12.5px] font-medium text-danger">
            {erros.perfis}
          </p>
        )}
      </fieldset>
      {valor.perfis.includes('medico') && (
        <Campo rotulo={u.medico} nome="medicoId" obrigatorio erro={erros.medicoId}>
          <Select
            name="medicoId"
            value={valor.medicoId ?? ''}
            onChange={(e) => setValor({ ...valor, medicoId: e.target.value })}
            opcoes={(medicos.data?.itens ?? []).map((m) => ({
              valor: m.id,
              rotulo: `${m.nomeExibicao} (${m.crmFormatado})`,
            }))}
          />
        </Campo>
      )}
      <div className="flex justify-end gap-2 pb-1">
        <Button type="button" variante="contorno" onClick={aoCancelar}>
          {u.cancelar}
        </Button>
        <Button type="submit" disabled={enviando}>
          {u.salvar}
        </Button>
      </div>
    </form>
  );
}

export default function Usuarios() {
  const toast = useToast();
  const confirmar = useConfirmar();
  const lista = useAsync(listarUsuarios, []);
  const [editando, setEditando] = useState<UsuarioAdministrado | 'novo' | null>(null);
  const [link, setLink] = useState<UsuarioComLink | null>(null);
  const [copiado, setCopiado] = useState(false);

  const executar = async (fn: () => Promise<unknown>, sucesso: string) => {
    try {
      await fn();
      toast.sucesso(sucesso);
    } catch (e) {
      toast.erro(e instanceof Error ? e.message : t.erros.inesperadoTitulo);
    } finally {
      lista.recarregar();
    }
  };

  const entregar = (r: UsuarioComLink) => {
    if (r.link) {
      setCopiado(false);
      setLink(r);
    } else if (r.enviadoPara) toast.sucesso(u.linkEnviado(r.enviadoPara));
  };

  const acoesDe = (x: UsuarioAdministrado): AcaoMenu[] => [
    { rotulo: u.editar, icone: Pencil, aoClicar: () => setEditando(x) },
    {
      rotulo: x.convidado ? u.reenviarConvite : u.redefinirSenha,
      icone: Link2,
      desabilitado: !x.ativo,
      aoClicar: () =>
        void novoLinkUsuario(x.id)
          .then(entregar)
          .catch((e: Error) => toast.erro(e.message)),
    },
    ...(x.bloqueadoAte
      ? [
          {
            rotulo: u.desbloquear,
            icone: Unlock,
            aoClicar: () => void executar(() => desbloquearUsuario(x.id), u.desbloqueado(x.nome)),
          },
        ]
      : []),
    ...(x.mfaAtivo
      ? [
          {
            rotulo: u.redefinirMfa,
            icone: ShieldOff,
            aoClicar: () => void executar(() => redefinirMfaUsuario(x.id), u.mfaRedefinido(x.nome)),
          },
        ]
      : []),
    x.ativo
      ? {
          rotulo: u.desativar,
          icone: UserX,
          perigo: true,
          aoClicar: () =>
            void confirmar({
              titulo: u.confirmarDesativar(x.nome),
              mensagem: u.confirmarDesativarTexto,
              rotuloConfirmar: u.desativar,
              perigo: true,
            }).then(
              (ok) => ok && void executar(() => desativarUsuario(x.id), u.desativado(x.nome)),
            ),
        }
      : {
          rotulo: u.reativar,
          icone: RotateCcw,
          aoClicar: () => void executar(() => reativarUsuario(x.id), u.reativado(x.nome)),
        },
  ];

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo={u.titulo}
        descricao={u.descricao}
        acoes={
          <Button iconeEsquerda={<UserPlus size={17} />} onClick={() => setEditando('novo')}>
            {u.convidar}
          </Button>
        }
      />
      <section className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-card)]">
        <ConteudoAsync estado={lista} vazio={u.vazio}>
          {(usuarios) => (
            <table className="w-full text-left text-[14px]">
              <thead className="border-b border-border text-[12.5px] text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{u.nome}</th>
                  <th className="px-4 py-3 font-medium">{u.perfis}</th>
                  <th className="px-4 py-3 font-medium">{u.situacao}</th>
                  <th className="px-4 py-3 font-medium">{u.mfa}</th>
                  <th className="px-4 py-3 font-medium">{u.ultimoAcesso}</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">{u.acoes}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((x) => (
                  <tr key={x.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{x.nome}</p>
                      <p className="text-[12.5px] text-text-muted">{x.email}</p>
                    </td>
                    <td className="px-4 py-3">{x.perfis.map((p) => ta.perfis[p]).join(', ')}</td>
                    <td className="px-4 py-3">{situacao(x)}</td>
                    <td className="px-4 py-3">{x.mfaAtivo ? u.mfaAtivo : u.mfaPendente}</td>
                    <td className="px-4 py-3">
                      {x.ultimoAcessoEm ? formatarDataHora(x.ultimoAcessoEm) : u.nunca}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MenuAcoes nome={x.nome} acoes={acoesDe(x)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ConteudoAsync>
      </section>

      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando === 'novo' ? u.convidar : u.editar}
      >
        {editando !== null && (
          <FormularioUsuario
            inicial={
              editando === 'novo'
                ? vazio
                : {
                    nome: editando.nome,
                    email: editando.email,
                    perfis: editando.perfis,
                    medicoId: editando.medicoId,
                  }
            }
            aoCancelar={() => setEditando(null)}
            aoSalvar={async (entrada) => {
              if (editando === 'novo') {
                const r = await convidarUsuario(entrada);
                toast.sucesso(u.convidado_(r.usuario.nome));
                entregar(r);
              } else {
                await editarUsuario(editando.id, entrada, editando.versao);
                toast.sucesso(u.salvo);
              }
              setEditando(null);
              lista.recarregar();
            }}
          />
        )}
      </Modal>

      <Modal
        aberto={link !== null}
        aoFechar={() => setLink(null)}
        titulo={u.linkTitulo}
        descricao={
          <>
            <span className="block">{u.linkDescricao}</span>
            <span className="mt-1 block">{ta.emailNaoConfigurado}</span>
          </>
        }
        rodape={
          <Button
            iconeEsquerda={<Copy size={16} />}
            onClick={() =>
              void navigator.clipboard
                ?.writeText(link?.link ?? '')
                .then(() => setCopiado(true))
                .catch(() => {})
            }
          >
            {copiado ? u.copiado : u.copiarLink}
          </Button>
        }
      >
        <Input
          readOnly
          value={link?.link ?? ''}
          aria-label={u.linkTitulo}
          onFocus={(e) => e.target.select()}
        />
      </Modal>
    </div>
  );
}

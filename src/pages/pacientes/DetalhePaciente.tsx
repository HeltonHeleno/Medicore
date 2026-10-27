import {
  ArrowLeft,
  CalendarPlus,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertaAlergias } from '../../components/pacientes/AlertaAlergias';
import { CardConsultasPaciente } from '../../components/pacientes/CardConsultasPaciente';
import { Avatar } from '../../components/ui/Avatar';
import { BadgeSituacao } from '../../components/ui/BadgeSituacao';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DescricaoLista } from '../../components/ui/lista/DescricaoLista';
import { MenuAcoes } from '../../components/ui/lista/MenuAcoes';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useAcoesPaciente } from '../../hooks/useAcoesPaciente';
import { useAgenda, usePaciente } from '../../hooks/useDados';
import { useVoltarPara } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import { ErroNaoEncontrado } from '../../services/erros';
import { nomeExibicaoPaciente } from '../../services/pacientes';
import { dataDoInstante, formatarData, hojeNoFuso, idade } from '../../utils/datas';
import { mascararCep, mascararCpf, mascararTelefone, ocultarCpf } from '../../utils/mascaras';
import { agora } from '../../utils/relogio';

const p = t.pacientes;

/** /pacientes/:id — cadastro completo, alergias em destaque, consultas e ações (P3–P5). */
export default function DetalhePaciente() {
  const { id = '' } = useParams();
  const { data: paciente, erro, recarregar } = usePaciente(id);
  const agenda = useAgenda({ pacienteId: id });
  const acoes = useAcoesPaciente();
  const voltarPara = useVoltarPara('/pacientes');
  const [mostrarCpf, setMostrarCpf] = useState(false);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.pacienteNaoEncontrado}
        descricao={p.naoEncontradoDescricao}
        voltarPara="/pacientes"
        rotuloVoltar={p.voltarLista}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!paciente) {
    return (
      <div aria-busy="true" className="space-y-4">
        <SkeletonLinhas />
      </div>
    );
  }

  const nome = nomeExibicaoPaciente(paciente);
  const alvo = { id: paciente.id, nomeExibicao: nome };
  const consultas = agenda.data ?? [];
  const momento = agora().getTime();
  const proximas = consultas.filter(
    (c) => c.status === 'agendada' && new Date(c.inicio).getTime() >= momento,
  );
  const historico = consultas.filter((c) => !proximas.includes(c)).reverse();
  const podeExcluir = agenda.data !== null && consultas.length === 0;
  const conv = paciente.convenio;
  const vencido = conv.tipo === 'convenio' && conv.validade && conv.validade < hojeNoFuso();

  return (
    <>
      <Link
        to={voltarPara}
        className="mb-3 inline-flex items-center gap-1.5 rounded text-[13.5px] text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ArrowLeft size={15} aria-hidden />
        {p.voltarLista}
      </Link>
      <CabecalhoPagina
        titulo={nome}
        breadcrumbFinal={nome}
        aoLadoDoTitulo={<BadgeSituacao ativo={paciente.ativo} />}
        descricao={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Avatar nome={nome} tamanho={28} className="ring-0" />
            {p.anos(idade(paciente.dataNascimento))}
            {paciente.nomeSocial && (
              <span>
                {p.nomeCivil}: {paciente.nome}
              </span>
            )}
          </span>
        }
        acoes={
          <>
            <ButtonLink
              to={`/pacientes/${id}/editar`}
              variante="contorno"
              iconeEsquerda={<Pencil size={16} />}
            >
              {p.acoes.editar}
            </ButtonLink>
            {paciente.ativo && (
              <ButtonLink
                to={`/consultas/nova?pacienteId=${id}`}
                iconeEsquerda={<CalendarPlus size={16} />}
              >
                {p.acoes.agendar}
              </ButtonLink>
            )}
            <MenuAcoes
              nome={nome}
              acoes={[
                paciente.ativo
                  ? {
                      rotulo: p.acoes.inativar,
                      icone: UserX,
                      perigo: true,
                      aoClicar: () => void acoes.inativar(alvo),
                    }
                  : {
                      rotulo: p.acoes.reativar,
                      icone: UserCheck,
                      aoClicar: () => void acoes.reativar(alvo),
                    },
                ...(podeExcluir
                  ? [
                      {
                        rotulo: p.acoes.excluir,
                        icone: Trash2,
                        perigo: true,
                        aoClicar: () => void acoes.excluir(alvo),
                      },
                    ]
                  : []),
              ]}
            />
          </>
        }
      />

      <div className="space-y-5">
        {!paciente.ativo && (
          <p className="rounded-[var(--radius-card)] border border-border bg-bg px-4 py-3 text-[14px]">
            {p.inativoDesde(
              paciente.inativadoEm ? formatarData(dataDoInstante(paciente.inativadoEm)) : '—',
              paciente.motivoInativacao,
            )}
          </p>
        )}
        <AlertaAlergias alergias={paciente.alergias} />

        <div className="grid gap-5 lg:grid-cols-2">
          <Card titulo={p.cards.dadosPessoais}>
            <DescricaoLista
              itens={[
                ...(paciente.nomeSocial ? [{ termo: p.nomeCivil, descricao: paciente.nome }] : []),
                {
                  termo: p.campos.cpf,
                  descricao: (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="tabular-nums">
                        {mostrarCpf ? mascararCpf(paciente.cpf) : ocultarCpf(paciente.cpf)}
                      </span>
                      <button
                        type="button"
                        aria-pressed={mostrarCpf}
                        onClick={() => setMostrarCpf((v) => !v)}
                        className="inline-flex items-center gap-1 rounded text-[13px] font-medium text-on-primary-light hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        {mostrarCpf ? (
                          <EyeOff size={14} aria-hidden />
                        ) : (
                          <Eye size={14} aria-hidden />
                        )}
                        {mostrarCpf ? p.ocultarCpf : p.mostrarCpf}
                      </button>
                    </span>
                  ),
                },
                {
                  termo: p.campos.dataNascimento,
                  descricao: `${formatarData(paciente.dataNascimento)} (${p.anos(idade(paciente.dataNascimento))})`,
                },
                { termo: p.campos.sexo, descricao: p.sexos[paciente.sexo] },
              ]}
            />
          </Card>

          <Card titulo={p.cards.contato}>
            <DescricaoLista
              itens={[
                { termo: p.campos.telefone, descricao: mascararTelefone(paciente.telefone) },
                { termo: p.campos.email, descricao: paciente.email },
                {
                  termo: p.secoes.endereco,
                  largo: true,
                  descricao: paciente.endereco
                    ? p.enderecoFormatado({
                        ...paciente.endereco,
                        cep: mascararCep(paciente.endereco.cep),
                      })
                    : undefined,
                },
              ]}
            />
          </Card>

          {paciente.responsavel && (
            <Card titulo={p.cards.responsavel}>
              <DescricaoLista
                itens={[
                  { termo: p.campos.responsavelNome, descricao: paciente.responsavel.nome },
                  { termo: p.campos.parentesco, descricao: paciente.responsavel.parentesco },
                  {
                    termo: p.campos.responsavelCpf,
                    descricao: ocultarCpf(paciente.responsavel.cpf),
                  },
                  {
                    termo: p.campos.responsavelTelefone,
                    descricao: mascararTelefone(paciente.responsavel.telefone),
                  },
                ]}
              />
            </Card>
          )}

          <Card titulo={p.cards.convenio}>
            <DescricaoLista
              itens={
                conv.tipo === 'convenio'
                  ? [
                      { termo: p.campos.convenioNome, descricao: conv.nome },
                      { termo: p.campos.carteirinha, descricao: conv.carteirinha },
                      {
                        termo: p.campos.validade,
                        descricao: conv.validade ? (
                          <>
                            {formatarData(conv.validade)}
                            {vencido && (
                              <span className="mt-0.5 block text-[13px] text-warning">
                                {p.convenioVencido}
                              </span>
                            )}
                          </>
                        ) : undefined,
                      },
                    ]
                  : [{ termo: p.campos.tipoConvenio, descricao: p.campos.particular }]
              }
            />
          </Card>

          <Card titulo={p.cards.clinicas}>
            <DescricaoLista
              itens={[
                { termo: p.campos.tipoSanguineo, descricao: paciente.tipoSanguineo },
                { termo: p.campos.alergias, descricao: paciente.alergias },
                { termo: p.campos.observacoes, descricao: paciente.observacoes, largo: true },
              ]}
            />
          </Card>

          {paciente.contatoEmergencia && (
            <Card titulo={p.cards.emergencia}>
              <DescricaoLista
                itens={[
                  { termo: p.campos.emergenciaNome, descricao: paciente.contatoEmergencia.nome },
                  {
                    termo: p.campos.emergenciaParentesco,
                    descricao: paciente.contatoEmergencia.parentesco,
                  },
                  {
                    termo: p.campos.emergenciaTelefone,
                    descricao: mascararTelefone(paciente.contatoEmergencia.telefone),
                  },
                ]}
              />
            </Card>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <CardConsultasPaciente
            titulo={p.cards.proximas}
            consultas={proximas}
            vazio={p.semProximas}
          />
          <CardConsultasPaciente
            titulo={p.cards.historico}
            consultas={historico}
            vazio={p.semHistorico}
            paginado
          />
        </div>
      </div>
    </>
  );
}

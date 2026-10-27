import { ArrowLeft, CalendarDays, CalendarPlus, Pencil, UserCheck, UserX } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AgendaMedico } from '../../components/medicos/AgendaMedico';
import { GradeDisponibilidade } from '../../components/medicos/GradeDisponibilidade';
import { IndicadoresMedico } from '../../components/medicos/IndicadoresMedico';
import { textoPrevia } from '../../components/medicos/previa';
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
import { useAcoesMedico } from '../../hooks/useAcoesMedico';
import { useMedico } from '../../hooks/useDados';
import { useVoltarPara } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import { ErroNaoEncontrado } from '../../services/erros';
import { nomeDepartamento, nomeExibicaoMedico } from '../../services/medicos';
import { dataDoInstante, formatarData } from '../../utils/datas';
import { formatarCrm, mascararTelefone } from '../../utils/mascaras';

const m = t.medicos;

/** /medicos/:id — dados, disponibilidade, agenda (hoje e 7 dias) e indicadores do mês. */
export default function DetalheMedico() {
  const { id = '' } = useParams();
  const { data: medico, erro, recarregar } = useMedico(id);
  const acoes = useAcoesMedico();
  const voltarPara = useVoltarPara('/medicos');

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.medicoNaoEncontrado}
        descricao={m.naoEncontradoDescricao}
        voltarPara="/medicos"
        rotuloVoltar={m.voltarLista}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!medico) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas />
      </div>
    );
  }

  const nome = nomeExibicaoMedico(medico);
  const alvo = { id: medico.id, nomeExibicao: nome };

  return (
    <>
      <Link
        to={voltarPara}
        className="mb-3 inline-flex items-center gap-1.5 rounded text-[13.5px] text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ArrowLeft size={15} aria-hidden />
        {m.voltarLista}
      </Link>
      <CabecalhoPagina
        titulo={nome}
        breadcrumbFinal={nome}
        aoLadoDoTitulo={<BadgeSituacao ativo={medico.ativo} />}
        descricao={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Avatar nome={nome} tamanho={28} className="ring-0" />
            <span>
              {m.colunas.crm} {formatarCrm(medico.crm)}
            </span>
            <span>{nomeDepartamento(medico.departamentoId)}</span>
          </span>
        }
        acoes={
          <>
            <ButtonLink
              to={`/medicos/${id}/editar`}
              variante="contorno"
              iconeEsquerda={<Pencil size={16} />}
            >
              {m.acoes.editar}
            </ButtonLink>
            <ButtonLink
              to={`/consultas?medicoId=${id}`}
              variante="contorno"
              iconeEsquerda={<CalendarDays size={16} />}
            >
              {m.acoes.verAgenda}
            </ButtonLink>
            {medico.ativo && (
              <ButtonLink
                to={`/consultas/nova?medicoId=${id}`}
                iconeEsquerda={<CalendarPlus size={16} />}
              >
                {m.acoes.agendar}
              </ButtonLink>
            )}
            <MenuAcoes
              nome={nome}
              acoes={[
                medico.ativo
                  ? {
                      rotulo: m.acoes.inativar,
                      icone: UserX,
                      perigo: true,
                      aoClicar: () => acoes.inativar(alvo),
                    }
                  : {
                      rotulo: m.acoes.reativar,
                      icone: UserCheck,
                      aoClicar: () => void acoes.reativar(alvo),
                    },
              ]}
            />
          </>
        }
      />

      <div className="space-y-5">
        {!medico.ativo && (
          <p className="rounded-[var(--radius-card)] border border-border bg-bg px-4 py-3 text-[14px]">
            {m.inativoDesde(
              medico.inativadoEm ? formatarData(dataDoInstante(medico.inativadoEm)) : '—',
              medico.motivoInativacao,
            )}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Card titulo={m.cards.contato}>
            <DescricaoLista
              itens={[
                { termo: m.campos.telefone, descricao: mascararTelefone(medico.telefone) },
                { termo: m.campos.email, descricao: medico.email },
                {
                  termo: m.campos.departamento,
                  descricao: nomeDepartamento(medico.departamentoId),
                },
                { termo: m.colunas.crm, descricao: formatarCrm(medico.crm) },
              ]}
            />
          </Card>
          <Card titulo={m.cards.disponibilidade}>
            <GradeDisponibilidade disponibilidade={medico.disponibilidade} />
            <p className="mt-3 text-[13.5px] text-text-muted">
              {textoPrevia(medico.disponibilidade)}
            </p>
          </Card>
        </div>

        <IndicadoresMedico medicoId={medico.id} />
        <AgendaMedico medico={medico} />
      </div>
      {acoes.dialogo}
    </>
  );
}

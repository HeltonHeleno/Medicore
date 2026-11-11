import { BedDouble, Siren } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useHistoricoPaciente } from '../../hooks/useHistoricoHospitalar';
import { th } from '../../i18n/pt-BR/hospitalar';
import { te } from '../../i18n/pt-BR/emergencia';
import { tl } from '../../i18n/pt-BR/leitos';
import { formatarDataHora } from '../../utils/datas';
import { ButtonLink } from '../ui/Button';
import { Card } from '../ui/Card';
import { ErrorState } from '../ui/EmptyState';
import { SkeletonLinhas } from '../ui/Skeleton';

const o = th;
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

/** Item do histórico: link para o registro, ou "registro arquivado" sem link (A15, M30). */
function ItemHistorico({
  para,
  arquivado,
  titulo,
  detalhe,
}: {
  para: string;
  arquivado: boolean;
  titulo: string;
  detalhe: string;
}) {
  return (
    <li className="py-2.5">
      {arquivado ? (
        <span className="font-medium">{titulo}</span>
      ) : (
        <Link to={para} className={classeLink}>
          {titulo}
        </Link>
      )}
      <p className="text-[13px] text-text-muted">
        {[detalhe, ...(arquivado ? [o.arquivado] : [])].filter(Boolean).join(' · ')}
      </p>
    </li>
  );
}

function Grupo({
  titulo,
  vazio,
  children,
}: {
  titulo: string;
  vazio: string;
  children: ReactNode[];
}) {
  return (
    <div>
      <h3 className="text-[13.5px] font-semibold text-text-muted">{titulo}</h3>
      {children.length === 0 ? (
        <p className="py-2 text-[13.5px] text-text-muted">{vazio}</p>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </div>
  );
}

/**
 * 20.10: "Situação hospitalar" (internação ativa ou atendimento aberto, com links e as ações
 * Internar e Registrar chegada quando valem, R-X1) e "Histórico hospitalar" do paciente.
 */
export function SituacaoHospitalarPaciente({
  pacienteId,
  ativo,
}: {
  pacienteId: string;
  ativo: boolean;
}) {
  const { data, erro, recarregar } = useHistoricoPaciente(pacienteId);

  if (erro || !data) {
    // Mesma estrutura do conteúdo, para as regiões não serem trocadas quando os dados chegam.
    const estado = erro ? (
      <ErrorState aoTentarNovamente={recarregar} />
    ) : (
      <div aria-busy="true">
        <SkeletonLinhas />
      </div>
    );
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <Card titulo={o.situacaoTitulo}>{estado}</Card>
        <Card titulo={o.historicoTitulo}>{erro ? null : estado}</Card>
      </div>
    );
  }

  const { situacao: s, historico: h } = data;
  const livre = !s.internacao && !s.atendimento;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card titulo={o.situacaoTitulo}>
        <div className="space-y-3 text-[14px]">
          {s.internacao && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">{o.internadoNoLeito(s.internacao.leitoCodigo)}</span>
              <Link to={`/leitos/internacoes/${s.internacao.id}`} className={classeLink}>
                {o.verInternacao}
              </Link>
            </p>
          )}
          {s.atendimento && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">{o.emAtendimento(s.atendimento.numero)}</span>
              <Link to={`/emergencia/${s.atendimento.id}`} className={classeLink}>
                {o.verAtendimento}
              </Link>
            </p>
          )}
          {livre && <p className="text-text-muted">{o.semSituacao}</p>}
          {s.solicitacao && !s.internacao && <p className="text-text-muted">{o.pedidoDeLeito}</p>}
          {livre && ativo && (
            <div className="flex flex-wrap gap-2 pt-1">
              {!s.solicitacao && (
                <ButtonLink
                  to={`/leitos/internar?pacienteId=${pacienteId}`}
                  variante="contorno"
                  iconeEsquerda={<BedDouble size={16} />}
                >
                  {o.internar}
                </ButtonLink>
              )}
              <ButtonLink
                to={`/emergencia/chegada?pacienteId=${pacienteId}`}
                variante="contorno"
                iconeEsquerda={<Siren size={16} />}
              >
                {o.registrarChegada}
              </ButtonLink>
            </div>
          )}
        </div>
      </Card>

      <Card titulo={o.historicoTitulo}>
        <div className="space-y-4">
          <Grupo titulo={o.internacoes} vazio={o.semInternacoes}>
            {h.internacoes.map((i) => (
              <ItemHistorico
                key={i.id}
                para={`/leitos/internacoes/${i.id}`}
                arquivado={i.arquivado}
                titulo={o.leito(i.leitoCodigo)}
                detalhe={`${formatarDataHora(i.inicio)} · ${
                  i.fim && i.tipoAlta
                    ? o.alta(tl.tiposAlta[i.tipoAlta], formatarDataHora(i.fim))
                    : o.emCurso
                }`}
              />
            ))}
          </Grupo>
          <Grupo titulo={o.atendimentos7} vazio={o.semAtendimentos}>
            {h.atendimentos.map((a) => (
              <ItemHistorico
                key={a.id}
                para={`/emergencia/${a.id}`}
                arquivado={a.arquivado}
                titulo={a.numero}
                detalhe={`${formatarDataHora(a.chegadaEm)} · ${
                  a.aberto || !a.desfecho ? o.emCurso : o.encerrado(te.desfechos[a.desfecho])
                }`}
              />
            ))}
          </Grupo>
          <Grupo titulo={o.dispensacoes30} vazio={o.semDispensacoes}>
            {h.dispensacoes.map((d) => (
              <ItemHistorico
                key={d.id}
                para={`/farmacia/dispensacoes/${d.id}`}
                arquivado={d.arquivado}
                titulo={formatarDataHora(d.em)}
                detalhe={[
                  ...(d.arquivado ? [] : [o.itens(d.itens)]),
                  ...(d.estornada ? [o.estornada] : []),
                ].join(' · ')}
              />
            ))}
          </Grupo>
        </div>
      </Card>
    </div>
  );
}

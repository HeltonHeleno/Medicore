import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useVinculosMedico } from '../../hooks/useHistoricoHospitalar';
import { th } from '../../i18n/pt-BR/hospitalar';
import { formatarDataHora } from '../../utils/datas';
import { Card } from '../ui/Card';
import { ErrorState } from '../ui/EmptyState';
import { SkeletonLinhas } from '../ui/Skeleton';

const o = th;
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

/** Lista curta com link em cada item; vazia, mostra a frase. */
function Lista({
  titulo,
  vazio,
  itens,
  estado,
}: {
  titulo: string;
  vazio: string;
  itens: { id: string; para: string; rotulo: string; detalhe: string }[];
  /** Esqueleto ou erro no lugar da lista. */
  estado?: ReactNode;
}) {
  return (
    <Card titulo={titulo}>
      {estado !== undefined ? (
        estado
      ) : itens.length === 0 ? (
        <p className="py-2 text-[13.5px] text-text-muted">{vazio}</p>
      ) : (
        <ul className="divide-y divide-border">
          {itens.map((x) => (
            <li key={x.id} className="py-2.5">
              <Link to={x.para} className={classeLink}>
                {x.rotulo}
              </Link>
              <p className="text-[13px] text-text-muted">{x.detalhe}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** 20.11: internações sob responsabilidade e atendimentos em curso, no detalhe do médico. */
export function VinculosMedico({ medicoId }: { medicoId: string }) {
  const { data, erro, recarregar } = useVinculosMedico(medicoId);

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
        <Lista titulo={o.internacoesResponsavel} vazio="" itens={[]} estado={estado} />
        <Lista titulo={o.atendimentosEmCurso} vazio="" itens={[]} estado={erro ? null : estado} />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Lista
        titulo={o.internacoesResponsavel}
        vazio={o.semInternacoesMedico}
        itens={data.internacoes.map((i) => ({
          id: i.id,
          para: `/leitos/internacoes/${i.id}`,
          rotulo: i.pacienteNome,
          detalhe: `${o.leito(i.leitoCodigo)} · ${o.desde(formatarDataHora(i.inicio))}`,
        }))}
      />
      <Lista
        titulo={o.atendimentosEmCurso}
        vazio={o.semAtendimentosMedico}
        itens={data.atendimentos.map((a) => ({
          id: a.id,
          para: `/emergencia/${a.id}`,
          rotulo: a.pacienteNome,
          detalhe: `${a.numero} · ${o.chegadaAs(formatarDataHora(a.chegadaEm))}`,
        }))}
      />
    </div>
  );
}

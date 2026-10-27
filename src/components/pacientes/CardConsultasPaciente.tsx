import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/pt-BR';
import type { ConsultaDetalhada } from '../../types';
import { formatarDataHora } from '../../utils/datas';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Paginacao } from '../ui/lista/Paginacao';
import { StatusBadge } from '../ui/StatusBadge';

const POR_PAGINA = 5;

/** Lista de consultas do paciente (próximas ou histórico), com paginação local. */
export function CardConsultasPaciente({
  titulo,
  consultas,
  vazio,
  paginado,
}: {
  titulo: string;
  consultas: ConsultaDetalhada[];
  vazio: string;
  paginado?: boolean;
}) {
  const [pagina, setPagina] = useState(1);
  const ultima = Math.max(1, Math.ceil(consultas.length / POR_PAGINA));
  const atual = Math.min(pagina, ultima);
  const visiveis = paginado
    ? consultas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA)
    : consultas;

  return (
    <Card titulo={titulo}>
      {consultas.length === 0 ? (
        <EmptyState mensagem={vazio} className="py-4" />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {visiveis.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <Link
                    to={`/consultas/${c.id}`}
                    className="rounded font-medium text-text tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {formatarDataHora(c.inicio)}
                  </Link>
                  <p className="text-[13px] text-text-muted">
                    {t.pacientes.consultaCom(c.medicoNome, c.departamentoNome)}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
          {paginado && consultas.length > POR_PAGINA && (
            <Paginacao
              pagina={atual}
              porPagina={POR_PAGINA}
              total={consultas.length}
              aoMudar={setPagina}
            />
          )}
        </>
      )}
    </Card>
  );
}

/** Fase 29 (BL-03.3) — A trilha em tabela: quem, quando, o quê e, nas gravações, o antes → depois. */
import type { RegistroAuditoria } from '@medicore/dominio/contrato/auditoria';
import { tau } from '@medicore/dominio/i18n/pt-BR/auditoria';
import { formatarDataHora } from '@medicore/dominio/utils/datas';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mudancas, nomeDaEntidade, quemFez, textoDoDetalhe } from './formatar';

function Detalhe({ r }: { r: RegistroAuditoria }) {
  const [aberto, setAberto] = useState(false);
  if (r.detalhe) return <>{textoDoDetalhe(r.detalhe)}</>;
  const lista = mudancas(r.campos);
  if (lista.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        aria-expanded={aberto}
        className="text-[13px] font-medium text-primary hover:underline"
        onClick={() => setAberto((a) => !a)}
      >
        {aberto
          ? tau.ocultarDetalhes
          : `${tau.verDetalhes} (${tau.campos.alterados(lista.length)})`}
      </button>
      {aberto && (
        <dl className="mt-1.5 space-y-1 text-[12.5px]">
          {lista.map((m) => (
            <div key={m.campo}>
              <dt className="font-medium">{m.campo}</dt>
              <dd className="break-words text-text-muted">
                {m.adicionados !== undefined
                  ? `${tau.campos.adicionados}: ${m.adicionados}`
                  : `${m.antes} → ${m.depois}`}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function TabelaAuditoria({
  registros,
  mostrarPaciente = true,
}: {
  registros: RegistroAuditoria[];
  mostrarPaciente?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13.5px]">
        <thead className="border-b border-border text-[12.5px] text-text-muted">
          <tr>
            <th className="px-3 py-2.5 font-medium">{tau.colunas.em}</th>
            <th className="px-3 py-2.5 font-medium">{tau.colunas.pessoa}</th>
            <th className="px-3 py-2.5 font-medium">{tau.colunas.acao}</th>
            <th className="px-3 py-2.5 font-medium">{tau.colunas.entidade}</th>
            {mostrarPaciente && <th className="px-3 py-2.5 font-medium">{tau.colunas.paciente}</th>}
            <th className="px-3 py-2.5 font-medium">{tau.colunas.ip}</th>
            <th className="px-3 py-2.5 font-medium">{tau.colunas.detalhe}</th>
          </tr>
        </thead>
        <tbody>
          {registros.map((r) => (
            <tr key={r.id} className="border-b border-border align-top last:border-0">
              <td className="px-3 py-2.5 whitespace-nowrap">{formatarDataHora(r.em)}</td>
              <td className="px-3 py-2.5">{quemFez(r)}</td>
              <td className="px-3 py-2.5">{tau.acoes[r.acao]}</td>
              <td className="px-3 py-2.5">
                {nomeDaEntidade(r.entidade)}
                {r.registroId && (
                  <span className="block text-[12px] text-text-muted">{r.registroId}</span>
                )}
              </td>
              {mostrarPaciente && (
                <td className="px-3 py-2.5">
                  {r.pacienteId && (
                    <Link
                      to={`/pacientes/${r.pacienteId}`}
                      className="text-primary hover:underline"
                    >
                      {r.pacienteId}
                    </Link>
                  )}
                </td>
              )}
              <td className="px-3 py-2.5 whitespace-nowrap">{r.ip}</td>
              <td className="px-3 py-2.5">
                <Detalhe r={r} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

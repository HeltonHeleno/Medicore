/**
 * Fase 29 (BL-03.4) — Relatório ao titular dos dados (LGPD, art. 18): os dados do paciente
 * guardados no MediCore e quem os acessou. Pronto para imprimir ou "Salvar como PDF" no navegador.
 * Só o Administrador; a geração fica registrada na auditoria.
 */
import type { DadosDoTitular } from '@medicore/dominio/contrato/auditoria';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { tau } from '@medicore/dominio/i18n/pt-BR/auditoria';
import { formatarDataHora } from '@medicore/dominio/utils/datas';
import { ArrowLeft, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { formatarValor, quemFez, textoDoDetalhe } from '../../components/auditoria/formatar';
import { Button } from '../../components/ui/Button';
import { ConteudoAsync } from '../../components/ui/ConteudoAsync';
import { useAsync } from '../../hooks/useAsync';
import { dadosDoTitular } from '../../services/auditoria';

const tt = tau.titular;
const rotulos = t.pacientes.campos as unknown as Record<string, string>;

function Secao({ titulo, itens }: { titulo: string; itens: Record<string, unknown>[] }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="text-[16px] font-semibold">
        {titulo}{' '}
        <span className="text-[13px] font-normal text-text-muted">
          ({tt.quantidade(itens.length)})
        </span>
      </h2>
      {itens.length === 0 ? (
        <p className="text-[13.5px] text-text-muted">{tt.nenhum}</p>
      ) : (
        <ul className="mt-1 space-y-1.5 text-[13px]">
          {itens.map((item, i) => (
            <li key={String(item.id ?? i)} className="border-b border-border pb-1.5 last:border-0">
              {formatarValor(item)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Relatorio({ d }: { d: DadosDoTitular }) {
  const { paciente } = d;
  const nome = String(paciente.nomeSocial ?? paciente.nome ?? '');
  return (
    <article className="space-y-6 rounded-[var(--radius-card)] border border-border bg-card p-6 print:border-0 print:p-0">
      <header>
        <h1 className="text-[22px] font-bold">{tt.titulo}</h1>
        <p className="mt-1 text-[14px]">{tt.descricao(nome)}</p>
        <p className="text-[13px] text-text-muted">{tt.gerado(formatarDataHora(d.geradoEm))}</p>
      </header>
      <section className="break-inside-avoid">
        <h2 className="text-[16px] font-semibold">{tt.dados}</h2>
        <dl className="mt-1 grid gap-x-6 gap-y-1 text-[13.5px] sm:grid-cols-2">
          {Object.entries(paciente)
            .filter(([k]) => !['versao', 'criadoEm', 'atualizadoEm'].includes(k))
            .map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="font-medium">{rotulos[k] ?? k}:</dt>
                <dd className="min-w-0 break-words">{formatarValor(v)}</dd>
              </div>
            ))}
        </dl>
      </section>
      <Secao titulo={tt.consultas} itens={d.consultas} />
      <Secao titulo={tt.internacoes} itens={d.internacoes} />
      <Secao titulo={tt.atendimentos} itens={d.atendimentos} />
      <Secao titulo={tt.dispensacoes} itens={d.dispensacoes} />
      <section>
        <h2 className="text-[16px] font-semibold">
          {tt.acessos}{' '}
          <span className="text-[13px] font-normal text-text-muted">
            ({tt.quantidade(d.acessos.length)})
          </span>
        </h2>
        <table className="mt-1 w-full text-left text-[13px]">
          <thead className="text-text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">{tt.colunasAcessos.em}</th>
              <th className="py-1 pr-3 font-medium">{tt.colunasAcessos.pessoa}</th>
              <th className="py-1 font-medium">{tt.colunasAcessos.acao}</th>
            </tr>
          </thead>
          <tbody>
            {d.acessos.map((a) => (
              <tr key={a.id} className="border-t border-border align-top">
                <td className="py-1 pr-3 whitespace-nowrap">{formatarDataHora(a.em)}</td>
                <td className="py-1 pr-3">{quemFez(a)}</td>
                <td className="py-1">
                  {tau.acoes[a.acao]}
                  {a.detalhe ? `: ${textoDoDetalhe(a.detalhe)}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}

export default function PedidoTitular() {
  const { id = '' } = useParams();
  const estado = useAsync(() => dadosDoTitular(id), [id]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          to={`/pacientes/${id}`}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} aria-hidden /> {tt.voltar}
        </Link>
        <Button iconeEsquerda={<Printer size={16} />} onClick={() => window.print()}>
          {tt.imprimir}
        </Button>
      </div>
      <ConteudoAsync estado={estado}>{(d) => <Relatorio d={d} />}</ConteudoAsync>
    </div>
  );
}

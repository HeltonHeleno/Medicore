/**
 * Fase 29 (BL-03.3, BL-03.5) — Configurações → Auditoria (Administrador e Gestão): a trilha com
 * filtros (guardados na URL, para o link "Ver tudo na auditoria" do paciente), o CSV e a
 * conferência de integridade.
 */
import { ACOES_AUDITORIA, type FiltrosAuditoria } from '@medicore/dominio/contrato/auditoria';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { tau } from '@medicore/dominio/i18n/pt-BR/auditoria';
import { Download, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TabelaAuditoria } from '../../components/auditoria/TabelaAuditoria';
import { Button } from '../../components/ui/Button';
import { classesBotao } from '../../components/ui/buttonStyles';
import { Card } from '../../components/ui/Card';
import { ConteudoAsync } from '../../components/ui/ConteudoAsync';
import { Campo } from '../../components/ui/form/Campo';
import { Input } from '../../components/ui/form/Input';
import { Select } from '../../components/ui/form/Select';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { Paginacao } from '../../components/ui/lista/Paginacao';
import { useAsync } from '../../hooks/useAsync';
import {
  conferirIntegridade,
  enderecoDaExportacao,
  listarAuditoria,
  pessoasDaAuditoria,
} from '../../services/auditoria';

const POR_PAGINA = 50;
const CHAVES = ['usuarioId', 'pacienteId', 'acao', 'entidade', 'de', 'ate'] as const;
type Chave = (typeof CHAVES)[number];

function Integridade() {
  const [estado, setEstado] = useState<'parado' | 'conferindo' | string[]>('parado');
  async function conferir() {
    setEstado('conferindo');
    try {
      const r = await conferirIntegridade();
      setEstado(
        r.diasConferidos === 0
          ? [tau.integridade.nenhumSelo]
          : r.violacoes.length === 0
            ? [tau.integridade.ok(r.diasConferidos, r.registrosConferidos)]
            : r.violacoes.map((v) =>
                tau.integridade.violacao(v.dia, v.quantidadeSelada, v.quantidadeAtual),
              ),
      );
    } catch (e) {
      setEstado([e instanceof Error ? e.message : t.erros.inesperadoTitulo]);
    }
  }
  return (
    <Card titulo={tau.integridade.titulo}>
      <p className="text-[13.5px] text-text-muted">{tau.integridade.descricao}</p>
      <Button
        className="mt-3"
        variante="contorno"
        tamanho="sm"
        iconeEsquerda={<ShieldCheck size={16} />}
        disabled={estado === 'conferindo'}
        onClick={() => void conferir()}
      >
        {estado === 'conferindo' ? tau.integridade.conferindo : tau.integridade.conferir}
      </Button>
      {Array.isArray(estado) && (
        <ul role="status" className="mt-3 space-y-1 text-[13.5px]">
          {estado.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Auditoria() {
  const [busca, setBusca] = useSearchParams();
  const filtros: FiltrosAuditoria = Object.fromEntries(
    CHAVES.map((k) => [k, busca.get(k) || undefined]).filter(([, v]) => v),
  ) as FiltrosAuditoria;
  const pagina = Number(busca.get('pagina')) || 1;
  const [rascunho, setRascunho] = useState<Partial<Record<Chave, string>>>(
    filtros as Partial<Record<Chave, string>>,
  );
  const pessoas = useAsync(pessoasDaAuditoria, []);
  const chave = busca.toString();
  const lista = useAsync(
    () => listarAuditoria({ ...filtros, pagina, porPagina: POR_PAGINA }),
    [chave],
  );

  function aplicar(proximos: Partial<Record<Chave, string>>, novaPagina = 1) {
    const p = new URLSearchParams();
    if (busca.get('aba')) p.set('aba', busca.get('aba')!);
    for (const k of CHAVES) if (proximos[k]) p.set(k, proximos[k]!);
    if (novaPagina > 1) p.set('pagina', String(novaPagina));
    setBusca(p);
  }

  const campo = (k: Chave) => ({
    name: k,
    value: rascunho[k] ?? '',
    onChange: (e: { target: { value: string } }) =>
      setRascunho({ ...rascunho, [k]: e.target.value }),
  });

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo={tau.titulo}
        descricao={tau.descricao}
        acoes={
          <a
            href={enderecoDaExportacao(filtros)}
            download="auditoria.csv"
            className={classesBotao({ variante: 'contorno' })}
          >
            <Download size={17} aria-hidden />
            <span>{tau.exportar}</span>
          </a>
        }
      />

      <form
        aria-label={tau.titulo}
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          aplicar(rascunho);
        }}
        className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-3"
      >
        <Campo rotulo={tau.filtros.pessoa}>
          <Select
            {...campo('usuarioId')}
            vazia={tau.filtros.todasPessoas}
            opcoes={(pessoas.data ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }))}
          />
        </Campo>
        <Campo rotulo={tau.filtros.paciente}>
          <Input {...campo('pacienteId')} />
        </Campo>
        <Campo rotulo={tau.filtros.acao}>
          <Select
            {...campo('acao')}
            vazia={tau.filtros.todasAcoes}
            opcoes={ACOES_AUDITORIA.map((a) => ({ valor: a, rotulo: tau.acoes[a] }))}
          />
        </Campo>
        <Campo rotulo={tau.filtros.entidade}>
          <Select
            {...campo('entidade')}
            vazia={tau.filtros.todasEntidades}
            opcoes={Object.entries(tau.entidades).map(([valor, rotulo]) => ({ valor, rotulo }))}
          />
        </Campo>
        <Campo rotulo={tau.filtros.de}>
          <Input type="date" {...campo('de')} />
        </Campo>
        <Campo rotulo={tau.filtros.ate}>
          <Input type="date" {...campo('ate')} />
        </Campo>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit">{tau.filtros.aplicar}</Button>
          <Button
            type="button"
            variante="contorno"
            onClick={() => {
              setRascunho({});
              aplicar({});
            }}
          >
            {tau.filtros.limpar}
          </Button>
        </div>
      </form>

      <section className="rounded-[var(--radius-card)] border border-border bg-card p-2 shadow-[var(--shadow-card)]">
        <ConteudoAsync estado={lista} vazio={tau.vazia} estaVazio={(d) => d.itens.length === 0}>
          {(d) => (
            <>
              <TabelaAuditoria registros={d.itens} />
              <Paginacao
                className="px-3 pb-2"
                pagina={d.pagina}
                porPagina={d.porPagina}
                total={d.total}
                aoMudar={(p) => aplicar(filtros as Partial<Record<Chave, string>>, p)}
              />
            </>
          )}
        </ConteudoAsync>
      </section>

      <Integridade />
    </div>
  );
}

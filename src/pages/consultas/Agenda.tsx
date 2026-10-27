import { ChevronLeft, ChevronRight, LayoutList, Plus, Users, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListaAgenda } from '../../components/consultas/ListaAgenda';
import { ResumoDia } from '../../components/consultas/ResumoDia';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { classesControle } from '../../components/ui/form/estilos';
import { FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { departamentos } from '../../data/mock';
import { useAcoesConsulta } from '../../hooks/useAcoesConsulta';
import { useColecao } from '../../hooks/useColecao';
import { useAgenda, useListaMedicos } from '../../hooks/useDados';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import { obterPaciente, nomeExibicaoPaciente } from '../../services/pacientes';
import type { FiltrosAgenda, StatusConsulta } from '../../types';
import { cn } from '../../utils/cn';
import {
  dataValida,
  formatarData,
  formatarDataExtenso,
  hojeNoFuso,
  somarDias,
} from '../../utils/datas';

const a = t.agenda;
const PADROES = {
  data: '',
  periodo: '',
  medicoId: '',
  departamentoId: '',
  status: '',
  pacienteId: '',
  visao: 'horario',
};
const STATUS: StatusConsulta[] = ['agendada', 'concluida', 'cancelada', 'faltou'];
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * /consultas — agenda do dia (D7), com navegação de datas, filtros, resumo,
 * ações rápidas (P11, P12) e baixa em lote das pendentes (P13). Tudo na URL.
 */
export default function Agenda() {
  const navigate = useNavigate();
  const { filtros, definir, limpar } = useFiltrosUrl(PADROES);
  const acoes = useAcoesConsulta();
  const idData = useId();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const hoje = hojeNoFuso();
  const data = dataValida(filtros.data) ? filtros.data : hoje;
  const pendentes = filtros.status === 'pendentes';
  // Pendentes e filtro por paciente olham todas as datas, salvo período explícito.
  const periodo = pendentes
    ? 'todas'
    : ['dia', 'futuras', 'todas'].includes(filtros.periodo)
      ? filtros.periodo
      : filtros.pacienteId
        ? 'todas'
        : 'dia';
  const statusFiltro = STATUS.includes(filtros.status as StatusConsulta)
    ? (filtros.status as StatusConsulta)
    : null;
  const visao = filtros.visao === 'medico' ? 'medico' : 'horario';

  const consulta: FiltrosAgenda = {
    medicoId: filtros.medicoId || undefined,
    departamentoId: filtros.departamentoId || undefined,
    pacienteId: filtros.pacienteId || undefined,
    pendentes: pendentes || undefined,
    ...(periodo === 'dia' ? { data } : periodo === 'futuras' ? { de: hoje } : {}),
  };
  const agenda = useAgenda(consulta);
  const medicos = useListaMedicos({ status: 'todos', porPagina: 200 });
  const paciente = useColecao(
    () =>
      filtros.pacienteId
        ? obterPaciente(filtros.pacienteId).catch(() => null)
        : Promise.resolve(null),
    [filtros.pacienteId],
  );

  const doPeriodo = agenda.data ?? [];
  const visiveis = statusFiltro ? doPeriodo.filter((c) => c.status === statusFiltro) : doPeriodo;
  const haFiltros =
    Boolean(filtros.medicoId || filtros.departamentoId || filtros.status || filtros.pacienteId) ||
    periodo !== 'dia';
  const selecionaveis = visiveis.filter((c) => c.status === 'agendada').map((c) => c.id);
  const marcados = selecionaveis.filter((id) => selecionados.has(id));

  const irPara = (novaData: string) => definir({ data: novaData === hoje ? '' : novaData });
  const novaConsultaUrl = `/consultas/nova?data=${data}${filtros.medicoId ? `&medicoId=${filtros.medicoId}` : ''}`;

  const botaoVisao = (valor: 'horario' | 'medico', rotulo: string, Icone: typeof Users) => (
    <button
      type="button"
      aria-pressed={visao === valor}
      onClick={() => definir({ visao: valor })}
      className={cn(
        'inline-flex h-[42px] items-center gap-1.5 px-3 text-[13.5px] font-medium first:rounded-l-lg last:rounded-r-lg',
        'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
        visao === valor ? 'bg-primary text-on-primary' : 'bg-card text-text hover:bg-bg',
      )}
    >
      <Icone size={16} aria-hidden />
      {rotulo}
    </button>
  );

  async function lote(acao: 'concluida' | 'faltou') {
    if (await acoes.registrarLote(marcados, acao)) setSelecionados(new Set());
  }

  return (
    <>
      <CabecalhoPagina
        titulo={a.titulo}
        descricao={
          periodo === 'dia'
            ? capitalizar(formatarDataExtenso(data))
            : periodo === 'futuras'
              ? a.aPartirDeHoje
              : a.todasAsDatas
        }
        acoes={
          <ButtonLink to={novaConsultaUrl} iconeEsquerda={<Plus size={18} />}>
            {a.nova}
          </ButtonLink>
        }
      />

      <div className="space-y-5">
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            {periodo === 'dia' && (
              <div className="flex items-end gap-2">
                <Button
                  variante="contorno"
                  tamanho="sm"
                  className="h-[42px] w-[42px] justify-center px-0"
                  aria-label={a.diaAnterior}
                  onClick={() => irPara(somarDias(data, -1))}
                >
                  <ChevronLeft size={18} aria-hidden />
                </Button>
                <Button
                  variante="contorno"
                  tamanho="sm"
                  className="h-[42px]"
                  onClick={() => irPara(hoje)}
                  disabled={data === hoje}
                >
                  {a.hoje}
                </Button>
                <Button
                  variante="contorno"
                  tamanho="sm"
                  className="h-[42px] w-[42px] justify-center px-0"
                  aria-label={a.proximoDia}
                  onClick={() => irPara(somarDias(data, 1))}
                >
                  <ChevronRight size={18} aria-hidden />
                </Button>
                <div className="flex flex-col gap-1">
                  <label htmlFor={idData} className="text-[12.5px] text-text-muted">
                    {a.escolherData}
                  </label>
                  <input
                    id={idData}
                    type="date"
                    value={data}
                    onChange={(e) => dataValida(e.target.value) && irPara(e.target.value)}
                    className={cn(classesControle, 'w-auto')}
                  />
                </div>
              </div>
            )}
            <FiltroSelect
              rotulo={a.periodo}
              valor={periodo}
              aoMudar={(p) => definir({ periodo: p === 'dia' && !filtros.pacienteId ? '' : p })}
              opcoes={[
                { valor: 'dia', rotulo: a.periodos.dia },
                { valor: 'futuras', rotulo: a.periodos.futuras },
                { valor: 'todas', rotulo: a.periodos.todas },
              ]}
            />
            <FiltroSelect
              rotulo={a.medico}
              valor={filtros.medicoId}
              aoMudar={(medicoId) => definir({ medicoId })}
              opcoes={[
                { valor: '', rotulo: a.todosMedicos },
                ...(medicos.data?.itens ?? []).map((m) => ({
                  valor: m.id,
                  rotulo: m.nomeExibicao,
                })),
              ]}
            />
            <FiltroSelect
              rotulo={a.departamento}
              valor={filtros.departamentoId}
              aoMudar={(departamentoId) => definir({ departamentoId })}
              opcoes={[
                { valor: '', rotulo: a.todosDepartamentos },
                ...departamentos.map((d) => ({ valor: d.id, rotulo: d.nome })),
              ]}
            />
            <FiltroSelect
              rotulo={a.status}
              valor={filtros.status}
              aoMudar={(status) => {
                setSelecionados(new Set());
                definir({ status });
              }}
              opcoes={[
                { valor: '', rotulo: a.todosStatus },
                ...STATUS.map((s) => ({ valor: s, rotulo: t.status[s] })),
                { valor: 'pendentes', rotulo: a.pendentes },
              ]}
            />
            <div
              role="group"
              aria-label={a.visao}
              className="flex rounded-lg border border-border-input"
            >
              {botaoVisao('horario', a.porHorario, LayoutList)}
              {botaoVisao('medico', a.porMedico, Users)}
            </div>
            {haFiltros && (
              <Button
                variante="contorno"
                tamanho="sm"
                className="h-[42px]"
                iconeEsquerda={<X size={15} />}
                onClick={limpar}
              >
                {t.lista.limparFiltros}
              </Button>
            )}
          </div>
          {filtros.pacienteId && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-light/60 py-1 pr-1 pl-3 text-[13px]">
              {a.filtroPaciente(paciente.data ? nomeExibicaoPaciente(paciente.data) : '…')}
              <button
                type="button"
                aria-label={a.removerFiltroPaciente}
                onClick={() => definir({ pacienteId: '' })}
                className="inline-flex size-6 items-center justify-center rounded-full hover:bg-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X size={14} aria-hidden />
              </button>
            </p>
          )}
        </Card>

        {agenda.data && <ResumoDia consultas={doPeriodo} />}

        {pendentes && selecionaveis.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <label className="inline-flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={marcados.length === selecionaveis.length}
                ref={(el) => {
                  if (el)
                    el.indeterminate =
                      marcados.length > 0 && marcados.length < selecionaveis.length;
                }}
                onChange={(e) => setSelecionados(new Set(e.target.checked ? selecionaveis : []))}
                className="size-[18px] accent-primary"
              />
              {a.selecionarTodas}
            </label>
            <span className="text-[13.5px] text-text-muted" aria-live="polite">
              {a.lote.selecionadas(marcados.length)}
            </span>
            <span className="flex-1" />
            <Button
              tamanho="sm"
              disabled={marcados.length === 0}
              onClick={() => void lote('concluida')}
            >
              {a.lote.concluir}
            </Button>
            <Button
              tamanho="sm"
              variante="contorno"
              disabled={marcados.length === 0}
              onClick={() => void lote('faltou')}
            >
              {a.lote.faltou}
            </Button>
          </div>
        )}

        {agenda.erro ? (
          <ErrorState aoTentarNovamente={agenda.recarregar} />
        ) : !agenda.data ? (
          <SkeletonLinhas />
        ) : visiveis.length === 0 ? (
          <Card>
            <EmptyState
              mensagem={
                periodo === 'dia' && !statusFiltro && !haFiltros
                  ? a.vazioDia(formatarData(data))
                  : a.vazioFiltros
              }
              acao={
                periodo === 'dia' && !haFiltros
                  ? { rotulo: a.nova, aoClicar: () => navigate(novaConsultaUrl) }
                  : { rotulo: t.lista.limparFiltros, aoClicar: limpar }
              }
            />
          </Card>
        ) : (
          <ListaAgenda
            consultas={visiveis}
            visao={visao}
            variosDias={periodo !== 'dia'}
            acoes={{
              concluir: (c) => void acoes.concluir(c),
              faltou: (c) => void acoes.faltou(c),
              cancelar: acoes.cancelar,
            }}
            selecao={pendentes ? { selecionados, aoMudar: setSelecionados } : undefined}
          />
        )}
      </div>
      {acoes.dialogo}
    </>
  );
}

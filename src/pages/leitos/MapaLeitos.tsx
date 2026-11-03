import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { GradeLeitos } from '../../components/leitos/GradeLeitos';
import { PainelSolicitacoes } from '../../components/leitos/PainelSolicitacoes';
import { AbasModulo } from '../../components/ui/AbasModulo';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { Checkbox } from '../../components/ui/form/Checkbox';
import { BarraFiltros, FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { ResumoNumeros, type ItemResumo } from '../../components/ui/ResumoNumeros';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { SETORES } from '../../config/setores';
import { useAcoesLeito } from '../../hooks/useAcoesLeito';
import { useColecao } from '../../hooks/useColecao';
import {
  useIndicadoresLeitos,
  useMapaLeitos,
  useSolicitacoes,
} from '../../hooks/useDadosOperacoes';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import { tl } from '../../i18n/pt-BR/leitos';
import { COLECOES } from '../../services/colecoes-operacoes';
import { buscarPacienteNoMapa } from '../../services/leitos';
import type { FiltrosLeitos, PerfilLeito, SetorId, StatusLeito } from '../../types';
import { abasLeitos } from './abas';

const PADROES = { paciente: '', setor: '', situacao: '', perfil: '', isolamento: '' };
const STATUS: StatusLeito[] = ['livre', 'ocupado', 'reservado', 'higienizacao', 'bloqueado'];
const PERFIS: PerfilLeito[] = ['adulto', 'pediatrico'];

/** /leitos — mapa de leitos (L4, L5, L6, L9): resumo, filtros na URL, busca e pedidos. */
export default function MapaLeitos() {
  const { filtros, definir, limpar, haFiltros } = useFiltrosUrl(PADROES);
  const criterio: FiltrosLeitos = {
    ...(SETORES.some((x) => x.id === filtros.setor) ? { setorId: filtros.setor as SetorId } : {}),
    ...(STATUS.includes(filtros.situacao as StatusLeito)
      ? { status: filtros.situacao as StatusLeito }
      : {}),
    ...(PERFIS.includes(filtros.perfil as PerfilLeito)
      ? { perfil: filtros.perfil as PerfilLeito }
      : {}),
    ...(filtros.isolamento === '1' ? { soIsolamento: true } : {}),
  };
  const leitos = useMapaLeitos(criterio);
  const indicadores = useIndicadoresLeitos();
  const solicitacoes = useSolicitacoes();
  const acoes = useAcoesLeito();

  // M24: busca de paciente no mapa (destaca, rola até o leito e move o foco).
  const termo = filtros.paciente.trim();
  const achados = useColecao(
    () => (termo ? buscarPacienteNoMapa(termo) : Promise.resolve(null)),
    [termo],
    COLECOES.leitos,
  );
  const destacados = useMemo(() => new Set((achados.data ?? []).map((l) => l.id)), [achados.data]);
  const focadoPara = useRef('');
  useEffect(() => {
    const primeiro = achados.data?.[0];
    if (!primeiro || !leitos.data || focadoPara.current === termo) return;
    const link = document.querySelector<HTMLElement>(`[data-leito="${primeiro.codigo}"] a`);
    if (!link) return;
    focadoPara.current = termo;
    link.scrollIntoView?.({ block: 'center' });
    link.focus();
  }, [achados.data, leitos.data, termo]);

  const ind = indicadores.data;
  const resumo: ItemResumo[] = ind
    ? [
        ...ind.setores.map((x) => ({
          rotulo: x.nome,
          valor: x.ocupados,
          complemento: tl.mapa.ocupados(x.operacionais, x.percentual),
          para: `/leitos?setor=${x.setorId}`,
        })),
        { rotulo: tl.mapa.livres, valor: ind.disponiveis, para: '/leitos?situacao=livre' },
        {
          rotulo: tl.mapa.higienizacao,
          valor: ind.higienizacao,
          para: '/leitos?situacao=higienizacao',
        },
        { rotulo: tl.mapa.bloqueados, valor: ind.bloqueados, para: '/leitos?situacao=bloqueado' },
        { rotulo: tl.mapa.reservados, valor: ind.reservados, para: '/leitos?situacao=reservado' },
        {
          rotulo: tl.mapa.previsao,
          valor: ind.liberacoesPrevistas24h,
          complemento: tl.mapa.previsaoComplemento,
        },
      ]
    : [];
  const ocupacao = Object.fromEntries(
    (ind?.setores ?? []).map((x) => [
      x.setorId,
      { ocupados: x.ocupados, operacionais: x.operacionais },
    ]),
  );

  return (
    <>
      <CabecalhoPagina
        titulo={tl.titulo}
        descricao={tl.mapa.descricao}
        acoes={
          <ButtonLink to="/leitos/internar" iconeEsquerda={<Plus size={18} />}>
            {tl.internarPaciente}
          </ButtonLink>
        }
      />
      <AbasModulo rotulo={tl.abasRotulo} abas={abasLeitos} className="mb-5" />

      {ind ? (
        <ResumoNumeros rotulo={tl.mapa.resumoRotulo} itens={resumo} className="mb-5" />
      ) : (
        <div aria-busy="true" className="mb-5">
          <SkeletonLinhas linhas={1} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0">
          <BarraFiltros
            busca={filtros.paciente}
            aoBuscar={(paciente) => {
              focadoPara.current = '';
              definir({ paciente });
            }}
            rotuloBusca={tl.mapa.buscarPaciente}
            placeholder={tl.mapa.buscarPacientePlaceholder}
            filtrosAtivos={haFiltros}
            aoLimpar={limpar}
            className="mb-3"
          >
            <FiltroSelect
              rotulo={tl.setor}
              valor={criterio.setorId ?? ''}
              aoMudar={(setor) => definir({ setor })}
              opcoes={[
                { valor: '', rotulo: tl.todos },
                ...SETORES.map((x) => ({ valor: x.id, rotulo: x.nome })),
              ]}
            />
            <FiltroSelect
              rotulo={tl.situacao}
              valor={criterio.status ?? ''}
              aoMudar={(situacao) => definir({ situacao })}
              opcoes={[
                { valor: '', rotulo: tl.todas },
                ...STATUS.map((x) => ({ valor: x, rotulo: tl.status[x] })),
              ]}
            />
            <FiltroSelect
              rotulo={tl.perfil}
              valor={criterio.perfil ?? ''}
              aoMudar={(perfil) => definir({ perfil })}
              opcoes={[
                { valor: '', rotulo: tl.todos },
                ...PERFIS.map((x) => ({ valor: x, rotulo: tl.perfis[x] })),
              ]}
            />
            <Checkbox
              rotulo={tl.soIsolamento}
              checked={filtros.isolamento === '1'}
              onChange={(e) => definir({ isolamento: e.target.checked ? '1' : '' })}
              className="pb-2.5"
            />
          </BarraFiltros>

          {termo && achados.data && (
            <p
              role="status"
              className={
                achados.data.length > 0
                  ? 'mb-4 text-[13.5px] font-medium text-on-primary-light'
                  : 'mb-4 rounded-lg bg-bg px-4 py-2.5 text-[13.5px]'
              }
            >
              {achados.data.length > 0
                ? tl.mapa.achados(achados.data.length)
                : tl.mapa.naoInternado(termo)}
            </p>
          )}

          {leitos.erro ? (
            <ErrorState aoTentarNovamente={leitos.recarregar} />
          ) : !leitos.data ? (
            <div aria-busy="true">
              <SkeletonLinhas linhas={6} />
            </div>
          ) : leitos.data.length === 0 ? (
            <EmptyState
              mensagem={tl.mapa.nenhumComFiltros}
              acao={{ rotulo: t.lista.limparFiltros, aoClicar: limpar }}
            />
          ) : (
            <GradeLeitos
              leitos={leitos.data}
              ocupacao={ocupacao}
              destacados={destacados}
              aoAcao={acoes.executar}
              aoConcluirSetor={acoes.concluirSetor}
            />
          )}
        </Card>

        <PainelSolicitacoes
          solicitacoes={solicitacoes.data}
          tratarErro={acoes.tratarErro}
          className="order-first lg:order-last"
        />
      </div>
      {acoes.dialogos}
    </>
  );
}

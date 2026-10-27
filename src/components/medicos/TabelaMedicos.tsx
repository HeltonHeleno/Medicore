import { CalendarDays, CalendarPlus, Eye, Pencil, UserCheck, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrigem } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import type { MedicoResumo, Paginado } from '../../types';
import { Avatar } from '../ui/Avatar';
import { BadgeSituacao } from '../ui/BadgeSituacao';
import { DataTable, type Coluna, type OrdenacaoTabela } from '../ui/lista/DataTable';
import { MenuAcoes } from '../ui/lista/MenuAcoes';

const m = t.medicos;

interface TabelaMedicosProps {
  dados: Paginado<MedicoResumo> | null;
  carregando: boolean;
  erro: Error | null;
  aoTentarNovamente: () => void;
  ordenacao: OrdenacaoTabela;
  aoOrdenar: (coluna: string) => void;
  mensagemVazia: string;
  acaoVazia?: { rotulo: string; aoClicar: () => void };
  cartoes: boolean;
  aoInativar: (alvo: MedicoResumo) => void;
  aoReativar: (alvo: MedicoResumo) => void;
}

/** Lista do corpo clínico: CRM, departamento, dias de atendimento e consultas de hoje. */
export function TabelaMedicos({
  dados,
  cartoes,
  aoInativar,
  aoReativar,
  ...resto
}: TabelaMedicosProps) {
  const origem = useOrigem();
  const colunas: Coluna<MedicoResumo>[] = [
    {
      id: 'nome',
      titulo: m.colunas.nome,
      ordenavel: true,
      celula: (r) => (
        <span className="flex items-center gap-2.5">
          <Avatar
            nome={r.nomeExibicao}
            tamanho={30}
            className="hidden ring-0 @min-[640px]:inline-flex"
          />
          <Link
            to={`/medicos/${r.id}`}
            state={origem}
            className="rounded font-semibold text-text hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {r.nomeExibicao}
          </Link>
        </span>
      ),
    },
    {
      id: 'crm',
      titulo: m.colunas.crm,
      celula: (r) => <span className="tabular-nums">{r.crmFormatado}</span>,
    },
    {
      id: 'departamento',
      titulo: m.colunas.departamento,
      ordenavel: true,
      celula: (r) => r.departamentoNome,
    },
    {
      id: 'dias',
      titulo: m.colunas.dias,
      celula: (r) => <span className="whitespace-nowrap">{r.diasResumo}</span>,
    },
    {
      id: 'consultasHoje',
      titulo: m.colunas.consultasHoje,
      celula: (r) => <span className="tabular-nums">{r.consultasHoje}</span>,
    },
    { id: 'status', titulo: m.colunas.status, celula: (r) => <BadgeSituacao ativo={r.ativo} /> },
  ];

  return (
    <DataTable
      legenda={m.legendaTabela}
      colunas={colunas}
      linhas={dados?.itens ?? null}
      chave={(r) => r.id}
      nomeDaLinha={(r) => r.nomeExibicao}
      forcarCartoes={cartoes}
      {...resto}
      acoes={(r) => (
        <MenuAcoes
          nome={r.nomeExibicao}
          acoes={[
            { rotulo: m.acoes.ver, icone: Eye, href: `/medicos/${r.id}` },
            { rotulo: m.acoes.editar, icone: Pencil, href: `/medicos/${r.id}/editar` },
            { rotulo: m.acoes.verAgenda, icone: CalendarDays, href: `/consultas?medicoId=${r.id}` },
            ...(r.ativo
              ? [
                  {
                    rotulo: m.acoes.agendar,
                    icone: CalendarPlus,
                    href: `/consultas/nova?medicoId=${r.id}`,
                  },
                  {
                    rotulo: m.acoes.inativar,
                    icone: UserX,
                    perigo: true,
                    aoClicar: () => aoInativar(r),
                  },
                ]
              : [{ rotulo: m.acoes.reativar, icone: UserCheck, aoClicar: () => aoReativar(r) }]),
          ]}
        />
      )}
    />
  );
}

import { AlertTriangle, CalendarPlus, Eye, Pencil, UserCheck, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAcoesPaciente } from '../../hooks/useAcoesPaciente';
import { useOrigem } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import type { PacienteResumo, Paginado } from '../../types';
import { formatarDataHora } from '../../utils/datas';
import { mascararTelefone } from '../../utils/mascaras';
import { Avatar } from '../ui/Avatar';
import { BadgeSituacao } from '../ui/BadgeSituacao';
import { DataTable, type Coluna, type OrdenacaoTabela } from '../ui/lista/DataTable';
import { MenuAcoes } from '../ui/lista/MenuAcoes';

const p = t.pacientes;

interface TabelaPacientesProps {
  dados: Paginado<PacienteResumo> | null;
  carregando: boolean;
  erro: Error | null;
  aoTentarNovamente: () => void;
  ordenacao: OrdenacaoTabela;
  aoOrdenar: (coluna: string) => void;
  mensagemVazia: string;
  acaoVazia?: { rotulo: string; aoClicar: () => void };
}

/** Lista de pacientes: nome de exibição (R-P6), CPF mascarado (R-P4), alergia sinalizada. */
export function TabelaPacientes({ dados, ...resto }: TabelaPacientesProps) {
  const origem = useOrigem();
  const acoes = useAcoesPaciente();

  const colunas: Coluna<PacienteResumo>[] = [
    {
      id: 'nome',
      titulo: p.colunas.nome,
      ordenavel: true,
      celula: (r) => (
        <span className="flex items-center gap-2.5">
          <Avatar
            nome={r.nomeExibicao}
            tamanho={30}
            className="hidden ring-0 @min-[640px]:inline-flex"
          />
          <Link
            to={`/pacientes/${r.id}`}
            state={origem}
            className="rounded font-semibold text-text hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {r.nomeExibicao}
          </Link>
          {r.temAlergias && (
            <span title={p.possuiAlergias} className="inline-flex text-danger">
              <AlertTriangle size={15} aria-hidden />
              <span className="sr-only">{p.possuiAlergias}</span>
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'cpf',
      titulo: p.colunas.cpf,
      celula: (r) => <span className="tabular-nums">{r.cpfMascarado}</span>,
    },
    { id: 'idade', titulo: p.colunas.idade, ordenavel: true, celula: (r) => p.anos(r.idade) },
    {
      id: 'telefone',
      titulo: p.colunas.telefone,
      celula: (r) => <span className="whitespace-nowrap">{mascararTelefone(r.telefone)}</span>,
    },
    { id: 'convenio', titulo: p.colunas.convenio, celula: (r) => r.convenioNome },
    {
      id: 'proximaConsulta',
      titulo: p.colunas.proximaConsulta,
      ordenavel: true,
      celula: (r) =>
        r.proximaConsulta ? (
          <span className="whitespace-nowrap tabular-nums">
            {formatarDataHora(r.proximaConsulta)}
          </span>
        ) : (
          <span className="text-text-muted">{p.semConsulta}</span>
        ),
    },
    { id: 'status', titulo: p.colunas.status, celula: (r) => <BadgeSituacao ativo={r.ativo} /> },
  ];

  return (
    <DataTable
      legenda={p.legendaTabela}
      colunas={colunas}
      linhas={dados?.itens ?? null}
      chave={(r) => r.id}
      nomeDaLinha={(r) => r.nomeExibicao}
      carregando={resto.carregando}
      erro={resto.erro}
      aoTentarNovamente={resto.aoTentarNovamente}
      ordenacao={resto.ordenacao}
      aoOrdenar={resto.aoOrdenar}
      mensagemVazia={resto.mensagemVazia}
      acaoVazia={resto.acaoVazia}
      acoes={(r) => (
        <MenuAcoes
          nome={r.nomeExibicao}
          acoes={[
            { rotulo: p.acoes.ver, icone: Eye, href: `/pacientes/${r.id}` },
            { rotulo: p.acoes.editar, icone: Pencil, href: `/pacientes/${r.id}/editar` },
            ...(r.ativo
              ? [
                  {
                    rotulo: p.acoes.agendar,
                    icone: CalendarPlus,
                    href: `/consultas/nova?pacienteId=${r.id}`,
                  },
                  {
                    rotulo: p.acoes.inativar,
                    icone: UserX,
                    perigo: true,
                    aoClicar: () => void acoes.inativar(r),
                  },
                ]
              : [
                  {
                    rotulo: p.acoes.reativar,
                    icone: UserCheck,
                    aoClicar: () => void acoes.reativar(r),
                  },
                ]),
          ]}
        />
      )}
    />
  );
}

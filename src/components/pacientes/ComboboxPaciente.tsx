import { Info } from 'lucide-react';
import { useCallback, useEffect, useRef, type Ref } from 'react';
import { t } from '../../i18n/pt-BR';
import { listarPacientes } from '../../services/pacientes';
import { assinar } from '../../services/repositorio';
import type { Paciente, PacienteResumo } from '../../types';
import { idade } from '../../utils/datas';
import { Combobox } from '../ui/form/Combobox';
import { AlertaAlergias } from './AlertaAlergias';

export type OpcaoPaciente = Pick<PacienteResumo, 'id' | 'nomeExibicao' | 'cpfMascarado'> & {
  /** Situação hospitalar ("Internado em UTI-07", "Emergência E-0039"). */
  etiqueta?: string;
};

/** Só pacientes com internação ativa ou atendimento aberto (destino da dispensação, R-F12). */
export type FiltroPaciente = 'internados_ou_em_atendimento';

interface ComboboxPacienteProps {
  valor: OpcaoPaciente | null;
  aoMudar: (valor: OpcaoPaciente | null) => void;
  aoSair?: () => void;
  filtro?: FiltroPaciente;
  /** Mostra a etiqueta da situação hospitalar ao lado do nome (ligada sempre com `filtro`). */
  mostrarSituacao?: boolean;
  name?: string;
  ref?: Ref<HTMLInputElement>;
}

const POR_PAGINA = 10;

/** Situação hospitalar sob demanda: os serviços dos módulos não entram no pacote da página. */
const carregarEtiquetas = () =>
  import('../../services/situacao-hospitalar').then((m) => m.etiquetasHospitalares());

/**
 * Busca de paciente **ativo** por nome, nome social ou CPF (extraída do `FormConsulta`).
 * Teclado e leitura iguais aos do `Combobox`; a etiqueta faz parte do texto da opção,
 * então o leitor de tela a anuncia junto com o nome.
 */
export function ComboboxPaciente({
  valor,
  aoMudar,
  aoSair,
  filtro,
  mostrarSituacao,
  name,
  ref,
}: ComboboxPacienteProps) {
  const comSituacao = Boolean(filtro || mostrarSituacao);
  const etiquetas = useRef<Promise<Record<string, string>> | null>(null);

  // Internou, deu alta ou encerrou (nesta aba ou em outra): a próxima busca relê as etiquetas.
  useEffect(() => {
    if (!comSituacao) return;
    return assinar(() => {
      etiquetas.current = null;
    });
  }, [comSituacao]);

  const buscar = useCallback(
    async (termo: string): Promise<OpcaoPaciente[]> => {
      const pagina = await listarPacientes({
        busca: termo,
        status: 'ativos',
        // Com filtro, busca mais para sobrar o suficiente depois de filtrar.
        porPagina: filtro ? 500 : POR_PAGINA,
      });
      if (!comSituacao) return pagina.itens;
      etiquetas.current ??= carregarEtiquetas();
      const mapa = await etiquetas.current;
      return pagina.itens
        .filter((p) => !filtro || p.id in mapa)
        .slice(0, POR_PAGINA)
        .map((p) => ({ ...p, etiqueta: mapa[p.id] }));
    },
    [filtro, comSituacao],
  );

  return (
    <Combobox
      ref={ref}
      name={name}
      buscar={buscar}
      valor={valor}
      aoMudar={aoMudar}
      aoSair={aoSair}
      paraTexto={(p) => p.nomeExibicao}
      chave={(p) => p.id}
      renderizarOpcao={(p) => (
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span>
            {p.nomeExibicao}
            {p.etiqueta && (
              <span className="ml-2 text-[12.5px] font-medium text-on-primary-light">
                {p.etiqueta}
              </span>
            )}
          </span>
          <span className="text-[12.5px] text-text-muted tabular-nums">{p.cpfMascarado}</span>
        </span>
      )}
    />
  );
}

/**
 * Resumo do paciente escolhido: idade, convênio e alergias em destaque. Com
 * `avisarNaoInformadas`, o campo vazio aparece como "Alergias não informadas" (R-F15),
 * que não é o mesmo que "sem alergias".
 */
export function ResumoPaciente({
  paciente,
  avisarNaoInformadas,
}: {
  paciente: Paciente;
  avisarNaoInformadas?: boolean;
}) {
  const semAlergias = !paciente.alergias?.trim();
  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-text-muted">
        {t.agenda.resumoPaciente(
          t.pacientes.anos(idade(paciente.dataNascimento)),
          paciente.convenio.tipo === 'convenio' ? paciente.convenio.nome : t.convenio.particular,
        )}
      </p>
      <AlertaAlergias alergias={paciente.alergias} />
      {avisarNaoInformadas && semAlergias && (
        <p className="flex items-start gap-2 rounded-lg border border-warning/40 px-3 py-2 text-[13.5px] font-medium text-warning">
          <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
          {t.pacientes.alergiasNaoInformadas}
        </p>
      )}
    </div>
  );
}

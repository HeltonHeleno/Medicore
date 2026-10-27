import { useAgenda } from '../../hooks/useDados';
import { t } from '../../i18n/pt-BR';
import { hojeNoFuso, somarDias } from '../../utils/datas';
import { calcularIndicadores } from '../../utils/indicadores';
import { Card } from '../ui/Card';

const m = t.medicos;
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

/** Mês corrente (no fuso do hospital): primeiro e último dia. */
function limitesDoMes(hoje: string) {
  const inicio = `${hoje.slice(0, 7)}-01`;
  const [ano, mes] = hoje.split('-').map(Number);
  const proximo = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
  return { de: inicio, ate: somarDias(proximo, -1) };
}

/** Consultas no mês, taxa de faltas (faltou ÷ (concluída + faltou)) e cancelamentos. */
export function IndicadoresMedico({ medicoId }: { medicoId: string }) {
  const { de, ate } = limitesDoMes(hojeNoFuso());
  const { data } = useAgenda({ medicoId, de, ate });
  const ind = calcularIndicadores(data ?? []);
  const itens = [
    { rotulo: m.indicadores.consultas, valor: data ? String(ind.consultas) : '—' },
    {
      rotulo: m.indicadores.taxaFaltas,
      valor: data && ind.taxaFaltas !== null ? pct.format(ind.taxaFaltas) : '—',
      dica: m.indicadores.taxaFaltasDica,
    },
    { rotulo: m.indicadores.cancelamentos, valor: data ? String(ind.cancelamentos) : '—' },
  ];
  return (
    <Card titulo={m.cards.indicadores}>
      <dl className="grid grid-cols-3 gap-3">
        {itens.map((i) => (
          <div key={i.rotulo} className="rounded-lg bg-bg p-3">
            <dt className="text-[12.5px] text-text-muted" title={i.dica}>
              {i.rotulo}
            </dt>
            <dd className="mt-1 text-[22px] font-bold tabular-nums">{i.valor}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

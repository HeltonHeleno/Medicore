/**
 * PAINEL PROVISÓRIO.
 * Mostra os dados mockados vindos do serviço simulado, já formatados em pt-BR.
 * Já usa os componentes base da Fase 4; os cards definitivos entram na Fase 5
 * e a grade final na Fase 6.
 */
import type { ReactNode } from 'react';
import {
  useAlertas,
  useAtividades,
  useConsultasHoje,
  useDepartamentos,
  useInsights,
  useInternacoes,
  useKpis,
  useLeitos,
  useResumoDia,
  useUsuario,
} from '../hooks/useDashboardData';
import type { EstadoAsync } from '../hooks/useAsync';
import { Card } from '../components/ui/Card';
import { ConteudoAsync } from '../components/ui/ConteudoAsync';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { t } from '../i18n/pt-BR';
import { formatHora, formatNumero, formatPercentual, formatVariacao } from '../utils/format';
import { resumoLeitos } from '../utils/leitos';

function Bloco<T>({
  titulo,
  estado,
  vazio,
  children,
}: {
  titulo: string;
  estado: EstadoAsync<T>;
  vazio?: string;
  children: (data: T) => ReactNode;
}) {
  return (
    <Card titulo={titulo}>
      <ConteudoAsync estado={estado} vazio={vazio}>
        {children}
      </ConteudoAsync>
    </Card>
  );
}

export default function Dashboard() {
  useDocumentTitle(t.menu.painel);
  const usuario = useUsuario();
  const kpis = useKpis();
  const resumo = useResumoDia();
  const leitos = useLeitos();
  const departamentos = useDepartamentos();
  const semana = useInternacoes('semana');
  const insights = useInsights();
  const alertas = useAlertas();
  const consultas = useConsultasHoje();
  const atividades = useAtividades();

  const linha = 'flex justify-between gap-4 border-b border-border py-1.5 last:border-0';

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            {t.saudacao.manha}
          </p>
          <h1 className="text-2xl font-bold">
            {usuario.data ? t.boasVindas.titulo(usuario.data.tratamento) : t.app.nome}
          </h1>
          {resumo.data && consultas.data && (
            <p className="mt-1 text-text-muted">
              {t.boasVindas.resumo(
                consultas.data.length,
                resumo.data.previsaoOcupacaoUti,
                resumo.data.medicamentosEstoqueBaixo,
              )}
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Bloco titulo={t.kpis.totalPacientes} estado={kpis}>
          {(k) => (
            <ul>
              <li className={linha}>
                <span>{t.kpis.totalPacientes}</span>
                <strong>
                  {formatNumero(k.totalPacientes)}{' '}
                  <span className="font-normal text-text-muted">
                    ({t.kpis.variacao(formatVariacao(k.variacaoPacientes))})
                  </span>
                </strong>
              </li>
              <li className={linha}>
                <span>{t.kpis.medicosPlantao}</span>
                <strong>{formatNumero(k.medicosPlantao)}</strong>
              </li>
              <li className={linha}>
                <span>{t.kpis.casosEmergencia}</span>
                <strong className="text-danger">{formatNumero(k.casosEmergencia)}</strong>
              </li>
            </ul>
          )}
        </Bloco>

        <Bloco titulo={t.leitos.titulo} estado={leitos} vazio={t.vazio.leitos}>
          {(setores) => {
            const r = resumoLeitos(setores);
            return (
              <ul>
                <li className={linha}>
                  <span>{t.kpis.leitosDisponiveis}</span>
                  <strong>
                    {formatNumero(r.disponiveis)}{' '}
                    <span className="font-normal text-text-muted">
                      {t.kpis.deTotalLeitos(formatNumero(r.total))}
                    </span>
                  </strong>
                </li>
                <li className={linha}>
                  <span>{t.leitos.ocupados}</span>
                  <strong>
                    {t.leitos.leitos(r.ocupados)} · {formatPercentual(r.percentual)}
                  </strong>
                </li>
                {setores.map((s) => (
                  <li key={s.id} className={linha}>
                    <span>{s.nome}</span>
                    <strong>
                      {s.ocupados}/{s.total}
                    </strong>
                  </li>
                ))}
              </ul>
            );
          }}
        </Bloco>

        <Bloco titulo={t.departamentos.titulo} estado={departamentos} vazio={t.vazio.departamentos}>
          {(lista) => (
            <ul>
              {lista.map((d) => (
                <li key={d.id} className="py-2">
                  <div className="mb-1.5 flex justify-between">
                    <span>{d.nome}</span>
                    <span>{formatPercentual(d.desempenho)}</span>
                  </div>
                  <ProgressBar
                    valor={d.desempenho}
                    rotulo={d.nome}
                    cor={d.desempenho >= 90 ? 'perigo' : 'primaria'}
                  />
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco
          titulo={`${t.internacoes.titulo} · ${t.internacoes.periodos.semana}`}
          estado={semana}
          vazio={t.vazio.internacoes}
        >
          {(pontos) => (
            <ul>
              {pontos.map((p) => (
                <li key={p.rotulo} className={linha}>
                  <span>{p.rotulo}</span>
                  <span>{t.internacoes.tooltip(p.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco titulo={t.ia.insightsHoje} estado={insights} vazio={t.vazio.insights}>
          {(lista) => (
            <ul className="list-disc pl-5">
              {lista.map((i) => (
                <li key={i.id} className="py-1">
                  {i.texto}
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco titulo={t.alertas.titulo} estado={alertas} vazio={t.vazio.alertas}>
          {(lista) => (
            <ul>
              {lista.map((a) => (
                <li key={a.id} className={linha}>
                  <span>
                    {a.titulo} — {a.local}
                    <span className="block text-xs text-danger">{a.medico}</span>
                  </span>
                  <PriorityBadge
                    prioridade={a.prioridade}
                    className="self-start border border-border"
                  />
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco titulo={t.consultas.titulo} estado={consultas} vazio={t.vazio.consultas}>
          {(lista) => (
            <ul>
              {lista.map((c) => (
                <li key={c.id} className={linha}>
                  <span>
                    {formatHora(c.horario)} · {c.paciente}
                    <span className="block text-xs text-text-muted">{c.departamento}</span>
                  </span>
                  <StatusBadge status={c.status} className="self-start" />
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco titulo={t.atividades.titulo} estado={atividades} vazio={t.vazio.atividades}>
          {(lista) => (
            <ul>
              {lista.map((a) => (
                <li key={a.id} className={linha}>
                  <span>{a.descricao}</span>
                  <time dateTime={a.horario} className="text-text-muted">
                    {formatHora(a.horario)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Bloco>
      </div>
    </div>
  );
}

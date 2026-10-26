import { CalendarDays, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SkeletonLinhas } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { t } from '../i18n/pt-BR';

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card titulo={titulo}>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </Card>
  );
}

/** Vitrine interna dos componentes base (rota /ui, só em desenvolvimento). */
export default function UiShowcase() {
  useDocumentTitle(t.vitrine.titulo);
  const v = t.vitrine;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{v.titulo}</h1>
        <p className="text-text-muted">{v.descricao}</p>
      </div>

      <Grupo titulo={v.botoes}>
        <Button>{v.primario}</Button>
        <Button variante="contorno">{v.contorno}</Button>
        <Button variante="suave">{v.suave}</Button>
        <Button tamanho="sm">{v.pequeno}</Button>
        <Button disabled>{v.desabilitado}</Button>
        <ButtonLink to="/consultas" iconeEsquerda={<CalendarDays size={17} />}>
          {t.boasVindas.verAgenda}
        </ButtonLink>
        <ButtonLink to="/leitos" variante="contorno">
          {t.boasVindas.revisarUti}
        </ButtonLink>
        <div className="w-full max-w-xs">
          <Button variante="suave" largo iconeDireita={<ChevronRight size={18} />}>
            {t.ia.verTodos}
          </Button>
        </div>
      </Grupo>

      <div className="grid gap-5 md:grid-cols-2">
        <Card titulo={v.cardPadrao} acao={{ rotulo: t.consultas.verTodas, href: '/consultas' }}>
          <p>{v.conteudoCard}</p>
        </Card>
        <Card
          titulo={v.cardPerigo}
          variante="perigo"
          acao={{ rotulo: t.alertas.verTodos, href: '/emergencia' }}
        >
          <div className="flex items-center justify-between">
            <p>{v.conteudoCard}</p>
            <div className="flex gap-2">
              <PriorityBadge prioridade="alta" />
              <PriorityBadge prioridade="media" />
            </div>
          </div>
        </Card>
      </div>

      <Card titulo={v.progresso}>
        <div className="max-w-md space-y-4">
          {[
            { nome: 'Cardiologia', valor: 88 },
            { nome: 'Emergência', valor: 93, perigo: true },
            { nome: 'Pediatria', valor: 65 },
          ].map((d) => (
            <div key={d.nome}>
              <div className="mb-1.5 flex justify-between text-[14px]">
                <span>{d.nome}</span>
                <span>{d.valor}%</span>
              </div>
              <ProgressBar valor={d.valor} rotulo={d.nome} cor={d.perigo ? 'perigo' : 'primaria'} />
            </div>
          ))}
        </div>
      </Card>

      <Grupo titulo={v.badges}>
        <StatusBadge status="concluida" />
        <StatusBadge status="agendada" />
        <StatusBadge status="cancelada" />
        <PriorityBadge prioridade="alta" className="border border-border" />
        <PriorityBadge prioridade="media" className="border border-border" />
        <PriorityBadge prioridade="baixa" className="border border-border" />
      </Grupo>

      <div className="grid gap-5 md:grid-cols-3">
        <Card titulo={v.carregando}>
          <SkeletonLinhas />
        </Card>
        <Card titulo={v.vazio}>
          <EmptyState mensagem={t.vazio.consultas} />
        </Card>
        <Card titulo={v.erro}>
          <ErrorState aoTentarNovamente={() => undefined} />
        </Card>
      </div>
    </div>
  );
}

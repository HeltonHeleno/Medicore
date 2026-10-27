import { CalendarDays } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useConsultasHoje, useResumoDia, useUsuario } from '../../hooks/useDashboardData';
import { useGreeting } from '../../hooks/useGreeting';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { IlustracaoMedico } from './IlustracaoMedico';

export function WelcomeCard({ className }: { className?: string }) {
  const saudacao = useGreeting();
  const usuario = useUsuario();
  const resumo = useResumoDia();
  const consultas = useConsultasHoje();

  // Canceladas não contam como "consultas hoje".
  const consultasHoje = consultas.data?.filter((c) => c.status !== 'cancelada').length;
  const resumoPronto = resumo.data && consultasHoje !== undefined;
  const resumoCarregando = resumo.carregando || consultas.carregando;

  return (
    <section
      aria-labelledby="titulo-boas-vindas"
      className={cn(
        'relative flex overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="relative z-10 flex flex-1 flex-col justify-center p-5 sm:p-6 lg:py-7">
        <p className="text-[12px] font-semibold tracking-[0.06em] text-on-primary-light uppercase">
          {saudacao}
        </p>
        <h1
          id="titulo-boas-vindas"
          className="mt-2 max-w-[30rem] text-[24px] leading-tight font-bold sm:text-[28px]"
        >
          {usuario.data ? (
            t.boasVindas.titulo(usuario.data.tratamento)
          ) : usuario.carregando ? (
            <Skeleton largura="80%" altura={30} />
          ) : (
            t.boasVindas.tituloSemNome
          )}
        </h1>

        <div className="mt-3 max-w-[30rem] text-[14px] leading-relaxed text-text-muted">
          {resumoPronto ? (
            <p>
              {t.boasVindas.resumo(
                consultasHoje!,
                resumo.data!.previsaoOcupacaoUti,
                resumo.data!.medicamentosEstoqueBaixo,
              )}
            </p>
          ) : resumoCarregando ? (
            <Skeleton largura="90%" altura={16} />
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink to="/consultas" iconeEsquerda={<CalendarDays size={17} />}>
            {t.boasVindas.verAgenda}
          </ButtonLink>
          <ButtonLink to="/leitos" variante="contorno">
            {t.boasVindas.revisarUti}
          </ButtonLink>
        </div>
      </div>

      <div className="hidden w-[300px] shrink-0 items-end self-stretch pt-4 pr-4 md:flex xl:w-[250px] 2xl:w-[320px]">
        <IlustracaoMedico className="h-auto w-full" />
      </div>
    </section>
  );
}

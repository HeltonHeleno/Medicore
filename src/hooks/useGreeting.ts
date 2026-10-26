import { useEffect, useState } from 'react';
import { t } from '../i18n/pt-BR';

/** 5h–11h59 → Bom dia · 12h–17h59 → Boa tarde · 18h–4h59 → Boa noite */
export function saudacaoPorHora(hora: number): string {
  if (hora >= 5 && hora < 12) return t.saudacao.manha;
  if (hora >= 12 && hora < 18) return t.saudacao.tarde;
  return t.saudacao.noite;
}

/** Saudação conforme o horário local; reavalia a cada minuto para virar no momento certo. */
export function useGreeting(): string {
  const [hora, setHora] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHora(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);
  return saudacaoPorHora(hora);
}

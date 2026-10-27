import { useEffect, useState } from 'react';
import { t } from '../i18n/pt-BR';
import { partesNoFuso } from '../utils/datas';
import { agora } from '../utils/relogio';

/** 5h–11h59 → Bom dia · 12h–17h59 → Boa tarde · 18h–4h59 → Boa noite */
export function saudacaoPorHora(hora: number): string {
  if (hora >= 5 && hora < 12) return t.saudacao.manha;
  if (hora >= 12 && hora < 18) return t.saudacao.tarde;
  return t.saudacao.noite;
}

/** Saudação conforme o horário do hospital; reavalia a cada minuto para virar no momento certo. */
export function useGreeting(): string {
  const [hora, setHora] = useState(() => partesNoFuso(agora()).hora);
  useEffect(() => {
    const id = setInterval(() => setHora(partesNoFuso(agora()).hora), 60_000);
    return () => clearInterval(id);
  }, []);
  return saudacaoPorHora(hora);
}

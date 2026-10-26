import {
  BarChart3,
  BedDouble,
  CalendarDays,
  House,
  Pill,
  Settings,
  Siren,
  Stethoscope,
  User,
  type LucideIcon,
} from 'lucide-react';
import { t } from '../i18n/pt-BR';

export interface ItemNavegacao {
  caminho: string;
  rotulo: string;
  icone: LucideIcon;
}

/** Itens do menu lateral, na ordem em que aparecem. Também definem as rotas. */
export const itensNavegacao: ItemNavegacao[] = [
  { caminho: '/', rotulo: t.menu.painel, icone: House },
  { caminho: '/pacientes', rotulo: t.menu.pacientes, icone: User },
  { caminho: '/medicos', rotulo: t.menu.medicos, icone: Stethoscope },
  { caminho: '/consultas', rotulo: t.menu.consultas, icone: CalendarDays },
  { caminho: '/leitos', rotulo: t.menu.leitos, icone: BedDouble },
  { caminho: '/emergencia', rotulo: t.menu.emergencia, icone: Siren },
  { caminho: '/farmacia', rotulo: t.menu.farmacia, icone: Pill },
  { caminho: '/analises', rotulo: t.menu.analises, icone: BarChart3 },
  { caminho: '/configuracoes', rotulo: t.menu.configuracoes, icone: Settings },
];

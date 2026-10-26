import clsx, { type ClassValue } from 'clsx';

/** Combina classes CSS condicionalmente. */
export const cn = (...classes: ClassValue[]) => clsx(classes);

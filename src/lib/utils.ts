import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

/**
 * Combina classes CSS usando clsx e tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma data para exibição
 */
export function formatDate(date: Date | string | number) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return format(dateObj, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
}

/**
 * Formata uma data para exibição em formato curto
 */
export function formatShortDate(date: Date | string | number) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Gera um ID aleatório
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

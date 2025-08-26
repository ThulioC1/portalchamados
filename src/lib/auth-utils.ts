// Lista de e-mails de administradores
export const ADMIN_EMAILS = ['ti@andrademarinholmf.com.br', 'ti@am-holding.com.br'];

/**
 * Verifica se um e-mail pertence a um administrador.
 * @param email O e-mail a ser verificado.
 * @returns `true` se o e-mail for de um administrador, `false` caso contrário.
 */
export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) {
    return false;
  }
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
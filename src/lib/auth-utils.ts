import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// Lista de e-mails de administradores (fallback)
export const ADMIN_EMAILS = ['ti@andrademarinholmf.com.br', 'ti@am-holding.com.br'];

/**
 * Verifica se um usuário é administrador.
 * @param uid ID do usuário a ser verificado.
 * @returns Promise que resolve para `true` se o usuário for administrador, `false` caso contrário.
 */
export const checkAdminStatus = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data().isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error("Erro ao verificar status de administrador:", error);
    return false;
  }
};

/**
 * Verifica se um e-mail pertence a um administrador (método legado).
 * @param email O e-mail a ser verificado.
 * @returns `true` se o e-mail for de um administrador, `false` caso contrário.
 */
export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) {
    return false;
  }
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
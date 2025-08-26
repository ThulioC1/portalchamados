import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { isAdmin } from '@/lib/auth-utils';

type AuthState = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
};

export function useAuth(requireAuth = true, requireAdmin = false) {
  const [user, loading] = useAuthState(auth);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isAdmin: false,
    isLoading: true,
  });
  const router = useRouter();

  useEffect(() => {
    // Ainda está carregando o estado de autenticação
    if (loading) {
      setAuthState({
        isAuthenticated: false,
        isAdmin: false,
        isLoading: true,
      });
      return;
    }

    // Usuário não está autenticado
    if (!user) {
      setAuthState({
        isAuthenticated: false,
        isAdmin: false,
        isLoading: false,
      });

      if (requireAuth) {
        router.push('/login');
      }
      return;
    }

    // Usuário está autenticado
    const userIsAdmin = isAdmin(user.email || '');
    setAuthState({
      isAuthenticated: true,
      isAdmin: userIsAdmin,
      isLoading: false,
    });

    // Verificar se precisa ser admin
    if (requireAdmin && !userIsAdmin) {
      router.push('/dashboard');
    }
  }, [user, loading, requireAuth, requireAdmin, router]);

  return {
    user,
    ...authState,
  };
}
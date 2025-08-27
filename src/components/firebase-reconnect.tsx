'use client';

import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useFirebaseConnection } from '@/hooks/use-firebase-connection';

/**
 * Componente para monitorar e gerenciar a conexão com o Firebase
 * Lida com erros de conexão como o 400 Bad Request no webchannel
 */
export function FirebaseReconnect() {
  const [user] = useAuthState(auth);
  const { connectionStatus } = useFirebaseConnection();

  // Registrar mudanças de status de conexão
  useEffect(() => {
    if (user && connectionStatus !== 'connected') {
      console.log(`Firebase connection status: ${connectionStatus}`);
    }
  }, [user, connectionStatus]);

  // Componente não renderiza nada visualmente
  return null;
}
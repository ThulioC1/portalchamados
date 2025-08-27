import { useEffect, useState, useCallback } from 'react';
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

/**
 * Hook para gerenciar a conexão com o Firebase Firestore
 * Monitora erros de conexão e implementa lógica de reconexão automática
 */
export function useFirebaseConnection() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastReconnect, setLastReconnect] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');

  // Função para reconectar ao Firestore
  const reconnectFirestore = useCallback(async () => {
    try {
      // Evitar múltiplas tentativas em curto período
      const now = Date.now();
      if (now - lastReconnect < 30000) return; // 30 segundos entre tentativas
      
      setLastReconnect(now);
      setReconnectAttempts(prev => prev + 1);
      setConnectionStatus('reconnecting');
      
      // Desabilitar e reabilitar a rede para forçar reconexão
      await disableNetwork(db);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await enableNetwork(db);
      
      console.log('Reconexão com Firebase realizada com sucesso');
      setConnectionStatus('connected');
      
      // Resetar contador após reconexão bem-sucedida
      if (reconnectAttempts > 0) {
        setTimeout(() => setReconnectAttempts(0), 60000); // Reset após 1 minuto
      }
    } catch (error) {
      console.error('Erro ao reconectar com Firebase:', error);
      setConnectionStatus('disconnected');
    }
  }, [lastReconnect, reconnectAttempts]);

  // Monitorar estado da conexão
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => {
      setIsOnline(true);
      reconnectFirestore();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reconnectFirestore]);

  // Monitorar erros de rede do Firebase
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Interceptar erros de rede
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      
      // Detectar erros específicos do Firebase webchannel
      if (
        errorMessage.includes('webchannel') && 
        (errorMessage.includes('400') || errorMessage.includes('Bad Request'))
      ) {
        // Tentar reconectar automaticamente
        reconnectFirestore();
        
        // Notificar usuário apenas após múltiplas tentativas
        if (reconnectAttempts >= 2) {
          toast.error('Problemas de conexão detectados. Tentando reconectar...', {
            id: 'firebase-connection-error',
            duration: 5000,
          });
        }
      }
      
      // Chamar o console.error original
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, [reconnectAttempts, reconnectFirestore]);

  return {
    isOnline,
    connectionStatus,
    reconnectAttempts,
    reconnectFirestore
  };
}
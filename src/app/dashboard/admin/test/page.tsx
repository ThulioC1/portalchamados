'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function TestPage() {
  const [isLoading, setIsLoading] = useState({
    email: false,
    migration: false
  });
  const [results, setResults] = useState({
    email: null,
    migration: null
  });

  const testEmail = async () => {
    try {
      setIsLoading(prev => ({ ...prev, email: true }));
      const response = await fetch('/api/test-email');
      const data = await response.json();
      setResults(prev => ({ ...prev, email: data }));
      
      if (data.success) {
        toast.success('Email de teste enviado com sucesso!');
      } else {
        toast.error(`Erro ao enviar email: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao testar email:', error);
      toast.error('Erro ao testar email. Verifique o console.');
      setResults(prev => ({ ...prev, email: { success: false, error: error.message } }));
    } finally {
      setIsLoading(prev => ({ ...prev, email: false }));
    }
  };

  const migrateUsers = async () => {
    try {
      setIsLoading(prev => ({ ...prev, migration: true }));
      const response = await fetch('/api/migrate-users');
      const data = await response.json();
      setResults(prev => ({ ...prev, migration: data }));
      
      if (data.success) {
        toast.success(`Migração concluída: ${data.message}`);
      } else {
        toast.error(`Erro na migração: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao migrar usuários:', error);
      toast.error('Erro ao migrar usuários. Verifique o console.');
      setResults(prev => ({ ...prev, migration: { success: false, error: error.message } }));
    } finally {
      setIsLoading(prev => ({ ...prev, migration: false }));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Página de Testes</h1>
      <p className="text-muted-foreground">Use esta página para testar funcionalidades do sistema.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teste de Email */}
        <Card>
          <CardHeader>
            <CardTitle>Teste de Email</CardTitle>
            <CardDescription>Envia um email de teste para verificar a configuração.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testEmail} 
              disabled={isLoading.email}
              className="w-full"
            >
              {isLoading.email ? 'Enviando...' : 'Enviar Email de Teste'}
            </Button>
            
            {results.email && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <h3 className="font-medium mb-2">Resultado:</h3>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(results.email, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Migração de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Migração de Usuários</CardTitle>
            <CardDescription>Migra usuários do Firebase Auth para o Firestore.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={migrateUsers} 
              disabled={isLoading.migration}
              className="w-full"
            >
              {isLoading.migration ? 'Migrando...' : 'Migrar Usuários'}
            </Button>
            
            {results.migration && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <h3 className="font-medium mb-2">Resultado:</h3>
                <pre className="text-xs overflow-auto max-h-40">
                  {JSON.stringify(results.migration, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
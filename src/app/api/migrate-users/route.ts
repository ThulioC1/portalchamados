import { NextResponse } from 'next/server';
import { auth as adminAuth, db as adminDb } from '@/lib/firebase-admin';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';

// Esta rota é usada para migrar usuários do Firebase Auth para o Firestore
export async function GET() {
  try {
    // Verificar se a solicitação é de um administrador (você pode adicionar autenticação aqui)
    
    console.log('Iniciando migração de usuários...');
    
    // Listar todos os usuários do Firebase Auth
    const listUsersResult = await adminAuth.listUsers();
    const users = listUsersResult.users;
    
    console.log(`Encontrados ${users.length} usuários no Firebase Auth`);
    
    const results = [];
    
    // Para cada usuário, verificar se já existe no Firestore e criar se não existir
    for (const user of users) {
      try {
        console.log(`Processando usuário: ${user.email}`);
        
        // Verificar se o usuário já existe no Firestore
        const userDocRef = doc(clientDb, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // Criar documento do usuário no Firestore
          await setDoc(userDocRef, {
            uid: user.uid,
            displayName: user.displayName || 'Usuário sem nome',
            email: user.email,
            photoURL: user.photoURL,
            isAdmin: false, // Por padrão, não é admin
            isBlocked: false,
            createdAt: serverTimestamp(),
          });
          
          results.push({ uid: user.uid, status: 'created' });
        } else {
          results.push({ uid: user.uid, status: 'already_exists' });
        }
      } catch (error) {
        console.error(`Erro ao processar usuário ${user.uid}:`, error);
        results.push({ uid: user.uid, status: 'error', message: error.message });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processados ${users.length} usuários`,
      results
    });
  } catch (error) {
    console.error('Erro ao migrar usuários:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
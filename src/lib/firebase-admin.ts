import * as admin from 'firebase-admin';

// Verificar se o app já foi inicializado
let app;

if (!admin.apps.length) {
  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-dummy@portalchamados-9c5ca.iam.gserviceaccount.com',
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
    console.log('Firebase Admin inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
} else {
  app = admin.app();
}

export const auth = admin.auth(app);
export const db = admin.firestore(app);
// Este script gera as credenciais necessárias para o Firebase Admin SDK
// Execute com: node firebase-admin-credentials.js

const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Credenciais mínimas necessárias para o Firebase Admin SDK
const credentials = {
  "type": "service_account",
  "project_id": process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  "private_key_id": "dummy-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-dummy@" + process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".iam.gserviceaccount.com",
  "client_id": "dummy-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-dummy%40" + process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID + ".iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Adicionar as variáveis ao .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
let updatedEnvContent = envContent;

// Adicionar FIREBASE_SERVICE_ACCOUNT_KEY se não existir
if (!envContent.includes('FIREBASE_SERVICE_ACCOUNT_KEY')) {
  updatedEnvContent += '\n\n# Firebase Admin SDK\nFIREBASE_SERVICE_ACCOUNT_KEY=' + JSON.stringify(credentials) + '\n';
}

// Adicionar FIREBASE_CLIENT_EMAIL se não existir
if (!envContent.includes('FIREBASE_CLIENT_EMAIL')) {
  updatedEnvContent += 'FIREBASE_CLIENT_EMAIL="' + credentials.client_email + '"\n';
}

// Adicionar FIREBASE_PRIVATE_KEY se não existir
if (!envContent.includes('FIREBASE_PRIVATE_KEY')) {
  updatedEnvContent += 'FIREBASE_PRIVATE_KEY="' + credentials.private_key + '"\n';
}

// Salvar as alterações no .env.local
fs.writeFileSync('.env.local', updatedEnvContent);

console.log('Credenciais do Firebase Admin SDK adicionadas ao .env.local');
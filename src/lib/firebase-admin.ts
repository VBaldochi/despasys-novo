// Firebase Admin SDK Configuration (Server-Side)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getDatabase, Database } from 'firebase-admin/database'
import * as fs from 'fs'

let firebaseApp: App | null = null
let _adminDatabase: Database | null = null

function initializeFirebaseAdmin(): App | null {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  try {
    console.log('🔥 Inicializando Firebase Admin SDK...')
    
    // Opção 1: Usar arquivo de credenciais
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    
    if (credentialsPath && fs.existsSync(credentialsPath)) {
      console.log('📄 Usando credenciais do arquivo:', credentialsPath)
      const serviceAccountJson = fs.readFileSync(credentialsPath, 'utf8')
      const serviceAccount = JSON.parse(serviceAccountJson)
      
      return initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
      })
    } else {
      // Opção 2: Usar variáveis de ambiente direto
      console.log('🔑 Usando credenciais das variáveis de ambiente')
      
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'despasys-production-80bf2'
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      
      if (!clientEmail || !privateKey) {
        // Durante o build, não temos as variáveis de ambiente
        // Só logamos um aviso em vez de lançar erro
        console.warn('⚠️ FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY não configurados. Firebase Admin não será inicializado.')
        return null
      }
      
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
      })
    }
    
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error)
    return null
  }
}

// Lazy initialization
export function getAdminDatabase(): Database | null {
  if (!_adminDatabase) {
    firebaseApp = initializeFirebaseAdmin()
    if (firebaseApp) {
      _adminDatabase = getDatabase()
      console.log('✅ Firebase Admin inicializado com sucesso!')
      console.log('📡 Firebase Admin Database disponível')
    }
  }
  return _adminDatabase
}

// Export para compatibilidade com código existente
// Usa um getter para lazy loading
export const adminDatabase = new Proxy({} as Database, {
  get(target, prop) {
    const db = getAdminDatabase()
    if (!db) {
      console.warn('⚠️ Firebase Admin Database não disponível')
      return undefined
    }
    return (db as any)[prop]
  }
})

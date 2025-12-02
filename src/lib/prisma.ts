import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Verificar se DATABASE_URL está definida
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not defined, Prisma client may not work properly')
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    transactionOptions: {
      timeout: 10000,
      maxWait: 5000,
    }
  })
}

// Usar getter para lazy initialization - só cria quando realmente for usado em runtime
let _prisma: PrismaClient | undefined

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) {
      _prisma = global.prisma || createPrismaClient()
      if (process.env.NODE_ENV !== 'production') {
        global.prisma = _prisma
      }
    }
    return (_prisma as any)[prop]
  }
})

// Função para executar queries com retry automático
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Se for erro de conexão, tentar reconectar
      if (error.code === 'P1017' || error.message?.includes('closed')) {
        console.warn(`Database connection closed (attempt ${attempt}/${maxRetries}), reconnecting...`)
        try {
          await prisma.$disconnect()
          await new Promise(resolve => setTimeout(resolve, delay))
          await prisma.$connect()
        } catch (reconnectError) {
          console.warn('Reconnection failed:', reconnectError)
        }
      } else {
        console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error.message)
      }
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError!
}

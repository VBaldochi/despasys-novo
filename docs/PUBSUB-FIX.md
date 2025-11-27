# 🔧 SOLUÇÃO: Configurar Pub/Sub

## ❌ PROBLEMA IDENTIFICADO
- ✅ Firebase funcionando (projeto: despasys-production-80bf2)
- ❌ Pub/Sub sem permissão (projeto: despasys-production)

## 🛠️ OPÇÃO 1: Ativar Pub/Sub no Projeto Original

### Passo 1: Ativar API Pub/Sub
1. Acesse: https://console.cloud.google.com/
2. Selecione projeto "despasys-production"  
3. Vá em "APIs & Services" > "Library"
4. Busque "Cloud Pub/Sub API"
5. Clique "ENABLE"

### Passo 2: Verificar Permissões
1. Vá em "IAM & Admin" > "IAM"
2. Encontre: despasys-web@despasys-production.iam.gserviceaccount.com
3. Adicione role: "Pub/Sub Editor" ou "Pub/Sub Admin"

## 🛠️ OPÇÃO 2: Criar Service Account no Projeto Firebase

### Mais Simples: Usar um projeto só
1. Acesse: https://console.cloud.google.com/
2. Selecione projeto "despasys-production-80bf2" (mesmo do Firebase)
3. Vá em "IAM & Admin" > "Service Accounts"
4. Crie nova Service Account:
   - Nome: "despasys-sync"
   - Roles: "Firebase Admin SDK Administrator Service Agent" + "Pub/Sub Admin"
5. Baixe nova chave JSON
6. Substitua o arquivo na raiz do projeto

## 🚀 TESTE RÁPIDO (Opção 1)
Após ativar Pub/Sub no projeto original:
```bash
curl http://localhost:3001/api/test/connectivity
```

## 🔄 NOVO: Bridge Pub/Sub ➜ Firebase/Web

### Passo 1: Configurar assinatura push
1. Crie uma subscription (ex.: `web-app-bridge`) apontando para `https://SEU_DOMÍNIO/api/pubsub/relay?token=SEU_TOKEN`.
2. Defina o header de autenticação via token usando a query string acima.
3. Garanta que a service account do Pub/Sub tenha permissão para invocar o endpoint (se usar Cloud Run/Functions, abra o acesso público).

### Passo 2: Variáveis de ambiente obrigatórias
Adicione no `.env.local` (web):
```
PUBSUB_VERIFICATION_TOKEN=SEU_TOKEN
DIRECT_FIREBASE_EVENT_BRIDGE=true # opcional para refletir direto sem Pub/Sub push
GOOGLE_CLOUD_PROJECT_ID=despasys-production
GOOGLE_APPLICATION_CREDENTIALS=./despasys-production-5bddc8dbf3b1.json
```

### Passo 3: Testar fluxo completo
1. Rode `pnpm dev`.
2. Publique um evento manualmente (`ts-node src/test/connectivity.ts`).
3. Verifique no Firebase Realtime Database: `tenants/{tenantId}/events/{eventType}` deve receber o registro em até poucos segundos.

## ⚡ ALTERNATIVA: Desabilitar Pub/Sub Temporariamente
Se quiser focar só no Firebase por agora, posso criar uma versão simplificada sem Pub/Sub.

// Utilitário para refletir eventos do Pub/Sub no Firebase Realtime Database
import { adminDatabase } from './firebase-admin'

export interface PubSubBridgeEvent {
  eventId: string
  eventType: string
  tenantId: string
  data: any
  metadata?: Record<string, any>
  timestamp?: number
  source?: string
}

export interface RelayResult {
  path: string
  payload: Record<string, any>
}

/**
 * Escreve o evento recebido no caminho que web/mobile já escutam
 */
export async function relayEventToFirebase(event: PubSubBridgeEvent): Promise<RelayResult> {
  if (!event.tenantId) {
    throw new Error('tenantId é obrigatório para replicar evento')
  }

  if (!event.eventType) {
    throw new Error('eventType é obrigatório para replicar evento')
  }

  const timestamp = event.timestamp || Date.now()
  const payload = {
    id: event.eventId,
    tenantId: event.tenantId,
    eventType: event.eventType,
    action: event.data?.action ?? event.metadata?.action ?? 'unknown',
    data: event.data,
    metadata: event.metadata ?? {},
    timestamp,
    source: event.source ?? 'web',
    lastSyncedAt: Date.now()
  }

  const basePath = `tenants/${event.tenantId}`
  const eventPath = `${basePath}/events/${event.eventType}/${event.eventId}`

  await adminDatabase.ref(eventPath).set(payload)

  // Enviar para coleção de notificações caso seja esse o tipo
  if (event.eventType === 'notifications') {
    const notifPath = `${basePath}/notifications/${event.eventId}`
    await adminDatabase.ref(notifPath).set({
      ...(event.data || {}),
      id: event.eventId,
      createdAt: timestamp,
      source: payload.source,
      lastSyncedAt: Date.now()
    })
  }

  return { path: eventPath, payload }
}


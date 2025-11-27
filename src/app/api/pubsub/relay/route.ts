import { NextRequest, NextResponse } from 'next/server'
import { relayEventToFirebase } from '@/lib/event-relay'
import { randomUUID } from 'crypto'

interface PubSubPushRequest {
  message?: {
    attributes?: Record<string, string>
    data?: string
    messageId?: string
    publishTime?: string
  }
  subscription?: string
}

const verificationToken = process.env.PUBSUB_VERIFICATION_TOKEN

export async function POST(request: NextRequest) {
  if (verificationToken) {
    const token = request.nextUrl.searchParams.get('token')
    if (token !== verificationToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
  }

  let body: PubSubPushRequest
  try {
    body = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!body?.message?.data) {
    return NextResponse.json({ status: 'sem dados' })
  }

  let decoded
  try {
    decoded = JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf-8'))
  } catch (error) {
    return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
  }

  const attributes = body.message.attributes || {}
  const tenantId = decoded.tenantId || attributes.tenantId
  const eventType = decoded.eventType || attributes.eventType
  const eventId = decoded.eventId || body.message.messageId || randomUUID()

  if (!tenantId || !eventType) {
    return NextResponse.json({ error: 'tenantId/eventType ausentes' }, { status: 400 })
  }

  try {
    await relayEventToFirebase({
      ...decoded,
      tenantId,
      eventType,
      eventId,
      timestamp: decoded.timestamp || Date.parse(body.message.publishTime || '') || Date.now()
    })
  } catch (error) {
    console.error('❌ Erro ao replicar evento do Pub/Sub:', error)
    return NextResponse.json({ error: 'Falha ao refletir evento' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}


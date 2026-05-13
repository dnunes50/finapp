import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase-server'

const anthropic = new Anthropic()

// Verificação do webhook pelo Meta
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request) {
  const body = await request.json()

  const entry = body?.entry?.[0]
  const changes = entry?.changes?.[0]
  const message = changes?.value?.messages?.[0]

  if (!message || message.type !== 'text') {
    return NextResponse.json({ status: 'ignored' })
  }

  const from = message.from
  const text = message.text.body

  const supabase = createServiceClient ()

  const { data: usuario } = await supabase
    .from('cp_users')
    .select('id, nome')
    .eq('whatsapp', from)
    .single()

  if (!usuario) {
    await enviarMensagem(from, 'Número não cadastrado. Acesse o app para vincular seu WhatsApp.')
    return NextResponse.json({ status: 'unknown_user' })
  }

  const { data: historico } = await supabase
    .from('cp_lanc')
    .select('tipo, valor, categoria, descricao, data')
    .eq('user_id', usuario.id)
    .order('data', { ascending: false })
    .limit(20)

  const contexto = historico?.length
    ? historico.map((l) => `${l.data} | ${l.tipo} | R$${l.valor} | ${l.categoria} | ${l.descricao}`).join('\n')
    : 'Nenhum lançamento recente.'

  const resposta = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Você é um assistente financeiro pessoal. O usuário se chama ${usuario.nome}.
Últimos lançamentos:
${contexto}

Responda de forma concisa. Se o usuário informar uma despesa ou receita, extraia: tipo (receita/despesa), valor, categoria e descrição.
Se identificar um lançamento, responda com JSON no formato: {"acao":"lancar","tipo":"despesa","valor":50,"categoria":"Alimentação","descricao":"Almoço"}
Caso contrário, responda normalmente em texto.`,
    messages: [{ role: 'user', content: text }],
  })

  const conteudo = resposta.content[0].text

  try {
    const parsed = JSON.parse(conteudo)
    if (parsed.acao === 'lancar') {
      await supabase.from('cp_lanc').insert({
        user_id: usuario.id,
        tipo: parsed.tipo,
        valor: parsed.valor,
        categoria: parsed.categoria,
        descricao: parsed.descricao,
        data: new Date().toISOString().split('T')[0],
      })
      await enviarMensagem(from, `Lançado: ${parsed.tipo} de R$${parsed.valor} em ${parsed.categoria} (${parsed.descricao})`)
    }
  } catch {
    await enviarMensagem(from, conteudo)
  }

  return NextResponse.json({ status: 'ok' })
}

async function enviarMensagem(to, body) {
  await fetch(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    }
  )
}

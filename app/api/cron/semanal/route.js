import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const anthropic = new Anthropic()

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, whatsapp')
    .not('whatsapp', 'is', null)

  if (!usuarios?.length) return NextResponse.json({ status: 'no_users' })

  const hoje = new Date()
  const seteDiasAtras = new Date(hoje)
  seteDiasAtras.setDate(hoje.getDate() - 7)
  const inicio = seteDiasAtras.toISOString().split('T')[0]
  const fim = hoje.toISOString().split('T')[0]

  const resultados = await Promise.allSettled(
    usuarios.map((usuario) => processarUsuario(supabase, usuario, inicio, fim))
  )

  const ok = resultados.filter((r) => r.status === 'fulfilled').length
  const erros = resultados.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ status: 'done', ok, erros })
}

async function processarUsuario(supabase, usuario, inicio, fim) {
  const { data: lancamentos } = await supabase
    .from('lancamentos')
    .select('tipo, valor, categoria, descricao, data')
    .eq('user_id', usuario.id)
    .gte('data', inicio)
    .lte('data', fim)

  if (!lancamentos?.length) return

  const resumo = lancamentos
    .map((l) => `${l.data} | ${l.tipo} | R$${l.valor} | ${l.categoria} | ${l.descricao}`)
    .join('\n')

  const totalReceitas = lancamentos
    .filter((l) => l.tipo === 'receita')
    .reduce((s, l) => s + Number(l.valor), 0)

  const totalDespesas = lancamentos
    .filter((l) => l.tipo === 'despesa')
    .reduce((s, l) => s + Number(l.valor), 0)

  const resposta = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: `Você é um assistente financeiro. Crie um resumo semanal curto e motivador para ${usuario.nome}. Máximo 3 parágrafos. Sem markdown.`,
    messages: [
      {
        role: 'user',
        content: `Lançamentos da semana:\n${resumo}\n\nTotal receitas: R$${totalReceitas}\nTotal despesas: R$${totalDespesas}\nSaldo: R$${totalReceitas - totalDespesas}`,
      },
    ],
  })

  const mensagem = `Resumo semanal, ${usuario.nome}:\n\n${resposta.content[0].text}`

  await enviarWhatsApp(usuario.whatsapp, mensagem)
}

async function enviarWhatsApp(to, body) {
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

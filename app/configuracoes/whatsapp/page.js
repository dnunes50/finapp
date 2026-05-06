'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../../dashboard/AppLayout'

export default function ConfigWhatsApp() {
  const supabase = createClient()
  const [user, setUser]           = useState(null)
  const [whatsapp, setWhatsapp]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [sucesso, setSucesso]     = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const { data } = await supabase.from('users').select('whatsapp').eq('id', user.id).single()
      setWhatsapp(data?.whatsapp||'')
    }
    load()
  }, [])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('users').update({ whatsapp }).eq('id', user.id)
    setSaving(false)
    setSucesso(true)
    setTimeout(()=>setSucesso(false), 3000)
  }

  const COMANDOS = [
    { msg:'"Mercado 87,50"', acao:'Registra despesa de Alimentação' },
    { msg:'"Uber ontem 34,10"', acao:'Registra despesa com data' },
    { msg:'"Recebi salário 8000"', acao:'Registra receita' },
    { msg:'"saldo"', acao:'Consulta saldos por conta' },
    { msg:'"relatório"', acao:'Resumo do mês atual' },
    { msg:'"quanto gastei de uber?"', acao:'Consulta por categoria' },
  ]

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'600px' }}>
        <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#1A1A18', marginBottom:'4px' }}>WhatsApp</h1>
        <p style={{ fontSize:'13px', color:'#888', marginBottom:'24px' }}>Registre gastos e consulte saldos pelo WhatsApp</p>

        {/* Vincular número */}
        <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'20px', marginBottom:'16px' }}>
          <div style={{ fontSize:'12px', fontWeight:'500', color:'#666', marginBottom:'14px' }}>Número vinculado</div>
          <form onSubmit={salvar} style={{ display:'flex', gap:'8px' }}>
            <input
              type="tel" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999" required
              style={{ flex:1, padding:'10px 12px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'13px', outline:'none' }}
            />
            <button type="submit" disabled={saving} style={{ padding:'10px 18px', background:'#1D9E75', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>
              {saving?'Salvando...':'Salvar'}
            </button>
          </form>
          {sucesso && <p style={{ fontSize:'12px', color:'#0F6E56', marginTop:'8px' }}>✅ Número salvo com sucesso!</p>}
          <p style={{ fontSize:'11px', color:'#AAA', marginTop:'10px' }}>Após vincular, envie uma mensagem para o número do FinApp para começar.</p>
        </div>

        {/* Comandos */}
        <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'20px', marginBottom:'16px' }}>
          <div style={{ fontSize:'12px', fontWeight:'500', color:'#666', marginBottom:'14px' }}>Comandos disponíveis</div>
          {COMANDOS.map((c,i) => (
            <div key={i} style={{ display:'flex', gap:'12px', padding:'8px 0', borderBottom: i<COMANDOS.length-1?'1px solid #F0F0EE':'none' }}>
              <code style={{ fontSize:'12px', background:'#F5F5F3', padding:'2px 8px', borderRadius:'4px', color:'#185FA5', flexShrink:0 }}>{c.msg}</code>
              <span style={{ fontSize:'12px', color:'#666' }}>{c.acao}</span>
            </div>
          ))}
        </div>

        {/* Info */}
        <div style={{ background:'#E1F5EE', border:'1px solid #9FE1CB', borderRadius:'12px', padding:'16px' }}>
          <div style={{ fontSize:'12px', fontWeight:'500', color:'#085041', marginBottom:'6px' }}>💡 Como funciona</div>
          <p style={{ fontSize:'12px', color:'#0F6E56', lineHeight:'1.6' }}>
            Nossa IA interpreta suas mensagens em linguagem natural. Não precisa seguir um formato exato — basta descrever o gasto normalmente.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}

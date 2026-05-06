'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../dashboard/AppLayout'

function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2}) }

export default function Patrimonio() {
  const supabase = createClient()
  const [contas, setContas]         = useState([])
  const [historico, setHistorico]   = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: saldos } = await supabase.from('saldos_por_conta').select('*').order('saldo_atual', { ascending: false })
      setContas(saldos||[])

      const { data: hist } = await supabase.from('resumo_mensal').select('*').eq('user_id', user.id).order('mes', { ascending: false }).limit(6)
      setHistorico((hist||[]).reverse())

      setLoading(false)
    }
    load()
  }, [])

  const total = contas.reduce((s,c)=>s+Number(c.saldo_atual||0),0)
  const maxSaldo = Math.max(...contas.map(c=>Number(c.saldo_atual||0)),1)

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'900px' }}>
        <div style={{ marginBottom:'20px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#1A1A18' }}>Patrimônio</h1>
          <p style={{ fontSize:'13px', color:'#888' }}>Visão consolidada de todas as contas</p>
        </div>

        {/* Total */}
        <div style={{ background:'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius:'16px', padding:'24px', marginBottom:'20px', color:'#FFF' }}>
          <div style={{ fontSize:'12px', opacity:.8, marginBottom:'6px' }}>Patrimônio total</div>
          <div style={{ fontSize:'32px', fontWeight:'600', marginBottom:'4px' }}>R$ {fmt(total)}</div>
          <div style={{ fontSize:'12px', opacity:.7 }}>{contas.length} contas ativas</div>
        </div>

        {/* Distribuição */}
        <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'16px', marginBottom:'14px' }}>
          <div style={{ fontSize:'12px', fontWeight:'500', color:'#666', marginBottom:'12px' }}>Distribuição por conta</div>
          {loading ? <p style={{ color:'#AAA', fontSize:'12px' }}>Carregando...</p> :
            contas.length === 0 ? <p style={{ color:'#AAA', fontSize:'12px', textAlign:'center', padding:'20px 0' }}>Nenhuma conta cadastrada</p> :
            contas.map(c => {
              const pct = (Number(c.saldo_atual)/total*100).toFixed(1)
              const barPct = (Number(c.saldo_atual)/maxSaldo*100)
              return (
                <div key={c.conta_id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:'1px solid #F0F0EE' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c.cor||'#888', flexShrink:0 }}></div>
                  <div style={{ width:'100px', fontSize:'12px', color:'#333', flexShrink:0 }}>{c.nome}</div>
                  <div style={{ flex:1, height:'5px', background:'#F0F0EE', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${barPct}%`, background:c.cor||'#1D9E75', borderRadius:'3px' }}></div>
                  </div>
                  <div style={{ fontSize:'13px', fontWeight:'500', color:'#1A1A18', width:'110px', textAlign:'right' }}>R$ {fmt(c.saldo_atual)}</div>
                  <div style={{ fontSize:'11px', color:'#AAA', width:'38px', textAlign:'right' }}>{pct}%</div>
                </div>
              )
            })
          }
        </div>

        {/* Evolução */}
        {historico.length > 0 && (
          <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'16px' }}>
            <div style={{ fontSize:'12px', fontWeight:'500', color:'#666', marginBottom:'12px' }}>Evolução mensal</div>
            {historico.map((h,i) => {
              const ant = historico[i-1]
              const delta = ant ? Number(h.resultado||0) : null
              return (
                <div key={h.mes} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom: i<historico.length-1?'1px solid #F0F0EE':'none' }}>
                  <div style={{ width:'40px', fontSize:'11px', color:'#888', flexShrink:0 }}>{h.mes}</div>
                  <div style={{ flex:1, fontSize:'11px', color:'#AAA' }}>
                    <span style={{ color:'#0F6E56' }}>+R$ {fmt(h.total_receitas)}</span>
                    {' · '}
                    <span style={{ color:'#A32D2D' }}>-R$ {fmt(h.total_despesas)}</span>
                  </div>
                  <div style={{ fontSize:'13px', fontWeight:'500', color: Number(h.resultado)>=0?'#0F6E56':'#A32D2D' }}>
                    {Number(h.resultado)>=0?'+':''}{fmt(h.resultado)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

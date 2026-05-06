'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../dashboard/AppLayout'

function getMesAtual() {
  const d = new Date()
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
}
function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2}) }

const MESES_OPT = Array.from({length:12},(_,i)=>{
  const d = new Date(); d.setMonth(d.getMonth()-i)
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
})

export default function Relatorios() {
  const supabase = createClient()
  const [mes, setMes]             = useState(getMesAtual())
  const [categorias, setCategorias] = useState([])
  const [resumo, setResumo]       = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { data: res } = await supabase.from('resumo_mensal').select('*').eq('user_id', user.id).eq('mes', mes).single()
      setResumo(res)

      const { data: cats } = await supabase.from('orcamento_vs_realizado').select('*').eq('user_id', user.id).eq('mes', mes).order('valor_realizado', { ascending: false })
      setCategorias(cats || [])

      const { data: hist } = await supabase.from('resumo_mensal').select('*').eq('user_id', user.id).order('mes', { ascending: false }).limit(6)
      setHistorico((hist||[]).reverse())

      setLoading(false)
    }
    load()
  }, [mes])

  const maxVal = Math.max(...historico.map(h => Number(h.total_receitas||0)), 1)

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'900px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#1A1A18' }}>Relatórios</h1>
          <select value={mes} onChange={e=>setMes(e.target.value)} style={{ padding:'7px 10px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'12px', background:'#FFF' }}>
            {MESES_OPT.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
          {[
            { label:'Receitas', value:`R$ ${fmt(resumo?.total_receitas)}`, color:'#0F6E56' },
            { label:'Despesas', value:`R$ ${fmt(resumo?.total_despesas)}`, color:'#A32D2D' },
            { label:'Economia', value:`${resumo?.total_receitas > 0 ? ((1 - resumo?.total_despesas/resumo?.total_receitas)*100).toFixed(0) : 0}%`, color:'#185FA5' },
          ].map(m=>(
            <div key={m.label} style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'14px 16px' }}>
              <div style={{ fontSize:'11px', color:'#888', marginBottom:'3px' }}>{m.label}</div>
              <div style={{ fontSize:'18px', fontWeight:'600', color:m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Comparativo mensal */}
        {historico.length > 0 && (
          <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'16px', marginBottom:'14px' }}>
            <div style={{ fontSize:'12px', fontWeight:'500', color:'#666', marginBottom:'14px' }}>Comparativo mensal</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'80px', marginBottom:'6px' }}>
              {historico.map(h => (
                <div key={h.mes} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                  <div style={{ width:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', height:'70px', gap:'2px' }}>
                    <div style={{ width:'100%', background:'#E1F5EE', borderRadius:'3px 3px 0 0', height:`${(Number(h.total_receitas)/maxVal*60)}px`, minHeight:'2px' }}></div>
                    <div style={{ width:'100%', background:'#FCEBEB', borderRadius:'3px 3px 0 0', height:`${(Number(h.total_despesas)/maxVal*60)}px`, minHeight:'2px' }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              {historico.map(h=>(
                <div key={h.mes} style={{ flex:1, textAlign:'center', fontSize:'9px', color: h.mes===mes ? '#0F6E56' : '#AAA', fontWeight: h.mes===mes?'600':'400' }}>{h.mes}</div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'12px', marginTop:'8px' }}>
              <span style={{ fontSize:'10px', color:'#888', display:'flex', alignItems:'center', gap:'4px' }}><span style={{ width:'8px',height:'8px',background:'#9FE1CB',borderRadius:'2px',display:'inline-block' }}></span>Receita</span>
              <span style={{ fontSize:'10px', color:'#888', display:'flex', alignItems:'center', gap:'4px' }}><span style={{ width:'8px',height:'8px',background:'#F7C1C1',borderRadius:'2px',display:'inline-block' }}></span>Despesa</span>
            </div>
          </div>
        )}

        {/* Gastos por categoria */}
        <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'16px' }}>
          <div style={{ fontSize:'12px', fontWeight:'500', color:'#666', marginBottom:'12px' }}>Gastos por categoria — {mes}</div>
          {loading ? <p style={{ color:'#AAA', fontSize:'12px' }}>Carregando...</p> :
            categorias.length === 0 ? <p style={{ color:'#AAA', fontSize:'12px', textAlign:'center', padding:'20px 0' }}>Sem dados neste mês</p> :
            categorias.filter(c=>c.valor_realizado>0).map(c => {
              const max = Math.max(...categorias.map(x=>Number(x.valor_realizado||0)),1)
              const pct = Number(c.valor_realizado)/max*100
              return (
                <div key={c.categoria_id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:'1px solid #F0F0EE' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c.categoria_cor||'#888', flexShrink:0 }}></div>
                  <div style={{ width:'110px', fontSize:'12px', color:'#333', flexShrink:0 }}>{c.categoria_nome}</div>
                  <div style={{ flex:1, height:'4px', background:'#F0F0EE', borderRadius:'2px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:c.categoria_cor||'#1D9E75', borderRadius:'2px' }}></div>
                  </div>
                  <div style={{ fontSize:'12px', fontWeight:'500', color:'#333', width:'90px', textAlign:'right' }}>R$ {fmt(c.valor_realizado)}</div>
                  <div style={{ fontSize:'10px', color:'#AAA', width:'32px', textAlign:'right' }}>{Number(c.percentual||0).toFixed(0)}%</div>
                </div>
              )
            })
          }
        </div>
      </div>
    </AppLayout>
  )
}

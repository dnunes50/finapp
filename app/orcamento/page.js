'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../dashboard/AppLayout'

function getMesAtual() {
  const d = new Date()
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
}
function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2}) }

const MESES_OPT = Array.from({length:6},(_,i)=>{
  const d = new Date(); d.setMonth(d.getMonth()+i-1)
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
})

export default function Orcamento() {
  const supabase = createClient()
  const [mes, setMes]               = useState(getMesAtual())
  const [orcamento, setOrcamento]   = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(null)
  const [limites, setLimites]       = useState({})

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: cats } = await supabase.from('categorias')
      .select('*').or(`user_id.eq.${user.id},user_id.is.null`)
      .eq('tipo','despesa').eq('ativo',true).order('nome')
    setCategorias(cats||[])

    const { data: orc } = await supabase.from('orcamento_vs_realizado')
      .select('*').eq('user_id', user.id).eq('mes', mes)
    setOrcamento(orc||[])

    const novosLimites = {}
    orc?.forEach(o => { novosLimites[o.categoria_id] = String(o.valor_limite) })
    setLimites(novosLimites)
    setLoading(false)
  }

  useEffect(() => { load() }, [mes])

  async function salvarLimite(categoria_id) {
    setSaving(categoria_id)
    const { data: { user } } = await supabase.auth.getUser()
    const valor_limite = parseFloat(limites[categoria_id]?.replace(',','.') || '0')
    await supabase.from('orcamento').upsert(
      { user_id: user.id, categoria_id, mes, valor_limite },
      { onConflict: 'user_id,categoria_id,mes' }
    )
    setSaving(null)
    load()
  }

  const totalLimite    = orcamento.reduce((s,o)=>s+Number(o.valor_limite||0),0)
  const totalRealizado = orcamento.reduce((s,o)=>s+Number(o.valor_realizado||0),0)

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'800px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#1A1A18' }}>Orçamento mensal</h1>
          <select value={mes} onChange={e=>setMes(e.target.value)} style={{ padding:'7px 10px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'12px', background:'#FFF' }}>
            {MESES_OPT.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {totalLimite > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
            {[
              { label:'Total orçado', value:`R$ ${fmt(totalLimite)}`, color:'#1A1A18' },
              { label:'Realizado', value:`R$ ${fmt(totalRealizado)}`, color:'#A32D2D' },
              { label:'Disponível', value:`R$ ${fmt(totalLimite-totalRealizado)}`, color: totalLimite>=totalRealizado?'#0F6E56':'#A32D2D' },
            ].map(m=>(
              <div key={m.label} style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'12px 16px' }}>
                <div style={{ fontSize:'11px', color:'#888', marginBottom:'3px' }}>{m.label}</div>
                <div style={{ fontSize:'16px', fontWeight:'600', color:m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'16px' }}>
          <div style={{ fontSize:'12px', fontWeight:'500', color:'#666', marginBottom:'14px' }}>Definir limites por categoria</div>
          {loading ? <p style={{ color:'#AAA', fontSize:'12px' }}>Carregando...</p> :
            categorias.map(cat => {
              const orc = orcamento.find(o=>o.categoria_id===cat.id)
              const pct = orc ? Math.min(Number(orc.percentual||0), 100) : 0
              const cor = pct >= 100 ? '#E24B4A' : pct >= 80 ? '#EF9F27' : '#1D9E75'
              return (
                <div key={cat.id} style={{ padding:'12px 0', borderBottom:'1px solid #F0F0EE' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                    <span style={{ fontSize:'14px' }}>{cat.icone}</span>
                    <span style={{ fontSize:'13px', color:'#333', flex:1 }}>{cat.nome}</span>
                    {orc && <span style={{ fontSize:'11px', color:'#AAA' }}>Gasto: R$ {fmt(orc.valor_realizado)}</span>}
                    <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                      <span style={{ fontSize:'12px', color:'#888' }}>R$</span>
                      <input
                        type="text"
                        value={limites[cat.id]||''}
                        onChange={e=>setLimites({...limites,[cat.id]:e.target.value})}
                        placeholder="0,00"
                        style={{ width:'90px', padding:'6px 8px', border:'1px solid #E8E8E5', borderRadius:'6px', fontSize:'12px', outline:'none', textAlign:'right' }}
                      />
                      <button onClick={()=>salvarLimite(cat.id)} disabled={saving===cat.id}
                        style={{ padding:'6px 12px', background:'#1D9E75', color:'#FFF', border:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer' }}>
                        {saving===cat.id ? '...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                  {orc && orc.valor_limite > 0 && (
                    <div style={{ height:'4px', background:'#F0F0EE', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:'2px', transition:'width 0.5s' }}></div>
                    </div>
                  )}
                </div>
              )
            })
          }
        </div>
      </div>
    </AppLayout>
  )
}

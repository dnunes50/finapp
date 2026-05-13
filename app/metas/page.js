'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../dashboard/AppLayout'

function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2}) }

export default function Metas() {
  const supabase = createClient()
  const [metas, setMetas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({ nome:'', descricao:'', valor_alvo:'', valor_atual:'0', prazo:'', cor:'#22C55E' })

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('cp_metas').select('*').eq('user_id', user.id).order('criado_em', { ascending: false })
    setMetas(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cp_metas').insert({
      ...form, user_id: user.id,
      valor_alvo: parseFloat(form.valor_alvo.replace(',','.')),
      valor_atual: parseFloat(form.valor_atual.replace(',','.') || '0'),
    })
    setModal(false)
    setForm({ nome:'', descricao:'', valor_alvo:'', valor_atual:'0', prazo:'', cor:'#22C55E' })
    setSaving(false)
    load()
  }

  async function excluir(id) {
    if (!confirm('Excluir esta meta?')) return
    await supabase.from('cp_metas').delete().eq('id', id)
    load()
  }

  async function alterarStatus(id, status) {
    await supabase.from('cp_metas').update({ status }).eq('id', id)
    load()
  }

  const statusInfo = { ativa:{label:'Ativa',bg:'#E1F5EE',color:'#085041'}, pausada:{label:'Pausada',bg:'#F1EFE8',color:'#5F5E5A'}, concluida:{label:'Concluída',bg:'#E6F1FB',color:'#0C447C'} }

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'900px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#F1F5F9' }}>Metas financeiras</h1>
            <p style={{ fontSize:'13px', color:'#64748B' }}>{metas.filter(m=>m.status==='ativa').length} metas ativas</p>
          </div>
          <button onClick={()=>setModal(true)} style={{ padding:'8px 16px', background:'#22C55E', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>
            + Nova meta
          </button>
        </div>

        {loading ? <p style={{ color:'#475569', fontSize:'13px' }}>Carregando...</p> :
          metas.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#475569' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>🎯</div>
              <p style={{ fontSize:'14px', marginBottom:'4px' }}>Nenhuma meta cadastrada</p>
              <p style={{ fontSize:'12px' }}>Crie sua primeira meta financeira</p>
            </div>
          ) :
          metas.map(m => {
            const pct = Math.min(Number(m.valor_atual)/Number(m.valor_alvo)*100, 100)
            const si  = statusInfo[m.status] || statusInfo.ativa
            const faltam = Number(m.valor_alvo) - Number(m.valor_atual)
            return (
              <div key={m.id} style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'16px', marginBottom:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:'500', color:'#F1F5F9', marginBottom:'2px' }}>{m.nome}</div>
                    {m.prazo && <div style={{ fontSize:'11px', color:'#475569' }}>Prazo: {new Date(m.prazo+'T12:00:00').toLocaleDateString('pt-BR')}</div>}
                  </div>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <span style={{ fontSize:'9px', padding:'2px 8px', borderRadius:'20px', background:si.bg, color:si.color, fontWeight:'500' }}>{si.label}</span>
                    <button onClick={()=>excluir(m.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#CCC', fontSize:'14px' }}>✕</button>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                  <div style={{ flex:1, height:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:m.cor||'#22C55E', borderRadius:'3px', transition:'width 0.5s' }}></div>
                  </div>
                  <span style={{ fontSize:'12px', fontWeight:'500', color: m.cor||'#22C55E', width:'36px', textAlign:'right' }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#475569' }}>
                  <span>R$ {fmt(m.valor_atual)} guardados</span>
                  <span>Faltam R$ {fmt(Math.max(faltam,0))}</span>
                </div>
                {m.status === 'ativa' && (
                  <div style={{ display:'flex', gap:'6px', marginTop:'10px' }}>
                    <button onClick={()=>alterarStatus(m.id,'pausada')} style={{ padding:'4px 10px', fontSize:'10px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'6px', cursor:'pointer', background:'#1E293B', color:'#94A3B8' }}>Pausar</button>
                    <button onClick={()=>alterarStatus(m.id,'concluida')} style={{ padding:'4px 10px', fontSize:'10px', border:'1px solid #9FE1CB', borderRadius:'6px', cursor:'pointer', background:'#E1F5EE', color:'#085041' }}>Concluir</button>
                  </div>
                )}
              </div>
            )
          })
        }
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1E293B', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'400px', margin:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:'600' }}>Nova meta</h2>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#64748B' }}>×</button>
            </div>
            <form onSubmit={salvar}>
              {[
                { label:'Nome', key:'nome', type:'text', placeholder:'Ex: Viagem Europa', required:true },
                { label:'Valor alvo (R$)', key:'valor_alvo', type:'text', placeholder:'15.000,00', required:true },
                { label:'Valor atual (R$)', key:'valor_atual', type:'text', placeholder:'0,00' },
                { label:'Prazo', key:'prazo', type:'date' },
              ].map(f=>(
                <div key={f.key} style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                    placeholder={f.placeholder} required={f.required}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', outline:'none' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>Cor</label>
                <div style={{ display:'flex', gap:'8px' }}>
                  {['#22C55E','#378ADD','#EF9F27','#7F77DD','#D85A30','#D4537E'].map(c=>(
                    <div key={c} onClick={()=>setForm({...form,cor:c})} style={{ width:'24px', height:'24px', borderRadius:'50%', background:c, cursor:'pointer', border: form.cor===c?'3px solid #1A1A18':'2px solid transparent' }}></div>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} style={{ width:'100%', padding:'11px', background:'#22C55E', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
                {saving ? 'Salvando...' : 'Criar meta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

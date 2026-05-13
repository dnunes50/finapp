'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../../dashboard/AppLayout'

function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2}) }

export default function ConfigCartoes() {
  const supabase = createClient()
  const [cartoes, setCartoes] = useState([])
  const [contas, setContas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ nome:'', bandeira:'visa', limite:'', fechamento_dia:'3', vencimento_dia:'10', conta_debito_id:'', cor:'#7F77DD' })

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('cp_cartoes').select('*, contas(nome)').eq('user_id', user.id).order('criado_em')
    setCartoes(data||[])
    const { data: cts } = await supabase.from('cp_contas').select('*').eq('user_id', user.id).eq('ativo',true)
    setContas(cts||[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cp_cartoes').insert({
      ...form, user_id: user.id,
      limite: parseFloat(form.limite.replace(',','.')),
      fechamento_dia: parseInt(form.fechamento_dia),
      vencimento_dia: parseInt(form.vencimento_dia),
      conta_debito_id: form.conta_debito_id||null,
    })
    setModal(false)
    setSaving(false)
    load()
  }

  async function excluir(id) {
    if (!confirm('Excluir este cartão?')) return
    await supabase.from('cp_cartoes').delete().eq('id', id)
    load()
  }

  const CORES = ['#7F77DD','#8B5CF6','#1D4ED8','#D85A30','#22C55E','#EF4444','#EF9F27','#888780']

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'700px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#F1F5F9' }}>Cartões de crédito</h1>
            <p style={{ fontSize:'13px', color:'#64748B' }}>{cartoes.length} cartões</p>
          </div>
          <button onClick={()=>setModal(true)} style={{ padding:'8px 16px', background:'#22C55E', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>
            + Adicionar cartão
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {loading ? <p style={{ color:'#475569', fontSize:'12px' }}>Carregando...</p> :
            cartoes.length === 0 ? (
              <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'40px', textAlign:'center', color:'#475569' }}>
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>💳</div>
                <p style={{ fontSize:'13px' }}>Nenhum cartão cadastrado</p>
              </div>
            ) :
            cartoes.map(c => (
              <div key={c.id} style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'16px', display:'flex', gap:'14px', alignItems:'flex-start' }}>
                <div style={{ width:'56px', height:'36px', borderRadius:'8px', background:c.cor||'#7F77DD', flexShrink:0, display:'flex', alignItems:'flex-end', justifyContent:'flex-end', padding:'5px' }}>
                  <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.8)', fontWeight:'600', textTransform:'uppercase' }}>{c.bandeira}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:'500', color:'#F1F5F9', marginBottom:'2px' }}>{c.nome}</div>
                  <div style={{ fontSize:'11px', color:'#475569' }}>Fecha dia {c.fechamento_dia} · Vence dia {c.vencimento_dia} · {c.contas?.nome||'sem conta vinculada'}</div>
                  <div style={{ fontSize:'12px', color:'#94A3B8', marginTop:'4px' }}>Limite: R$ {fmt(c.limite)}</div>
                </div>
                <button onClick={()=>excluir(c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#CCC', fontSize:'14px' }}>✕</button>
              </div>
            ))
          }
        </div>
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1E293B', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'400px', margin:'16px', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:'600' }}>Novo cartão</h2>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#64748B' }}>×</button>
            </div>
            <form onSubmit={salvar}>
              {[
                { label:'Nome do cartão', key:'nome', type:'text', placeholder:'Ex: Nubank Roxinho', required:true },
                { label:'Limite (R$)', key:'limite', type:'text', placeholder:'5.000,00', required:true },
                { label:'Dia de fechamento', key:'fechamento_dia', type:'number', placeholder:'3', required:true },
                { label:'Dia de vencimento', key:'vencimento_dia', type:'number', placeholder:'10', required:true },
              ].map(f=>(
                <div key={f.key} style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.placeholder} required={f.required}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', outline:'none' }} />
                </div>
              ))}
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>Bandeira</label>
                <select value={form.bandeira} onChange={e=>setForm({...form,bandeira:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', background:'#1E293B' }}>
                  {['visa','mastercard','elo','amex','hipercard','outro'].map(b=><option key={b} value={b}>{b.charAt(0).toUpperCase()+b.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>Conta de débito</label>
                <select value={form.conta_debito_id} onChange={e=>setForm({...form,conta_debito_id:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', background:'#1E293B' }}>
                  <option value="">Selecionar</option>
                  {contas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'6px' }}>Cor</label>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {CORES.map(c=>(
                    <div key={c} onClick={()=>setForm({...form,cor:c})} style={{ width:'24px', height:'24px', borderRadius:'50%', background:c, cursor:'pointer', border: form.cor===c?'3px solid #1A1A18':'2px solid transparent' }}></div>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} style={{ width:'100%', padding:'11px', background:'#22C55E', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
                {saving?'Salvando...':'Adicionar cartão'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

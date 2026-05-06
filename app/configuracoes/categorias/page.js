'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../../dashboard/AppLayout'

const ICONES = ['🍔','🚗','🏠','💊','📚','🎭','👕','💡','📱','🐾','✈️','📦','💼','💻','📈','🏢','🎁','➕','🛒','🎮','🍕','☕','🏥','⚽','🎵','💈','🔧','📦']
const CORES  = ['#D85A30','#378ADD','#888780','#7F77DD','#5DCAA5','#EF9F27','#D4537E','#639922','#5F5E5A','#185FA5','#1D9E75','#E24B4A','#B4B2A9']

export default function ConfigCategorias() {
  const supabase = createClient()
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('despesa')
  const [modal, setModal]           = useState(false)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState({ nome:'', tipo:'despesa', cor:'#888780', icone:'📦' })

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('categorias').select('*').or(`user_id.eq.${user.id},user_id.is.null`).order('ordem').order('nome')
    setCategorias(data||[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('categorias').insert({ ...form, user_id: user.id })
    setModal(false)
    setForm({ nome:'', tipo:'despesa', cor:'#888780', icone:'📦' })
    setSaving(false)
    load()
  }

  async function excluir(id) {
    if (!confirm('Excluir esta categoria?')) return
    await supabase.from('categorias').delete().eq('id', id)
    load()
  }

  const filtradas = categorias.filter(c=>c.tipo===tab)

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'700px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#1A1A18' }}>Categorias</h1>
          <button onClick={()=>{ setForm({...form,tipo:tab}); setModal(true) }} style={{ padding:'8px 16px', background:'#1D9E75', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>
            + Nova categoria
          </button>
        </div>

        <div style={{ display:'flex', gap:'6px', marginBottom:'16px' }}>
          {['despesa','receita'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'6px 16px', borderRadius:'20px', border:'1px solid', fontSize:'12px', cursor:'pointer',
              background: tab===t?'#1D9E75':'#FFF', color: tab===t?'#FFF':'#666', borderColor: tab===t?'#1D9E75':'#E8E8E5',
            }}>{t==='despesa'?'Despesas':'Receitas'}</button>
          ))}
        </div>

        <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'8px 16px' }}>
          {loading ? <p style={{ color:'#AAA', fontSize:'12px', padding:'16px 0' }}>Carregando...</p> :
            filtradas.map((c,i) => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom: i<filtradas.length-1?'1px solid #F0F0EE':'none' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:c.cor||'#888', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>
                  {c.icone||'📦'}
                </div>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:'13px', color:'#333' }}>{c.nome}</span>
                  {c.is_default && <span style={{ fontSize:'9px', marginLeft:'6px', padding:'1px 6px', background:'#F0F0EE', color:'#888', borderRadius:'20px' }}>Padrão</span>}
                </div>
                {!c.is_default && (
                  <button onClick={()=>excluir(c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#CCC', fontSize:'14px' }}>✕</button>
                )}
              </div>
            ))
          }
        </div>
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#FFF', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'400px', margin:'16px', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:'600' }}>Nova categoria</h2>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#888' }}>×</button>
            </div>
            <form onSubmit={salvar}>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' }}>Nome</label>
                <input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Ex: Academia" required
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'13px', outline:'none' }} />
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' }}>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'13px', background:'#FFF' }}>
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </select>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#888', marginBottom:'6px' }}>Ícone</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {ICONES.map(ic=>(
                    <div key={ic} onClick={()=>setForm({...form,icone:ic})} style={{ width:'32px', height:'32px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', cursor:'pointer', border: form.icone===ic?'2px solid #1D9E75':'1px solid #E8E8E5', background: form.icone===ic?'#E1F5EE':'#FFF' }}>
                      {ic}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#888', marginBottom:'6px' }}>Cor</label>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {CORES.map(c=>(
                    <div key={c} onClick={()=>setForm({...form,cor:c})} style={{ width:'24px', height:'24px', borderRadius:'50%', background:c, cursor:'pointer', border: form.cor===c?'3px solid #1A1A18':'2px solid transparent' }}></div>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving} style={{ width:'100%', padding:'11px', background:'#1D9E75', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
                {saving?'Salvando...':'Criar categoria'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

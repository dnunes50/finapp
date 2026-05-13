'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../dashboard/AppLayout'

function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2}) }

export default function Recorrentes() {
  const supabase = createClient()
  const [recorrentes, setRecorrentes] = useState([])
  const [categorias, setCategorias]   = useState([])
  const [contas, setContas]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [saving, setSaving]           = useState(false)
  const [form, setForm]               = useState({ descricao:'', valor:'', tipo:'despesa', categoria_id:'', conta_id:'', dia_vencimento:'1', data_inicio: new Date().toISOString().split('T')[0] })

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('cp_recorrentes').select('*, categorias(nome,cor,icone), contas(nome)').eq('user_id', user.id).order('criado_em', { ascending: false })
    setRecorrentes(data||[])
    const { data: cats } = await supabase.from('cp_categorias').select('*').or(`user_id.eq.${user.id},user_id.is.null`).order('nome')
    setCategorias(cats||[])
    const { data: cts } = await supabase.from('cp_contas').select('*').eq('user_id', user.id).eq('ativo',true)
    setContas(cts||[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cp_recorrentes').insert({
      ...form, user_id: user.id,
      valor: parseFloat(form.valor.replace(',','.')),
      dia_vencimento: parseInt(form.dia_vencimento),
      categoria_id: form.categoria_id||null,
      conta_id: form.conta_id||null,
    })
    setModal(false)
    setSaving(false)
    load()
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('cp_recorrentes').update({ ativo: !ativo }).eq('id', id)
    load()
  }

  async function excluir(id) {
    if (!confirm('Excluir este recorrente?')) return
    await supabase.from('cp_recorrentes').delete().eq('id', id)
    load()
  }

  const totalMensal = recorrentes.filter(r=>r.ativo&&r.tipo==='despesa').reduce((s,r)=>s+Number(r.valor),0)
  const totalReceitas = recorrentes.filter(r=>r.ativo&&r.tipo==='receita').reduce((s,r)=>s+Number(r.valor),0)

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'800px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#F1F5F9' }}>Recorrentes</h1>
            <p style={{ fontSize:'13px', color:'#64748B' }}>{recorrentes.filter(r=>r.ativo).length} ativos</p>
          </div>
          <button onClick={()=>setModal(true)} style={{ padding:'8px 16px', background:'#22C55E', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>
            + Novo recorrente
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
          <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'12px 16px' }}>
            <div style={{ fontSize:'11px', color:'#64748B', marginBottom:'3px' }}>Despesas/mês</div>
            <div style={{ fontSize:'16px', fontWeight:'600', color:'#EF4444' }}>-R$ {fmt(totalMensal)}</div>
          </div>
          <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'12px 16px' }}>
            <div style={{ fontSize:'11px', color:'#64748B', marginBottom:'3px' }}>Receitas/mês</div>
            <div style={{ fontSize:'16px', fontWeight:'600', color:'#22C55E' }}>+R$ {fmt(totalReceitas)}</div>
          </div>
        </div>

        <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'16px' }}>
          {loading ? <p style={{ color:'#475569', fontSize:'12px' }}>Carregando...</p> :
            recorrentes.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#475569' }}>
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>🔄</div>
                <p style={{ fontSize:'13px' }}>Nenhum recorrente cadastrado</p>
              </div>
            ) :
            recorrentes.map((r,i) => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom: i<recorrentes.length-1?'1px solid #F0F0EE':'none', opacity: r.ativo?1:0.5 }}>
                <span style={{ fontSize:'16px' }}>{r.categorias?.icone||'📦'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:'500', color:'#222' }}>{r.descricao}</div>
                  <div style={{ fontSize:'10px', color:'#475569' }}>Todo dia {r.dia_vencimento} · {r.contas?.nome||'—'} · {r.categorias?.nome||'—'}</div>
                </div>
                <span style={{ fontSize:'13px', fontWeight:'500', color: r.tipo==='receita'?'#22C55E':'#1A1A18', flexShrink:0 }}>
                  {r.tipo==='receita'?'+':'-'}R$ {fmt(r.valor)}
                </span>
                <button onClick={()=>toggleAtivo(r.id,r.ativo)} style={{ padding:'4px 10px', fontSize:'10px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'6px', cursor:'pointer', background: r.ativo?'#FFF':'#F0F0EE', color:'#94A3B8' }}>
                  {r.ativo?'Pausar':'Ativar'}
                </button>
                <button onClick={()=>excluir(r.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#CCC', fontSize:'14px' }}>✕</button>
              </div>
            ))
          }
        </div>
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1E293B', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'400px', margin:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:'600' }}>Novo recorrente</h2>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#64748B' }}>×</button>
            </div>
            <form onSubmit={salvar}>
              <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
                {['despesa','receita'].map(t=>(
                  <button type="button" key={t} onClick={()=>setForm({...form,tipo:t})} style={{
                    flex:1, padding:'8px', borderRadius:'8px', border:'1px solid',
                    background: form.tipo===t?(t==='receita'?'#E1F5EE':'#FCEBEB'):'#FFF',
                    color: form.tipo===t?(t==='receita'?'#22C55E':'#EF4444'):'#666',
                    borderColor: form.tipo===t?(t==='receita'?'#9FE1CB':'#F7C1C1'):'#E8E8E5',
                    cursor:'pointer', fontSize:'13px',
                  }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
                ))}
              </div>
              {[
                { label:'Descrição', key:'descricao', type:'text', placeholder:'Ex: Netflix', required:true },
                { label:'Valor (R$)', key:'valor', type:'text', placeholder:'0,00', required:true },
                { label:'Dia do mês', key:'dia_vencimento', type:'number', placeholder:'1', required:true },
              ].map(f=>(
                <div key={f.key} style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                    placeholder={f.placeholder} required={f.required} min={f.key==='dia_vencimento'?1:undefined} max={f.key==='dia_vencimento'?31:undefined}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', outline:'none' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>Categoria</label>
                <select value={form.categoria_id} onChange={e=>setForm({...form,categoria_id:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', background:'#1E293B' }}>
                  <option value="">Selecionar</option>
                  {categorias.filter(c=>c.tipo===form.tipo).map(c=><option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>Conta</label>
                <select value={form.conta_id} onChange={e=>setForm({...form,conta_id:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', background:'#1E293B' }}>
                  <option value="">Selecionar</option>
                  {contas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} style={{ width:'100%', padding:'11px', background:'#22C55E', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
                {saving?'Salvando...':'Criar recorrente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

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

export default function Lancamentos() {
  const supabase = createClient()
  const [mes, setMes]               = useState(getMesAtual())
  const [lanc, setLanc]             = useState([])
  const [categorias, setCategorias] = useState([])
  const [contas, setContas]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtro, setFiltro]         = useState('todos')
  const [modal, setModal]           = useState(false)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState({
    descricao:'', valor:'', tipo:'despesa', categoria_id:'',
    conta_id:'', data: new Date().toISOString().split('T')[0],
    status:'realizado', notas:''
  })

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const q = supabase.from('lanc')
      .select('*, categorias(nome,cor,icone), contas(nome)')
      .eq('user_id', user.id).eq('mes', mes)
      .order('data', { ascending: false })
    if (filtro !== 'todos') q.eq('tipo', filtro === 'pendentes' ? undefined : filtro)
    if (filtro === 'pendentes') q.eq('status', 'a_realizar')
    const { data } = await q
    setLanc(data || [])

    const { data: cats } = await supabase.from('categorias').select('*').or(`user_id.eq.${user.id},user_id.is.null`).order('nome')
    setCategorias(cats || [])
    const { data: cts } = await supabase.from('contas').select('*').eq('user_id', user.id).eq('ativo', true)
    setContas(cts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [mes, filtro])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('lanc').insert({
      ...form, user_id: user.id,
      valor: parseFloat(form.valor.replace(',','.')),
      categoria_id: form.categoria_id || null,
      conta_id: form.conta_id || null,
    })
    setModal(false)
    setForm({ descricao:'', valor:'', tipo:'despesa', categoria_id:'', conta_id:'', data: new Date().toISOString().split('T')[0], status:'realizado', notas:'' })
    setSaving(false)
    load()
  }

  async function excluir(id) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from('lanc').delete().eq('id', id)
    load()
  }

  async function marcarRealizado(id) {
    await supabase.from('lanc').update({ status: 'realizado' }).eq('id', id)
    load()
  }

  const filtrados = lanc.filter(l => {
    if (filtro === 'receitas') return l.tipo === 'receita'
    if (filtro === 'despesas') return l.tipo === 'despesa'
    if (filtro === 'pendentes') return l.status === 'a_realizar'
    return true
  })

  const totalReceitas = lanc.filter(l=>l.tipo==='receita'&&l.status==='realizado').reduce((s,l)=>s+Number(l.valor),0)
  const totalDespesas = lanc.filter(l=>l.tipo==='despesa'&&l.status==='realizado').reduce((s,l)=>s+Number(l.valor),0)

  // Agrupar por data
  const grupos = filtrados.reduce((acc, l) => {
    const k = l.data; if (!acc[k]) acc[k] = []; acc[k].push(l); return acc
  }, {})

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'900px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#1A1A18' }}>Lançamentos</h1>
            <p style={{ fontSize:'13px', color:'#888' }}>{lanc.length} registros em {mes}</p>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <select value={mes} onChange={e=>setMes(e.target.value)} style={{ padding:'7px 10px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'12px', background:'#FFF', color:'#333' }}>
              {MESES_OPT.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={()=>setModal(true)} style={{ padding:'8px 16px', background:'#1D9E75', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>
              + Novo lançamento
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' }}>
          {[
            { label:'Receitas', value:`R$ ${fmt(totalReceitas)}`, color:'#0F6E56' },
            { label:'Despesas', value:`R$ ${fmt(totalDespesas)}`, color:'#A32D2D' },
            { label:'Resultado', value:`R$ ${fmt(totalReceitas-totalDespesas)}`, color: totalReceitas>=totalDespesas?'#0F6E56':'#A32D2D' },
          ].map(m=>(
            <div key={m.label} style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'12px 16px' }}>
              <div style={{ fontSize:'11px', color:'#888', marginBottom:'3px' }}>{m.label}</div>
              <div style={{ fontSize:'16px', fontWeight:'600', color:m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'16px' }}>
          {['todos','receitas','despesas','pendentes'].map(f=>(
            <button key={f} onClick={()=>setFiltro(f)} style={{
              padding:'5px 12px', borderRadius:'20px', border:'1px solid', fontSize:'11px', cursor:'pointer',
              background: filtro===f ? '#1D9E75' : '#FFF',
              color: filtro===f ? '#FFF' : '#666',
              borderColor: filtro===f ? '#1D9E75' : '#E8E8E5',
            }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        {/* Lista agrupada por data */}
        {loading ? <p style={{ color:'#AAA', fontSize:'13px' }}>Carregando...</p> :
          Object.keys(grupos).sort((a,b)=>b.localeCompare(a)).map(data => (
            <div key={data} style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'11px', color:'#AAA', fontWeight:'500', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.05em' }}>
                {new Date(data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long', day:'2-digit', month:'long'})}
              </div>
              <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', overflow:'hidden' }}>
                {grupos[data].map((l,i) => (
                  <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderBottom: i<grupos[data].length-1 ? '1px solid #F0F0EE' : 'none' }}>
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:l.categorias?.cor||'#888', flexShrink:0 }}></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', color:'#222' }}>{l.descricao}</div>
                      <div style={{ fontSize:'10px', color:'#AAA' }}>{l.categorias?.nome||'—'} · {l.contas?.nome||'—'} · {l.origem}</div>
                    </div>
                    {l.status==='a_realizar' && (
                      <button onClick={()=>marcarRealizado(l.id)} style={{ fontSize:'9px', padding:'2px 8px', background:'#FAEEDA', color:'#633806', border:'none', borderRadius:'20px', cursor:'pointer' }}>
                        ⏳ Realizar
                      </button>
                    )}
                    <span style={{ fontSize:'14px', fontWeight:'500', color: l.tipo==='receita'?'#0F6E56':'#1A1A18', flexShrink:0 }}>
                      {l.tipo==='receita'?'+':'-'}R$ {fmt(l.valor)}
                    </span>
                    <button onClick={()=>excluir(l.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#CCC', fontSize:'14px', padding:'2px' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))
        }
        {!loading && filtrados.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px', color:'#AAA', fontSize:'13px' }}>
            Nenhum lançamento encontrado
          </div>
        )}
      </div>

      {/* Modal novo lançamento */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#FFF', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'420px', margin:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:'600', color:'#1A1A18' }}>Novo lançamento</h2>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#888' }}>×</button>
            </div>
            <form onSubmit={salvar}>
              {/* Tipo */}
              <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
                {['despesa','receita'].map(t=>(
                  <button type="button" key={t} onClick={()=>setForm({...form,tipo:t})} style={{
                    flex:1, padding:'8px', borderRadius:'8px', border:'1px solid',
                    background: form.tipo===t ? (t==='receita'?'#E1F5EE':'#FCEBEB') : '#FFF',
                    color: form.tipo===t ? (t==='receita'?'#0F6E56':'#A32D2D') : '#666',
                    borderColor: form.tipo===t ? (t==='receita'?'#9FE1CB':'#F7C1C1') : '#E8E8E5',
                    cursor:'pointer', fontSize:'13px', fontWeight:'500',
                  }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
                ))}
              </div>
              {[
                { label:'Descrição', key:'descricao', type:'text', placeholder:'Ex: Supermercado', required:true },
                { label:'Valor', key:'valor', type:'text', placeholder:'0,00', required:true },
                { label:'Data', key:'data', type:'date', required:true },
              ].map(f=>(
                <div key={f.key} style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                    placeholder={f.placeholder} required={f.required}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'13px', outline:'none' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' }}>Categoria</label>
                <select value={form.categoria_id} onChange={e=>setForm({...form,categoria_id:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'13px', background:'#FFF' }}>
                  <option value="">Selecionar</option>
                  {categorias.filter(c=>c.tipo===form.tipo).map(c=><option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' }}>Conta</label>
                <select value={form.conta_id} onChange={e=>setForm({...form,conta_id:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'13px', background:'#FFF' }}>
                  <option value="">Selecionar</option>
                  {contas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' }}>Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E8E8E5', borderRadius:'8px', fontSize:'13px', background:'#FFF' }}>
                  <option value="realizado">Realizado</option>
                  <option value="a_realizar">A realizar</option>
                </select>
              </div>
              <button type="submit" disabled={saving} style={{ width:'100%', padding:'11px', background:'#1D9E75', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
                {saving ? 'Salvando...' : 'Salvar lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

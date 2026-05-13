'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../dashboard/AppLayout'

const MESES_OPT = Array.from({length:24},(_,i)=>{
  const d = new Date(); d.setMonth(d.getMonth()-i)
  const m = String(d.getMonth()+1).padStart(2,'0')
  const a = String(d.getFullYear()).slice(-2)
  return { value:`${m}/${a}`, label:`${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][d.getMonth()]}/${d.getFullYear()}` }
})

function getMesAtual() {
  const d = new Date()
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
}

function fmt(v) {
  return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
}

const C = {
  bg:'#0F172A', card:'#1E293B', border:'rgba(255,255,255,0.07)',
  green:'#22C55E', red:'#EF4444', yellow:'#F59E0B',
  text:'#F1F5F9', muted:'#64748B', sub:'#94A3B8',
}

const inp = {
  background:'#0F172A', border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:'8px', color:'#F1F5F9', fontSize:'13px',
  padding:'7px 10px', outline:'none', fontFamily:"'Inter', sans-serif",
}

const sel = { ...inp, cursor:'pointer' }

export default function Lancamentos() {
  const supabase = createClient()
  const [user, setUser]           = useState(null)
  const [lanc, setLanc]           = useState([])
  const [categorias, setCategorias] = useState([])
  const [contas, setContas]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [mes, setMes]             = useState(getMesAtual())
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroConta, setFiltroConta] = useState('todos')
  const [busca, setBusca]         = useState('')
  const [editId, setEditId]       = useState(null)
  const [form, setForm]           = useState({
    descricao:'', valor:'', tipo:'despesa',
    categoria_id:'', conta_id:'',
    data: new Date().toISOString().split('T')[0],
    status:'realizado',
    recorrente: false,
    dia_vencimento: '1',
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      await load(user, mes)
    }
    init()
  }, [])

  useEffect(() => { if (user) load(user, mes) }, [mes])

  async function load(u, m) {
    setLoading(true)
    const uid = u?.id || user?.id
    let query = supabase.from('cp_lanc')
      .select('*, cp_categorias(nome,cor,icone), cp_contas(nome)')
      .eq('user_id', uid).eq('mes', m)
      .order('data', { ascending: false })
    const { data } = await query
    setLanc(data || [])
    const { data: cats } = await supabase.from('cp_categorias')
      .select('*').or(`user_id.eq.${uid},user_id.is.null`).order('nome')
    setCategorias(cats || [])
    const { data: cts } = await supabase.from('cp_contas')
      .select('*').eq('user_id', uid).eq('ativo', true)
    setContas(cts || [])
    setLoading(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const d = form.data
    const mesLanc = d.split('-')[1] + '/' + d.split('-')[0].slice(-2)
    if (editId) {
      await supabase.from('cp_lanc').update({
        tipo: form.tipo, descricao: form.descricao,
        valor: parseFloat(form.valor.replace(',','.')),
        data: form.data, mes: mesLanc,
        categoria_id: form.categoria_id || null,
        conta_id: form.conta_id || null,
        status: form.status,
      }).eq('id', editId)
    } else {
      const valorNum = parseFloat(form.valor.replace(',','.'))
      await supabase.from('cp_lanc').insert({
        user_id: u.id, tipo: form.tipo, descricao: form.descricao,
        valor: valorNum, data: form.data, mes: mesLanc,
        categoria_id: form.categoria_id || null,
        conta_id: form.conta_id || null,
        status: form.status,
      })
      if (form.recorrente) {
        await supabase.from('cp_recorrentes').insert({
          user_id: u.id, descricao: form.descricao, tipo: form.tipo,
          valor: valorNum,
          dia_vencimento: parseInt(form.dia_vencimento) || 1,
          categoria_id: form.categoria_id || null,
          conta_id: form.conta_id || null,
          ativo: true,
        })
      }
    }
    setModal(false); setEditId(null)
    setForm({ descricao:'', valor:'', tipo:'despesa', categoria_id:'', conta_id:'', data: new Date().toISOString().split('T')[0], status:'realizado', recorrente:false, dia_vencimento:'1' })
    setSaving(false)
    load(null, mes)
  }

  function abrirEditar(l) {
    setEditId(l.id)
    setForm({
      descricao: l.descricao,
      valor: String(l.valor).replace('.',','),
      tipo: l.tipo,
      categoria_id: l.categoria_id || '',
      conta_id: l.conta_id || '',
      data: l.data,
      status: l.status,
      recorrente: false,
      dia_vencimento: '1',
    })
    setModal(true)
  }

  function duplicar(l) {
    setEditId(null)
    setForm({
      descricao: l.descricao,
      valor: String(l.valor).replace('.',','),
      tipo: l.tipo,
      categoria_id: l.categoria_id || '',
      conta_id: l.conta_id || '',
      data: new Date().toISOString().split('T')[0],
      status: l.status,
      recorrente: false,
      dia_vencimento: '1',
    })
    setModal(true)
  }

  async function excluir(id) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from('cp_lanc').delete().eq('id', id)
    load(null, mes)
  }

  async function marcarRealizado(id) {
    await supabase.from('cp_lanc').update({ status:'realizado' }).eq('id', id)
    load(null, mes)
  }

  // Filtros aplicados
  const filtrados = lanc.filter(l => {
    if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false
    if (filtroStatus !== 'todos' && l.status !== filtroStatus) return false
    if (filtroConta !== 'todos' && l.conta_id !== filtroConta) return false
    if (busca && !l.descricao.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const receitas  = filtrados.filter(l=>l.tipo==='receita'&&l.status==='realizado').reduce((s,l)=>s+Number(l.valor),0)
  const despesas  = filtrados.filter(l=>l.tipo==='despesa'&&l.status==='realizado').reduce((s,l)=>s+Number(l.valor),0)
  const saldo     = receitas - despesas

  // Agrupar por data
  const grupos = filtrados.reduce((g,l) => {
    const dt = l.data; if (!g[dt]) g[dt] = []; g[dt].push(l); return g
  }, {})
  const datas = Object.keys(grupos).sort((a,b) => b.localeCompare(a))

  const labelStyle = { display:'block', fontSize:'11px', color: C.muted, marginBottom:'4px' }
  const inputModal = { width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', fontSize:'13px', outline:'none', background:'#1E293B', color:'#F1F5F9', fontFamily:"'Inter', sans-serif" }

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'1100px', fontFamily:"'Inter', sans-serif" }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:'600', color: C.text }}>Lançamentos</h1>
            <p style={{ fontSize:'13px', color: C.muted }}>
              {filtrados.length} registros · +R$ {fmt(receitas)} · -R$ {fmt(despesas)} · Saldo: R$ {fmt(saldo)}
            </p>
          </div>
          <button onClick={()=>setModal(true)} style={{
            padding:'9px 18px', background: C.green, color:'#0F172A',
            border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600',
            cursor:'pointer', fontFamily:"'Inter', sans-serif",
          }}>+ Novo</button>
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap', alignItems:'center' }}>
          <select value={mes} onChange={e=>{setMes(e.target.value)}} style={sel}>
            {MESES_OPT.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={sel}>
            <option value="todos">Entrada/Saída</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>

          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={sel}>
            <option value="todos">Status</option>
            <option value="realizado">Realizado</option>
            <option value="a_realizar">A realizar</option>
          </select>

          <select value={filtroConta} onChange={e=>setFiltroConta(e.target.value)} style={sel}>
            <option value="todos">Todos os bancos</option>
            {contas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          <input
            type="text" placeholder="🔍 Buscar em todos os meses" value={busca}
            onChange={e=>setBusca(e.target.value)}
            style={{ ...sel, minWidth:'220px', flex:1 }}
          />
        </div>

        {/* Lista */}
        {loading
          ? <p style={{ color: C.muted, fontSize:'13px' }}>Carregando...</p>
          : datas.length === 0
          ? <div style={{ textAlign:'center', padding:'60px', color: C.muted, fontSize:'13px' }}>
              Nenhum lançamento encontrado
            </div>
          : datas.map(data => (
            <div key={data} style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'11px', color: C.muted, fontWeight:'600', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.05em' }}>
                {new Date(data+'T12:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' })}
              </div>
              <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:'12px', overflow:'hidden' }}>
                {grupos[data].map((l, i) => (
                  <div key={l.id} style={{
                    display:'flex', alignItems:'center', gap:'10px', padding:'11px 14px',
                    borderBottom: i < grupos[data].length-1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: l.cp_categorias?.cor||'#64748B', flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'13px', color: C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{l.descricao}</div>
                      <div style={{ fontSize:'11px', color: C.muted }}>{l.cp_categorias?.nome||'—'} · {l.cp_contas?.nome||'—'}</div>
                    </div>
                    <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'8px' }}>
                      {l.status === 'a_realizar' && (
                        <>
                          <span style={{ fontSize:'10px', padding:'2px 8px', background:'rgba(245,158,11,0.15)', color: C.yellow, borderRadius:'20px', border:'1px solid rgba(245,158,11,0.3)' }}>A Realizar</span>
                          <button onClick={()=>marcarRealizado(l.id)} style={{ fontSize:'10px', padding:'3px 8px', background:'rgba(34,197,94,0.15)', color: C.green, border:'1px solid rgba(34,197,94,0.3)', borderRadius:'6px', cursor:'pointer' }}>✓</button>
                        </>
                      )}
                      <span style={{ fontSize:'13px', fontWeight:'600', color: l.tipo==='receita' ? C.green : C.red, minWidth:'90px', textAlign:'right' }}>
                        {l.tipo==='receita' ? '+' : '-'}R$ {fmt(l.valor)}
                      </span>
                      <button onClick={()=>duplicar(l)} style={{ fontSize:'11px', padding:'3px 10px', background:'rgba(139,92,246,0.1)', color:'#8B5CF6', border:'1px solid rgba(139,92,246,0.3)', borderRadius:'6px', cursor:'pointer' }}>⧉</button>
                      <button onClick={()=>abrirEditar(l)} style={{ fontSize:'11px', padding:'3px 10px', background:'rgba(255,255,255,0.06)', color: C.sub, border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', cursor:'pointer' }}>Editar</button>
                      <button onClick={()=>excluir(l.id)} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'6px', cursor:'pointer', color: C.red, fontSize:'13px', padding:'3px 8px', lineHeight:1 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1E293B', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'420px', margin:'16px', border:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:'600', color: C.text }}>{editId ? 'Editar lançamento' : 'Novo lançamento'}</h2>
              <button onClick={()=>{setModal(false);setEditId(null)}} style={{ background:'none', border:'none', color: C.muted, fontSize:'20px', cursor:'pointer' }}>×</button>
            </div>

            <form onSubmit={salvar}>
              {/* Tipo */}
              <div style={{ display:'flex', gap:'6px', marginBottom:'14px' }}>
                {['despesa','receita'].map(t=>(
                  <button type="button" key={t} onClick={()=>setForm({...form,tipo:t})} style={{
                    flex:1, padding:'8px', borderRadius:'8px',
                    border: `1px solid ${form.tipo===t ? (t==='receita'?C.green:C.red) : 'rgba(255,255,255,0.1)'}`,
                    background: form.tipo===t ? (t==='receita'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.03)',
                    color: form.tipo===t ? (t==='receita'?C.green:C.red) : C.muted,
                    cursor:'pointer', fontSize:'13px', fontWeight:'500', fontFamily:"'Inter', sans-serif",
                  }}>{t === 'receita' ? 'Receita' : 'Despesa'}</button>
                ))}
              </div>

              {[
                { label:'Descrição', key:'descricao', type:'text', placeholder:'Ex: Supermercado', required:true },
                { label:'Valor', key:'valor', type:'text', placeholder:'0,00', required:true },
                { label:'Data', key:'data', type:'date', required:true },
              ].map(f=>(
                <div key={f.key} style={{ marginBottom:'12px' }}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                    placeholder={f.placeholder} required={f.required} style={inputModal} />
                </div>
              ))}

              <div style={{ marginBottom:'12px' }}>
                <label style={labelStyle}>Categoria</label>
                <select value={form.categoria_id} onChange={e=>setForm({...form,categoria_id:e.target.value})} style={inputModal}>
                  <option value="">Selecionar</option>
                  {categorias.filter(c=>c.tipo===form.tipo).map(c=><option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:'12px' }}>
                <label style={labelStyle}>Conta</label>
                <select value={form.conta_id} onChange={e=>setForm({...form,conta_id:e.target.value})} style={inputModal}>
                  <option value="">Selecionar</option>
                  {contas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:'18px' }}>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inputModal}>
                  <option value="realizado">Realizado</option>
                  <option value="a_realizar">A realizar</option>
                </select>
              </div>

              {!editId && (
                <div style={{ marginBottom:'14px' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
                    <input type="checkbox" checked={form.recorrente} onChange={e=>setForm({...form,recorrente:e.target.checked})}
                      style={{ width:'16px', height:'16px', accentColor:'#22C55E', cursor:'pointer' }} />
                    <span style={{ fontSize:'13px', color: C.sub }}>Tornar recorrente</span>
                  </label>
                  {form.recorrente && (
                    <div style={{ marginTop:'10px' }}>
                      <label style={{ display:'block', fontSize:'11px', color: C.muted, marginBottom:'4px' }}>Dia de vencimento todo mês</label>
                      <input type="number" min="1" max="31" value={form.dia_vencimento}
                        onChange={e=>setForm({...form,dia_vencimento:e.target.value})}
                        style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', fontSize:'13px', outline:'none', background:'#1E293B', color:'#F1F5F9', fontFamily:"'Inter', sans-serif" }} />
                    </div>
                  )}
                </div>
              )}
              <button type="submit" disabled={saving} style={{
                width:'100%', padding:'11px', background: C.green, color:'#0F172A',
                border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600',
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily:"'Inter', sans-serif",
              }}>
                {saving ? 'Salvando...' : editId ? 'Atualizar' : 'Salvar lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../dashboard/AppLayout'

const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function fmt(v, sempre=false) {
  const n = Number(v||0)
  if (!sempre && n === 0) return '—'
  return n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
}

function fmtSinal(v) {
  const n = Number(v||0)
  if (n === 0) return <span style={{color:'#64748B'}}>—</span>
  return <span style={{color: n>0?'#22C55E':'#EF4444'}}>{n>0?'+':''}-R${fmt(Math.abs(n))}</span>
}

function getHoje() { return new Date().toISOString().split('T')[0] }
function getPrimeiroDiaMes(d=new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }
function getUltimoDiaMes(d=new Date()) { return new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().split('T')[0] }

const C = {
  bg:'#0F172A', card:'#1E293B', card2:'#162032', border:'rgba(255,255,255,0.07)',
  green:'#22C55E', red:'#EF4444', yellow:'#F59E0B', blue:'#3B82F6', purple:'#8B5CF6',
  text:'#F1F5F9', muted:'#64748B', sub:'#94A3B8',
}

const inp = { background:'#0F172A', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#F1F5F9', fontSize:'13px', padding:'7px 10px', outline:'none', fontFamily:"'Inter',sans-serif" }
const thStyle = { padding:'10px 14px', fontSize:'11px', color:C.muted, fontWeight:'600', textTransform:'uppercase', letterSpacing:'.06em', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }
const tdStyle = { padding:'10px 14px', fontSize:'13px', borderBottom:`1px solid ${C.border}`, textAlign:'right', verticalAlign:'top' }

export default function Fluxo() {
  const supabase = createClient()
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [de, setDe]         = useState(getPrimeiroDiaMes())
  const [ate, setAte]       = useState(getHoje())
  const [contas, setContas] = useState([])
  const [contaFiltro, setContaFiltro] = useState('todos')
  const [lancs, setLancs]   = useState([])
  const [saldoBase, setSaldoBase] = useState(0)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const { data: cts } = await supabase.from('cp_contas').select('*').eq('user_id', user.id).eq('ativo', true)
      setContas(cts || [])
      await load(user, de, ate, 'todos')
    }
    init()
  }, [])

  async function load(u, dataInicio, dataFim, conta) {
    setLoading(true)
    const uid = u?.id || user?.id

    // Saldo antes do período
    let qAntes = supabase.from('cp_lanc').select('tipo,valor').eq('user_id', uid).eq('status','realizado').lt('data', dataInicio)
    if (conta !== 'todos') qAntes = qAntes.eq('conta_id', conta)
    const { data: antes } = await qAntes
    const saldoInicial = (antes||[]).reduce((s,l) => s + (l.tipo==='receita'?Number(l.valor):-Number(l.valor)), 0)
    setSaldoBase(saldoInicial)

    // Lançamentos do período
    let q = supabase.from('cp_lanc')
      .select('*, cp_categorias(nome,cor), cp_contas(nome)')
      .eq('user_id', uid)
      .gte('data', dataInicio).lte('data', dataFim)
      .eq('status','realizado')
      .order('data', { ascending: true })
    if (conta !== 'todos') q = q.eq('conta_id', conta)
    const { data } = await q
    setLancs(data || [])
    setLoading(false)
  }

  function aplicar(novosDe, novosAte) {
    setDe(novosDe); setAte(novosAte)
    load(null, novosDe, novosAte, contaFiltro)
  }

  function filtroHistorico() {
    const d = new Date(); d.setMonth(d.getMonth()-6)
    aplicar(getPrimeiroDiaMes(d), getHoje())
  }
  function filtroEsteMes() { aplicar(getPrimeiroDiaMes(), getUltimoDiaMes()) }
  function filtroProx60() {
    const hoje = getHoje()
    const fim = new Date(); fim.setDate(fim.getDate()+60)
    aplicar(hoje, fim.toISOString().split('T')[0])
  }
  function filtroTudo() { aplicar('2020-01-01', getHoje()) }

  // Calcular resumo por mês
  const resumoMes = {}
  lancs.forEach(l => {
    const [y,m] = l.data.split('-')
    const key = `${y}-${m}`
    if (!resumoMes[key]) resumoMes[key] = { receitas:0, despesas:0 }
    if (l.tipo==='receita') resumoMes[key].receitas += Number(l.valor)
    else resumoMes[key].despesas += Number(l.valor)
  })

  const mesesOrdenados = Object.keys(resumoMes).sort()
  let saldoCorrMes = saldoBase
  const resumoMesLista = mesesOrdenados.map(key => {
    const { receitas, despesas } = resumoMes[key]
    const variacao = receitas - despesas
    saldoCorrMes += variacao
    const [y,m] = key.split('-')
    return { key, label: `${MESES_LABEL[parseInt(m)-1]}/${y.slice(-2)}`, receitas, despesas, variacao, saldoFinal: saldoCorrMes }
  })

  // Calcular detalhe diário
  const diasMap = {}
  lancs.forEach(l => {
    if (!diasMap[l.data]) diasMap[l.data] = { receitas:0, despesas:0, items:[] }
    if (l.tipo==='receita') diasMap[l.data].receitas += Number(l.valor)
    else diasMap[l.data].despesas += Number(l.valor)
    diasMap[l.data].items.push(l)
  })

  // Preencher todos os dias do período
  const allDias = []
  const start = new Date(de+'T12:00:00')
  const end   = new Date(ate+'T12:00:00')
  let saldoCorrDia = saldoBase
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
    const key = d.toISOString().split('T')[0]
    const dia = diasMap[key] || { receitas:0, despesas:0, items:[] }
    saldoCorrDia += dia.receitas - dia.despesas
    allDias.push({ key, dia: DIAS_SEMANA[d.getDay()], receitas: dia.receitas, despesas: dia.despesas, variacao: dia.receitas - dia.despesas, saldo: saldoCorrDia, items: dia.items })
  }

  const totalReceitas = lancs.filter(l=>l.tipo==='receita').reduce((s,l)=>s+Number(l.valor),0)
  const totalDespesas = lancs.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+Number(l.valor),0)
  const variacao = totalReceitas - totalDespesas
  const saldoFinal = saldoBase + variacao
  const diasNegativos = allDias.filter(d=>d.saldo<0).length

  const btnFiltro = (label, fn) => (
    <button onClick={fn} style={{ padding:'6px 14px', borderRadius:'20px', border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.sub, fontSize:'12px', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}
      onMouseEnter={e=>{e.target.style.background='rgba(34,197,94,0.12)';e.target.style.color=C.green}}
      onMouseLeave={e=>{e.target.style.background='rgba(255,255,255,0.05)';e.target.style.color=C.sub}}
    >{label}</button>
  )

  return (
    <AppLayout>
      <div style={{ padding:'24px', fontFamily:"'Inter',sans-serif", maxWidth:'1200px' }}>

        {/* Header */}
        <h1 style={{ fontSize:'20px', fontWeight:'600', color:C.text, marginBottom:'20px' }}>Fluxo Diário</h1>

        {/* Filtros */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
          <select value={contaFiltro} onChange={e=>{setContaFiltro(e.target.value); load(null,de,ate,e.target.value)}} style={{...inp, cursor:'pointer'}}>
            <option value="todos">Todos os bancos</option>
            {contas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input type="date" value={de} onChange={e=>setDe(e.target.value)} style={inp}/>
          <span style={{color:C.muted}}>→</span>
          <input type="date" value={ate} onChange={e=>setAte(e.target.value)} style={inp}/>
          <button onClick={()=>load(null,de,ate,contaFiltro)} style={{ padding:'7px 14px', background:C.green, color:'#0F172A', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>Filtrar</button>
          {btnFiltro('Histórico', filtroHistorico)}
          {btnFiltro('Este mês', filtroEsteMes)}
          {btnFiltro('Próx. 60d', filtroProx60)}
          {btnFiltro('Tudo', filtroTudo)}
        </div>

        {/* KPI Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px', marginBottom:'16px' }}>
          {[
            { label:'Saldo inicial · Total', value:`R$ ${fmt(saldoBase,true)}`, sub: new Date(de+'T12:00:00').toLocaleDateString('pt-BR'), color:C.text, accent:'#162032', dot:C.muted },
            { label:'Entradas', value:`+R$ ${fmt(totalReceitas,true)}`, sub:'No período', color:C.green, accent:'rgba(34,197,94,0.08)', dot:C.green },
            { label:'Saídas', value:`-R$ ${fmt(totalDespesas,true)}`, sub:'No período', color:C.red, accent:'rgba(239,68,68,0.08)', dot:C.red },
            { label:'Variação', value:`${variacao>=0?'+':''}R$ ${fmt(Math.abs(variacao),true)}`, sub:`${totalReceitas>0?(variacao/totalReceitas*100).toFixed(1):'0'}%`, color:variacao>=0?C.green:C.red, accent:variacao>=0?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)', dot:variacao>=0?C.green:C.red },
            { label:'Saldo final · Total', value:`R$ ${fmt(saldoFinal,true)}`, sub: new Date(ate+'T12:00:00').toLocaleDateString('pt-BR'), color:saldoFinal>=0?C.green:C.red, accent:'rgba(139,92,246,0.08)', dot:C.purple },
          ].map(k => (
            <div key={k.label} style={{ background:k.accent, border:`1px solid ${k.dot}25`, borderRadius:'12px', padding:'14px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, width:'3px', height:'100%', background:k.dot, borderRadius:'12px 0 0 12px' }}/>
              <div style={{ fontSize:'11px', color:C.muted, marginBottom:'6px', paddingLeft:'4px' }}>{k.label}</div>
              <div style={{ fontSize:'18px', fontWeight:'700', color:k.color, paddingLeft:'4px' }}>{loading?'—':k.value}</div>
              <div style={{ fontSize:'11px', color:C.muted, marginTop:'2px', paddingLeft:'4px' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Alerta dias negativos */}
        <div style={{ background: diasNegativos===0?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${diasNegativos===0?C.green:C.red}30`, borderRadius:'10px', padding:'10px 16px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'14px' }}>{diasNegativos===0?'✅':'⚠️'}</span>
          <span style={{ fontSize:'13px', color: diasNegativos===0?C.green:C.red, fontWeight:'500' }}>
            {diasNegativos===0 ? 'Nenhum dia com saldo negativo' : `${diasNegativos} dia${diasNegativos>1?'s':''} com saldo negativo no período`}
          </span>
        </div>

        {/* Resumo por mês */}
        {resumoMesLista.length > 0 && (
          <div style={{ marginBottom:'24px' }}>
            <h2 style={{ fontSize:'12px', fontWeight:'600', color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'10px' }}>Resumo por mês</h2>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={{...thStyle, textAlign:'left'}}>Mês</th>
                    <th style={thStyle}>Entradas</th>
                    <th style={thStyle}>Saídas</th>
                    <th style={thStyle}>Variação</th>
                    <th style={thStyle}>Saldo Final</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoMesLista.map(m => (
                    <tr key={m.key} style={{ transition:'background 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{...tdStyle, textAlign:'left', color:C.text, fontWeight:'500'}}>{m.label}</td>
                      <td style={{...tdStyle, color:C.green}}>+R${fmt(m.receitas,true)}</td>
                      <td style={{...tdStyle, color:C.red}}>-R${fmt(m.despesas,true)}</td>
                      <td style={{...tdStyle, color:m.variacao>=0?C.green:C.red}}>{m.variacao>=0?'+':''}R${fmt(Math.abs(m.variacao),true)}</td>
                      <td style={{...tdStyle, color:m.saldoFinal>=0?C.green:C.red, fontWeight:'600'}}>R${fmt(m.saldoFinal,true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detalhe diário */}
        <div>
          <h2 style={{ fontSize:'12px', fontWeight:'600', color:C.muted, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'10px' }}>Detalhe diário</h2>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={{...thStyle, textAlign:'left', width:'110px'}}>Data</th>
                  <th style={{...thStyle, textAlign:'left', width:'50px'}}>Dia</th>
                  <th style={thStyle}>Entradas</th>
                  <th style={thStyle}>Saídas</th>
                  <th style={thStyle}>Variação</th>
                  <th style={thStyle}>Saldo</th>
                  <th style={{...thStyle, textAlign:'left'}}>Lançamentos</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? <tr><td colSpan={7} style={{...tdStyle, textAlign:'center', color:C.muted, padding:'40px'}}>Carregando...</td></tr>
                  : allDias.map(d => (
                  <tr key={d.key}
                    style={{ transition:'background 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{...tdStyle, textAlign:'left', color:C.sub, fontVariantNumeric:'tabular-nums'}}>
                      {new Date(d.key+'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{...tdStyle, textAlign:'left', color:C.muted}}>{d.dia}</td>
                    <td style={{...tdStyle, color: d.receitas>0?C.green:C.muted}}>
                      {d.receitas>0?`+R$${fmt(d.receitas,true)}`:'—'}
                    </td>
                    <td style={{...tdStyle, color: d.despesas>0?C.red:C.muted}}>
                      {d.despesas>0?`-R$${fmt(d.despesas,true)}`:'—'}
                    </td>
                    <td style={{...tdStyle, color: d.variacao>0?C.green:d.variacao<0?C.red:C.muted}}>
                      {d.variacao!==0?`${d.variacao>0?'+':''}R$${fmt(Math.abs(d.variacao),true)}`:'—'}
                    </td>
                    <td style={{...tdStyle, color: d.saldo>=0?C.green:C.red, fontWeight:'600'}}>
                      R${fmt(d.saldo,true)}
                    </td>
                    <td style={{...tdStyle, textAlign:'left', maxWidth:'260px'}}>
                      {d.items.length===0
                        ? <span style={{color:C.muted}}>—</span>
                        : d.items.slice(0,3).map((l,i)=>(
                          <div key={i} style={{ fontSize:'11px', color: l.tipo==='receita'?C.green:C.red, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {l.tipo==='receita'?'↑':'↓'} {l.descricao} R${fmt(l.valor,true)}
                          </div>
                        ))
                      }
                      {d.items.length>3 && <div style={{fontSize:'10px',color:C.muted}}>+{d.items.length-3} mais</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

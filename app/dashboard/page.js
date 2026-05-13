'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from './AppLayout'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmt(v) {
  return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
}

function getMesLabel(mes) {
  const [m,a] = mes.split('/')
  return `${MESES[parseInt(m)-1]}/${a}`
}

function getHoje() {
  return new Date().toISOString().split('T')[0]
}

function getPrimeiroDiaMes(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`
}

function getUltimoDiaMes(date = new Date()) {
  const last = new Date(date.getFullYear(), date.getMonth()+1, 0)
  return last.toISOString().split('T')[0]
}

function getMesStr(date = new Date()) {
  return `${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getFullYear()).slice(-2)}`
}

const C = {
  bg: '#0F172A', card: '#1E293B', card2: '#162032',
  border: 'rgba(255,255,255,0.07)',
  green: '#22C55E', greenDim: 'rgba(34,197,94,0.12)',
  purple: '#8B5CF6', purpleDim: 'rgba(139,92,246,0.12)',
  red: '#EF4444', redDim: 'rgba(239,68,68,0.12)',
  yellow: '#F59E0B', yellowDim: 'rgba(245,158,11,0.12)',
  blue: '#3B82F6', blueDim: 'rgba(59,130,246,0.12)',
  text: '#F1F5F9', muted: '#64748B', sub: '#94A3B8',
}

const inp = {
  background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', color: '#F1F5F9', fontSize: '13px',
  padding: '7px 10px', outline: 'none', fontFamily: "'Inter', sans-serif",
}

export default function Dashboard() {
  const supabase = createClient()
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [de, setDe]           = useState(getPrimeiroDiaMes())
  const [ate, setAte]         = useState(getUltimoDiaMes())
  const [dados, setDados]     = useState({
    receitas: 0, despesas: 0, saldoAnterior: 0,
    patrimonio: 0, aRealizar: 0, totalLanc: 0,
    orcamento: [], lancRecentes: [], contas: [],
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      await load(user, de, ate)
    }
    init()
  }, [])

  async function load(u, dataInicio, dataFim) {
    setLoading(true)
    const uid = u?.id || user?.id

    // Saldo período anterior (antes de 'de')
    const { data: anterior } = await supabase.from('cp_lanc')
      .select('tipo, valor')
      .eq('user_id', uid)
      .eq('status', 'realizado')
      .lt('data', dataInicio)
    const saldoAnterior = (anterior||[]).reduce((s,l) =>
      s + (l.tipo==='receita' ? Number(l.valor) : -Number(l.valor)), 0)

    // Lançamentos do período
    const { data: lancs } = await supabase.from('cp_lanc')
      .select('*, cp_categorias(nome,cor,icone), cp_contas(nome)')
      .eq('user_id', uid)
      .gte('data', dataInicio).lte('data', dataFim)
      .order('data', { ascending: false })

    const realizados = (lancs||[]).filter(l => l.status === 'realizado')
    const pendentes  = (lancs||[]).filter(l => l.status === 'a_realizar')

    const receitas  = realizados.filter(l => l.tipo==='receita').reduce((s,l) => s+Number(l.valor), 0)
    const despesas  = realizados.filter(l => l.tipo==='despesa').reduce((s,l) => s+Number(l.valor), 0)
    const aRealizar = pendentes.filter(l => l.tipo==='despesa').reduce((s,l) => s+Number(l.valor), 0)

    // Contas e patrimônio
    const { data: contas } = await supabase.from('cp_saldos_por_conta')
      .select('*').order('saldo_atual', { ascending: false })
    const patrimonio = (contas||[]).filter(c => c.incluir_patrimonio)
      .reduce((s,c) => s+Number(c.saldo_atual||0), 0)

    // Orçamento do mês atual
    const mesAtual = getMesStr()
    const { data: orc } = await supabase.from('cp_orcamento_vs_realizado')
      .select('*').eq('user_id', uid).eq('mes', mesAtual)
      .order('percentual', { ascending: false }).limit(5)

    setDados({
      receitas, despesas, saldoAnterior, patrimonio, aRealizar,
      totalLanc: (lancs||[]).length,
      orcamento: orc || [],
      lancRecentes: (lancs||[]).slice(0, 6),
      contas: contas || [],
    })
    setLoading(false)
  }

  function aplicarFiltro(novosDe, novosAte) {
    setDe(novosDe); setAte(novosAte)
    load(null, novosDe, novosAte)
  }

  function filtroEsteMes() {
    const d = new Date()
    aplicarFiltro(getPrimeiroDiaMes(d), getUltimoDiaMes(d))
  }
  function filtroMesAnterior() {
    const d = new Date(); d.setMonth(d.getMonth()-1)
    aplicarFiltro(getPrimeiroDiaMes(d), getUltimoDiaMes(d))
  }
  function filtroYTD() {
    const d = new Date()
    aplicarFiltro(`${d.getFullYear()}-01-01`, getHoje())
  }
  function filtroTudo() {
    aplicarFiltro('2020-01-01', getHoje())
  }

  const { receitas, despesas, saldoAnterior, patrimonio, aRealizar, totalLanc, orcamento, lancRecentes, contas } = dados
  const saldo    = receitas - despesas
  const projetado = saldo + saldoAnterior + aRealizar
  const nome = user?.email?.split('@')[0] || 'você'

  const card = (accent, dot) => ({
    background: accent,
    border: `1px solid ${dot}30`,
    borderRadius: '14px',
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
  })

  const btnFiltro = (label, fn) => (
    <button onClick={fn} style={{
      padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.05)', color: C.sub, fontSize: '12px',
      cursor: 'pointer', fontFamily: "'Inter', sans-serif",
    }}
    onMouseEnter={e => { e.target.style.background='rgba(34,197,94,0.15)'; e.target.style.color=C.green }}
    onMouseLeave={e => { e.target.style.background='rgba(255,255,255,0.05)'; e.target.style.color=C.sub }}
    >{label}</button>
  )

  return (
    <AppLayout>
      <div style={{ padding: '24px', maxWidth: '1200px', fontFamily: "'Inter', sans-serif" }}>

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: C.text, marginBottom: '2px' }}>
            Olá, {nome} 👋
          </h1>
          <p style={{ fontSize: '13px', color: C.muted }}>Visão geral das suas finanças</p>
        </div>

        {/* Filtros de data */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ fontSize:'11px', color: C.muted }}>DE</span>
            <input type="date" value={de} onChange={e => setDe(e.target.value)} style={inp} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ fontSize:'11px', color: C.muted }}>ATÉ</span>
            <input type="date" value={ate} onChange={e => setAte(e.target.value)} style={inp} />
          </div>
          <button onClick={() => load(null, de, ate)} style={{
            padding:'7px 14px', background: C.green, color:'#0F172A',
            border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'600',
            cursor:'pointer', fontFamily:"'Inter', sans-serif",
          }}>Filtrar</button>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {btnFiltro('Este mês', filtroEsteMes)}
            {btnFiltro('Mês anterior', filtroMesAnterior)}
            {btnFiltro('YTD', filtroYTD)}
            {btnFiltro('Tudo', filtroTudo)}
          </div>
        </div>

        {/* KPIs linha 1 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'10px' }}>

          <div style={card(C.card2, C.muted)}>
            <div style={{ fontSize:'11px', color: C.muted, marginBottom:'6px' }}>Saldo inicial do período</div>
            <div style={{ fontSize:'22px', fontWeight:'700', color: C.text }}>{loading ? '—' : `R$ ${fmt(saldoAnterior)}`}</div>
            <div style={{ fontSize:'11px', color: C.muted, marginTop:'2px' }}>Antes de {new Date(de+'T12:00:00').toLocaleDateString('pt-BR')}</div>
          </div>

          <div style={card(C.purpleDim, C.purple)}>
            <div style={{ position:'absolute', top:0, left:0, width:'3px', height:'100%', background: C.purple, borderRadius:'14px 0 0 14px' }}/>
            <div style={{ fontSize:'11px', color: C.muted, marginBottom:'6px' }}>Patrimônio atual</div>
            <div style={{ fontSize:'22px', fontWeight:'700', color: C.purple }}>{loading ? '—' : `R$ ${fmt(patrimonio)}`}</div>
            <div style={{ fontSize:'11px', color: C.muted, marginTop:'2px' }}>{contas.length} contas</div>
          </div>

          <div style={card(C.blueDim, C.blue)}>
            <div style={{ position:'absolute', top:0, left:0, width:'3px', height:'100%', background: C.blue, borderRadius:'14px 0 0 14px' }}/>
            <div style={{ fontSize:'11px', color: C.muted, marginBottom:'6px' }}>Saldo projetado</div>
            <div style={{ fontSize:'22px', fontWeight:'700', color: C.blue }}>{loading ? '—' : `R$ ${fmt(saldoAnterior + saldo)}`}</div>
            <div style={{ fontSize:'11px', color: C.muted, marginTop:'2px' }}>A realizar: R$ {fmt(aRealizar)}</div>
          </div>

        </div>

        {/* KPIs linha 2 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>

          <div style={card(C.greenDim, C.green)}>
            <div style={{ position:'absolute', top:0, left:0, width:'3px', height:'100%', background: C.green, borderRadius:'14px 0 0 14px' }}/>
            <div style={{ fontSize:'11px', color: C.muted, marginBottom:'6px' }}>Receitas do período</div>
            <div style={{ fontSize:'22px', fontWeight:'700', color: C.green }}>{loading ? '—' : `R$ ${fmt(receitas)}`}</div>
            <div style={{ fontSize:'11px', color: C.muted, marginTop:'2px' }}>{totalLanc} lançamentos</div>
          </div>

          <div style={card(C.redDim, C.red)}>
            <div style={{ position:'absolute', top:0, left:0, width:'3px', height:'100%', background: C.red, borderRadius:'14px 0 0 14px' }}/>
            <div style={{ fontSize:'11px', color: C.muted, marginBottom:'6px' }}>Despesas do período</div>
            <div style={{ fontSize:'22px', fontWeight:'700', color: C.red }}>{loading ? '—' : `R$ ${fmt(despesas)}`}</div>
            <div style={{ fontSize:'11px', color: C.muted, marginTop:'2px' }}>Saídas totais</div>
          </div>

          <div style={card(saldo >= 0 ? C.greenDim : C.redDim, saldo >= 0 ? C.green : C.red)}>
            <div style={{ position:'absolute', top:0, left:0, width:'3px', height:'100%', background: saldo >= 0 ? C.green : C.red, borderRadius:'14px 0 0 14px' }}/>
            <div style={{ fontSize:'11px', color: C.muted, marginBottom:'6px' }}>Saldo do período</div>
            <div style={{ fontSize:'22px', fontWeight:'700', color: saldo >= 0 ? C.green : C.red }}>{loading ? '—' : `R$ ${fmt(saldo)}`}</div>
            <div style={{ fontSize:'11px', color: saldo >= 0 ? C.green : C.red, marginTop:'2px' }}>{saldo >= 0 ? 'Positivo' : 'Negativo'}</div>
          </div>

        </div>

        {/* Grid inferior */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>

          {/* Contas */}
          <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:'14px', padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span style={{ fontSize:'13px', fontWeight:'500', color: C.text }}>Contas</span>
              <span style={{ fontSize:'11px', color: C.green, cursor:'pointer' }} onClick={() => window.location.href='/configuracoes/contas'}>gerenciar</span>
            </div>
            {contas.length === 0
              ? <p style={{ fontSize:'12px', color: C.muted, textAlign:'center', padding:'16px 0' }}>Nenhuma conta cadastrada</p>
              : contas.slice(0,5).map(c => (
                <div key={c.conta_id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: c.cor||'#64748B' }}/>
                    <span style={{ fontSize:'13px', color: C.sub }}>{c.nome}</span>
                  </div>
                  <span style={{ fontSize:'13px', fontWeight:'500', color: Number(c.saldo_atual)>=0 ? C.text : C.red }}>
                    R$ {fmt(c.saldo_atual)}
                  </span>
                </div>
              ))
            }
          </div>

          {/* Orçamento */}
          <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:'14px', padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span style={{ fontSize:'13px', fontWeight:'500', color: C.text }}>Orçamento — {getMesLabel(getMesStr())}</span>
              <span style={{ fontSize:'11px', color: C.green, cursor:'pointer' }} onClick={() => window.location.href='/orcamento'}>ver tudo</span>
            </div>
            {orcamento.length === 0
              ? <p style={{ fontSize:'12px', color: C.muted, textAlign:'center', padding:'16px 0' }}>Nenhum orçamento definido</p>
              : orcamento.map(o => {
                const pct = Math.min(Number(o.percentual||0), 100)
                const cor = pct >= 100 ? C.red : pct >= 80 ? C.yellow : C.green
                return (
                  <div key={o.categoria_id} style={{ marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'5px' }}>
                      <span style={{ color: C.sub }}>{o.categoria_nome}</span>
                      <span style={{ color: cor, fontWeight:'500' }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'3px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background: cor, borderRadius:'3px', transition:'width 0.5s' }}/>
                    </div>
                  </div>
                )
              })
            }
          </div>

        </div>

        {/* Últimos lançamentos */}
        <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:'14px', padding:'16px', marginTop:'14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
            <span style={{ fontSize:'13px', fontWeight:'500', color: C.text }}>Últimos lançamentos</span>
            <span style={{ fontSize:'11px', color: C.green, cursor:'pointer' }} onClick={() => window.location.href='/lancamentos'}>ver todos</span>
          </div>
          {lancRecentes.length === 0
            ? <p style={{ fontSize:'12px', color: C.muted, textAlign:'center', padding:'20px 0' }}>Nenhum lançamento no período</p>
            : lancRecentes.map(l => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:'7px', height:'7px', borderRadius:'50%', background: l.cp_categorias?.cor||'#64748B', flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', color: C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{l.descricao}</div>
                  <div style={{ fontSize:'11px', color: C.muted }}>{l.cp_categorias?.nome||'—'} · {l.cp_contas?.nome||'—'} · {new Date(l.data+'T12:00:00').toLocaleDateString('pt-BR')}</div>
                </div>
                <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'6px' }}>
                  {l.status === 'a_realizar' && (
                    <span style={{ fontSize:'9px', padding:'2px 7px', background:'rgba(245,158,11,0.15)', color: C.yellow, borderRadius:'20px', border:'1px solid rgba(245,158,11,0.3)' }}>Pendente</span>
                  )}
                  <span style={{ fontSize:'13px', fontWeight:'500', color: l.tipo==='receita' ? C.green : C.text }}>
                    {l.tipo==='receita' ? '+' : '-'}R$ {fmt(l.valor)}
                  </span>
                </div>
              </div>
            ))
          }
        </div>

      </div>
    </AppLayout>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from './AppLayout'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function getMesAtual() {
  const d = new Date()
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
}

function fmt(v) {
  return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
}

const C = {
  bg: '#0F172A', card: '#1E293B', card2: '#162032',
  border: 'rgba(255,255,255,0.07)',
  green: '#22C55E', greenDim: 'rgba(34,197,94,0.12)',
  red: '#EF4444', redDim: 'rgba(239,68,68,0.12)',
  text: '#F1F5F9', muted: '#64748B', sub: '#94A3B8',
}

export default function Dashboard() {
  const supabase = createClient()
  const [user, setUser]                 = useState(null)
  const [contas, setContas]             = useState([])
  const [resumo, setResumo]             = useState(null)
  const [lancRecentes, setLancRecentes] = useState([])
  const [orcamento, setOrcamento]       = useState([])
  const [loading, setLoading]           = useState(true)
  const mes = getMesAtual()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: saldos } = await supabase
        .from('saldos_por_conta').select('*').order('saldo_atual', { ascending: false })
      setContas(saldos || [])

      const { data: res } = await supabase
        .from('resumo_mensal').select('*')
        .eq('user_id', user.id).eq('mes', mes).single()
      setResumo(res)

      const { data: lanc } = await supabase
        .from('lanc').select('*, categorias(nome,cor,icone), contas(nome)')
        .eq('user_id', user.id).eq('mes', mes)
        .order('data', { ascending: false }).limit(6)
      setLancRecentes(lanc || [])

      const { data: orc } = await supabase
        .from('orcamento_vs_realizado').select('*')
        .eq('user_id', user.id).eq('mes', mes)
        .order('percentual', { ascending: false }).limit(5)
      setOrcamento(orc || [])

      setLoading(false)
    }
    load()
  }, [])

  const patrimonio = contas.reduce((s,c) => s + Number(c.saldo_atual||0), 0)
  const receitas   = Number(resumo?.total_receitas||0)
  const despesas   = Number(resumo?.total_despesas||0)
  const resultado  = receitas - despesas
  const pctDesp    = receitas > 0 ? (despesas/receitas*100).toFixed(0) : 0
  const nome       = user?.email?.split('@')[0] || 'você'
  const mesLabel   = `${MESES[new Date().getMonth()]}/${new Date().getFullYear()}`

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px' }

  if (loading) return (
    <AppLayout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color: C.muted, fontSize:'13px' }}>
        Carregando...
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div style={{ padding: '24px', maxWidth: '1100px', fontFamily: "'Inter', sans-serif" }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: C.text, marginBottom: '2px' }}>
            Olá, {nome} 👋
          </h1>
          <p style={{ fontSize: '13px', color: C.muted }}>{mesLabel} · Visão geral das suas finanças</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Patrimônio', value: `R$ ${fmt(patrimonio)}`, sub: `${contas.length} contas`, color: C.text, accent: 'rgba(139,92,246,0.12)', dot: '#8B5CF6' },
            { label: 'Receitas',   value: `R$ ${fmt(receitas)}`,   sub: mesLabel,                  color: C.green,accent: C.greenDim, dot: C.green },
            { label: 'Despesas',   value: `R$ ${fmt(despesas)}`,   sub: `${resumo?.total_lancamentos||0} lançamentos`, color: C.red, accent: C.redDim, dot: C.red },
            { label: 'Resultado',  value: `R$ ${fmt(resultado)}`,  sub: `${pctDesp}% comprometido`, color: resultado >= 0 ? C.green : C.red, accent: resultado >= 0 ? C.greenDim : C.redDim, dot: resultado >= 0 ? C.green : C.red },
          ].map(m => (
            <div key={m.label} style={{ ...card, background: m.accent, borderColor: m.dot + '30', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: m.dot, borderRadius: '14px 0 0 14px' }}/>
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: '6px', paddingLeft: '4px' }}>{m.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: m.color, marginBottom: '2px', paddingLeft: '4px' }}>{m.value}</div>
              <div style={{ fontSize: '11px', color: C.muted, paddingLeft: '4px' }}>{m.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

          {/* Contas */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span style={{ fontSize:'13px', fontWeight:'500', color: C.text }}>Contas</span>
              <span style={{ fontSize:'11px', color: C.green, cursor:'pointer' }}>ver todas</span>
            </div>
            {contas.length === 0 && <p style={{ fontSize:'12px', color: C.muted, textAlign:'center', padding:'16px 0' }}>Nenhuma conta cadastrada</p>}
            {contas.slice(0,4).map(c => (
              <div key={c.conta_id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: c.cor||'#64748B', flexShrink:0 }}/>
                  <span style={{ fontSize:'13px', color: C.sub }}>{c.nome}</span>
                </div>
                <span style={{ fontSize:'13px', fontWeight:'500', color: Number(c.saldo_atual)>=0 ? C.text : C.red }}>
                  R$ {fmt(c.saldo_atual)}
                </span>
              </div>
            ))}
          </div>

          {/* Orçamento */}
          <div style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span style={{ fontSize:'13px', fontWeight:'500', color: C.text }}>Orçamento — {mesLabel}</span>
              <span style={{ fontSize:'11px', color: C.green, cursor:'pointer' }}>ver tudo</span>
            </div>
            {orcamento.length === 0 && <p style={{ fontSize:'12px', color: C.muted, textAlign:'center', padding:'16px 0' }}>Nenhum orçamento definido</p>}
            {orcamento.map(o => {
              const pct = Math.min(Number(o.percentual||0), 100)
              const cor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#22C55E'
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
            })}
          </div>
        </div>

        {/* Lançamentos recentes */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
            <span style={{ fontSize:'13px', fontWeight:'500', color: C.text }}>Últimos lançamentos</span>
            <span style={{ fontSize:'11px', color: C.green, cursor:'pointer' }} onClick={() => window.location.href='/lancamentos'}>ver todos</span>
          </div>
          {lancRecentes.length === 0 && <p style={{ fontSize:'12px', color: C.muted, textAlign:'center', padding:'20px 0' }}>Nenhum lançamento neste mês</p>}
          {lancRecentes.map(l => (
            <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background: l.categorias?.cor||'#64748B', flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', color: C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{l.descricao}</div>
                <div style={{ fontSize:'11px', color: C.muted }}>{l.categorias?.nome||'—'} · {l.contas?.nome||'—'} · {new Date(l.data+'T12:00:00').toLocaleDateString('pt-BR')}</div>
              </div>
              <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'6px' }}>
                {l.status === 'a_realizar' && (
                  <span style={{ fontSize:'9px', padding:'2px 7px', background:'rgba(245,158,11,0.15)', color:'#F59E0B', borderRadius:'20px', border:'1px solid rgba(245,158,11,0.3)' }}>Pendente</span>
                )}
                <span style={{ fontSize:'13px', fontWeight:'500', color: l.tipo==='receita' ? C.green : C.text }}>
                  {l.tipo==='receita' ? '+' : '-'}R$ {fmt(l.valor)}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </AppLayout>
  )
}

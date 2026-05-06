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
        .from('saldos_por_conta')
        .select('*')
        .order('saldo_atual', { ascending: false })
      setContas(saldos || [])

      const { data: res } = await supabase
        .from('resumo_mensal')
        .select('*')
        .eq('user_id', user.id)
        .eq('mes', mes)
        .single()
      setResumo(res)

      const { data: lanc } = await supabase
        .from('lanc')
        .select('*, categorias(nome,cor,icone), contas(nome)')
        .eq('user_id', user.id)
        .eq('mes', mes)
        .order('data', { ascending: false })
        .limit(6)
      setLancRecentes(lanc || [])

      const { data: orc } = await supabase
        .from('orcamento_vs_realizado')
        .select('*')
        .eq('user_id', user.id)
        .eq('mes', mes)
        .order('percentual', { ascending: false })
        .limit(5)
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

  if (loading) return (
    <AppLayout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#888', fontSize:'13px' }}>
        Carregando...
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div style={{ padding: '24px', maxWidth: '1100px' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A18', marginBottom: '2px' }}>
            Olá, {nome} 👋
          </h1>
          <p style={{ fontSize: '13px', color: '#888' }}>{mesLabel} · Visão geral das suas finanças</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Patrimônio',  value: `R$ ${fmt(patrimonio)}`, sub: `${contas.length} contas`,                          color: '#1A1A18' },
            { label: 'Receitas',    value: `R$ ${fmt(receitas)}`,   sub: mesLabel,                                            color: '#0F6E56' },
            { label: 'Despesas',    value: `R$ ${fmt(despesas)}`,   sub: `${resumo?.total_lancamentos||0} lançamentos`,       color: '#A32D2D' },
            { label: 'Resultado',   value: `R$ ${fmt(resultado)}`,  sub: `${pctDesp}% comprometido`,                          color: resultado >= 0 ? '#0F6E56' : '#A32D2D' },
          ].map(m => (
            <div key={m.label} style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'14px 16px' }}>
              <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px' }}>{m.label}</div>
              <div style={{ fontSize:'18px', fontWeight:'600', color:m.color, marginBottom:'2px' }}>{m.value}</div>
              <div style={{ fontSize:'11px', color:'#AAA' }}>{m.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>

          <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <span style={{ fontSize:'12px', fontWeight:'500', color:'#666' }}>Contas</span>
              <span style={{ fontSize:'11px', color:'#1D9E75', cursor:'pointer' }}>ver todas</span>
            </div>
            {contas.length === 0 && <p style={{ fontSize:'12px', color:'#AAA', textAlign:'center', padding:'16px 0' }}>Nenhuma conta cadastrada</p>}
            {contas.slice(0,4).map(c => (
              <div key={c.conta_id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #F0F0EE' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c.cor||'#888', flexShrink:0 }}></div>
                  <span style={{ fontSize:'12px', color:'#333' }}>{c.nome}</span>
                </div>
                <span style={{ fontSize:'13px', fontWeight:'500', color: Number(c.saldo_atual)>=0 ? '#1A1A18' : '#A32D2D' }}>
                  R$ {fmt(c.saldo_atual)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <span style={{ fontSize:'12px', fontWeight:'500', color:'#666' }}>Orçamento — {mesLabel}</span>
              <span style={{ fontSize:'11px', color:'#1D9E75', cursor:'pointer' }}>ver tudo</span>
            </div>
            {orcamento.length === 0 && <p style={{ fontSize:'12px', color:'#AAA', textAlign:'center', padding:'16px 0' }}>Nenhum orçamento definido</p>}
            {orcamento.map(o => {
              const pct = Math.min(Number(o.percentual||0), 100)
              const cor = pct >= 100 ? '#E24B4A' : pct >= 80 ? '#EF9F27' : '#1D9E75'
              return (
                <div key={o.categoria_id} style={{ marginBottom:'10px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'3px' }}>
                    <span style={{ color:'#555' }}>{o.categoria_nome}</span>
                    <span style={{ color:cor, fontWeight:'500' }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height:'4px', background:'#F0F0EE', borderRadius:'2px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:'2px', transition:'width 0.5s' }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background:'#FFF', border:'1px solid #E8E8E5', borderRadius:'12px', padding:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <span style={{ fontSize:'12px', fontWeight:'500', color:'#666' }}>Últimos lançamentos</span>
            <span style={{ fontSize:'11px', color:'#1D9E75', cursor:'pointer' }} onClick={() => window.location.href='/lancamentos'}>ver todos</span>
          </div>
          {lancRecentes.length === 0 && <p style={{ fontSize:'12px', color:'#AAA', textAlign:'center', padding:'20px 0' }}>Nenhum lançamento neste mês</p>}
          {lancRecentes.map(l => (
            <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:'1px solid #F0F0EE' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:l.categorias?.cor||'#888', flexShrink:0 }}></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'12px', color:'#333', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{l.descricao}</div>
                <div style={{ fontSize:'10px', color:'#AAA' }}>{l.categorias?.nome||'—'} · {l.contas?.nome||'—'} · {new Date(l.data+'T12:00:00').toLocaleDateString('pt-BR')}</div>
              </div>
              <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:'6px' }}>
                {l.status === 'a_realizar' && <span style={{ fontSize:'9px', padding:'2px 6px', background:'#FAEEDA', color:'#633806', borderRadius:'20px' }}>Pendente</span>}
                <span style={{ fontSize:'13px', fontWeight:'500', color: l.tipo==='receita' ? '#0F6E56' : '#1A1A18' }}>
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

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '../../dashboard/AppLayout'

function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2}) }

const BANCOS = ['Nubank','C6 Bank','Itaú','Bradesco','Santander','Banco do Brasil','Inter','Caixa','BTG','XP','Onil','Outro']
const CORES  = ['#22C55E','#378ADD','#EF9F27','#7F77DD','#D85A30','#D4537E','#888780','#185FA5','#639922','#BA7517']

export default function ConfigContas() {
  const supabase = createClient()
  const [contas, setContas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ nome:'', tipo:'corrente', banco:'', saldo_inicial:'0', cor:'#22C55E', incluir_patrimonio:true })

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('cp_contas').select('*').eq('user_id', user.id).order('ordem')
    setContas(data||[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function salvar(e) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('cp_contas').insert({
      ...form, user_id: user.id,
      saldo_inicial: parseFloat(form.saldo_inicial.replace(',','.') || '0'),
      ordem: contas.length,
    })
    setModal(false)
    setForm({ nome:'', tipo:'corrente', banco:'', saldo_inicial:'0', cor:'#22C55E', incluir_patrimonio:true })
    setSaving(false)
    load()
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from('cp_contas').update({ ativo:!ativo }).eq('id', id)
    load()
  }

  async function excluir(id) {
    if (!confirm('Excluir esta conta?')) return
    await supabase.from('cp_contas').delete().eq('id', id)
    load()
  }

  const tipoLabel = { corrente:'Corrente', poupanca:'Poupança', investimento:'Investimento', carteira:'Carteira', cripto:'Cripto' }

  return (
    <AppLayout>
      <div style={{ padding:'24px', maxWidth:'700px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <div>
            <h1 style={{ fontSize:'20px', fontWeight:'600', color:'#F1F5F9' }}>Contas bancárias</h1>
            <p style={{ fontSize:'13px', color:'#64748B' }}>{contas.length} contas cadastradas</p>
          </div>
          <button onClick={()=>setModal(true)} style={{ padding:'8px 16px', background:'#22C55E', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>
            + Adicionar conta
          </button>
        </div>

        <div style={{ background:'#1E293B', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'16px' }}>
          {loading ? <p style={{ color:'#475569', fontSize:'12px' }}>Carregando...</p> :
            contas.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#475569' }}>
                <div style={{ fontSize:'28px', marginBottom:'8px' }}>🏦</div>
                <p style={{ fontSize:'13px' }}>Nenhuma conta cadastrada</p>
              </div>
            ) :
            contas.map((c,i) => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 0', borderBottom: i<contas.length-1?'1px solid #F0F0EE':'none', opacity:c.ativo?1:0.5 }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:c.cor||'#888', display:'flex', alignItems:'center', justifyContent:'center', color:'#FFF', fontSize:'12px', fontWeight:'600', flexShrink:0 }}>
                  {c.nome?.substring(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:'500', color:'#F1F5F9' }}>{c.nome}</div>
                  <div style={{ fontSize:'11px', color:'#475569' }}>{tipoLabel[c.tipo]||c.tipo} · Saldo inicial: R$ {fmt(c.saldo_inicial)}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'13px', fontWeight:'500', color:'#F1F5F9' }}>{c.banco||'—'}</div>
                  {c.incluir_patrimonio && <div style={{ fontSize:'10px', color:'#22C55E' }}>No patrimônio</div>}
                </div>
                <button onClick={()=>toggleAtivo(c.id,c.ativo)} style={{ padding:'4px 10px', fontSize:'10px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'6px', cursor:'pointer', background:'#1E293B', color:'#94A3B8' }}>
                  {c.ativo?'Desativar':'Ativar'}
                </button>
                <button onClick={()=>excluir(c.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#CCC', fontSize:'14px' }}>✕</button>
              </div>
            ))
          }
        </div>
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1E293B', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'400px', margin:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:'600' }}>Nova conta</h2>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#64748B' }}>×</button>
            </div>
            <form onSubmit={salvar}>
              {[
                { label:'Nome da conta', key:'nome', type:'text', placeholder:'Ex: Nubank Principal', required:true },
                { label:'Saldo inicial (R$)', key:'saldo_inicial', type:'text', placeholder:'0,00' },
              ].map(f=>(
                <div key={f.key} style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.placeholder} required={f.required}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', outline:'none', background:'#1E293B', color:'#F1F5F9' }} />
                </div>
              ))}
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', background:'#1E293B', color:'#F1F5F9' }}>
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupança</option>
                  <option value="investimento">Investimento</option>
                  <option value="carteira">Carteira</option>
                  <option value="cripto">Cripto</option>
                </select>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>Banco</label>
                <select value={form.banco} onChange={e=>setForm({...form,banco:e.target.value})}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', fontSize:'13px', background:'#1E293B', color:'#F1F5F9' }}>
                  <option value="">Selecionar</option>
                  {BANCOS.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', fontSize:'11px', color:'#64748B', marginBottom:'6px' }}>Cor</label>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {CORES.map(c=>(
                    <div key={c} onClick={()=>setForm({...form,cor:c})} style={{ width:'24px', height:'24px', borderRadius:'50%', background:c, cursor:'pointer', border: form.cor===c?'3px solid #1A1A18':'2px solid transparent' }}></div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" id="patrimonio" checked={form.incluir_patrimonio} onChange={e=>setForm({...form,incluir_patrimonio:e.target.checked})} />
                <label htmlFor="patrimonio" style={{ fontSize:'12px', color:'#94A3B8' }}>Incluir no patrimônio total</label>
              </div>
              <button type="submit" disabled={saving} style={{ width:'100%', padding:'11px', background:'#22C55E', color:'#FFF', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
                {saving?'Salvando...':'Adicionar conta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

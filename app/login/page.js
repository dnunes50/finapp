'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function Logo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="url(#loginlg)"/>
      <defs>
        <linearGradient id="loginlg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E"/>
          <stop offset="1" stopColor="#16A34A"/>
        </linearGradient>
      </defs>
      <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle"
        fill="white" fontWeight="700" fontSize="16" fontFamily="Inter,sans-serif">C+</text>
    </svg>
  )
}

export default function LoginPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [tab, setTab]         = useState('login')
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [nome, setNome]       = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [sucesso, setSucesso] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('Email ou senha incorretos.')
    else { router.push('/dashboard'); router.refresh() }
    setLoading(false)
  }

  async function handleCadastro(e) {
    e.preventDefault()
    setLoading(true); setErro(''); setSucesso('')
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) { setErro(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('cp_users').insert({ id: data.user.id, email: data.user.email, nome })
    }
    setSucesso('Conta criada! Verifique seu email para confirmar.')
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#F1F5F9', fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none', transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0D1526 0%, #0F172A 50%, #0D1526 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: '20px',
    }}>

      <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeUp 0.5s ease forwards' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Logo size={40} />
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#F1F5F9' }}>
              Controle<span style={{ color: '#22C55E' }}>+</span>
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '13px' }}>Mais controle hoje, mais liberdade amanhã.</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '28px',
          backdropFilter: 'blur(20px)',
        }}>

          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'rgba(0,0,0,0.25)',
            borderRadius: '10px', padding: '4px', marginBottom: '24px',
          }}>
            {['login', 'cadastro'].map(t => (
              <button key={t} onClick={() => { setTab(t); setErro(''); setSucesso('') }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                  cursor: 'pointer', fontSize: '13px', fontFamily: "'Inter', sans-serif",
                  fontWeight: tab === t ? '600' : '400',
                  background: tab === t ? '#22C55E' : 'transparent',
                  color: tab === t ? '#0F172A' : '#64748B',
                  transition: 'all 0.2s',
                }}>
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={tab === 'login' ? handleLogin : handleCadastro}>

            {tab === 'cadastro' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Nome completo</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome" required style={inp}
                  onFocus={e => e.target.style.borderColor = '#22C55E'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="voce@email.com" required style={inp}
                onFocus={e => e.target.style.borderColor = '#22C55E'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748B', marginBottom: '5px' }}>Senha</label>
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••" required minLength={6} style={inp}
                onFocus={e => e.target.style.borderColor = '#22C55E'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            {erro && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#F87171' }}>
                {erro}
              </div>
            )}

            {sucesso && (
              <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#4ADE80' }}>
                {sucesso}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: loading ? 'rgba(34,197,94,0.4)' : '#22C55E',
              border: 'none', borderRadius: '10px',
              color: '#0F172A', fontSize: '14px', fontWeight: '600',
              fontFamily: "'Inter', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              animation: loading ? 'pulse 1.5s infinite' : 'none',
            }}>
              {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : 'Criar conta grátis'}
            </button>

          </form>

          {tab === 'login' && (
            <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '12px', color: '#64748B', cursor: 'pointer' }}>
              Esqueceu a senha?
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#334155' }}>
          7 dias grátis · Sem cartão de crédito
        </p>
      </div>
    </div>
  )
}

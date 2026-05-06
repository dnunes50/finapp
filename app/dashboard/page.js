'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [tab, setTab]         = useState('login') // 'login' | 'cadastro'
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [nome, setNome]       = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [sucesso, setSucesso] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('Email ou senha incorretos.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleCadastro(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setSucesso('')

    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    // Criar registro na tabela users
    if (data.user) {
      await supabase.from('users').insert({
        id:    data.user.id,
        email: data.user.email,
        nome:  nome,
      })
    }

    setSucesso('Conta criada! Verifique seu email para confirmar.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A1628 0%, #0F2240 50%, #0A1628 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      padding: '20px',
    }}>

      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { outline: none; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #0F2240 inset !important;
          -webkit-text-fill-color: #E8F0FE !important;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '420px',
        animation: 'fadeUp 0.5s ease forwards',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, #1D9E75, #0F6E56)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>💰</div>
            <span style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '26px',
              color: '#E8F0FE',
              letterSpacing: '-0.5px',
            }}>FinApp</span>
          </div>
          <p style={{ color: '#6B8BB5', fontSize: '13px' }}>
            Controle financeiro inteligente
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '32px',
          backdropFilter: 'blur(20px)',
        }}>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '28px',
          }}>
            {['login', 'cadastro'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setErro(''); setSucesso('') }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: tab === t ? '600' : '400',
                  background: tab === t ? '#1D9E75' : 'transparent',
                  color: tab === t ? 'white' : '#6B8BB5',
                  transition: 'all 0.2s',
                }}
              >
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={tab === 'login' ? handleLogin : handleCadastro}>

            {tab === 'cadastro' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#6B8BB5', marginBottom: '6px' }}>
                  Nome completo
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Diego Nunes"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    color: '#E8F0FE',
                    fontSize: '14px',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1D9E75'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#6B8BB5', marginBottom: '6px' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="diego@email.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#E8F0FE',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#1D9E75'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#6B8BB5', marginBottom: '6px' }}>
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#E8F0FE',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#1D9E75'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            {/* Erro */}
            {erro && (
              <div style={{
                background: 'rgba(226,75,74,0.15)',
                border: '1px solid rgba(226,75,74,0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#F87171',
              }}>
                {erro}
              </div>
            )}

            {/* Sucesso */}
            {sucesso && (
              <div style={{
                background: 'rgba(29,158,117,0.15)',
                border: '1px solid rgba(29,158,117,0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#34D399',
              }}>
                {sucesso}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading
                  ? 'rgba(29,158,117,0.5)'
                  : 'linear-gradient(135deg, #1D9E75, #0F6E56)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'DM Sans', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                animation: loading ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              {loading
                ? 'Aguarde...'
                : tab === 'login' ? 'Entrar' : 'Criar conta grátis'}
            </button>

          </form>

          {tab === 'login' && (
            <p style={{
              textAlign: 'center',
              marginTop: '16px',
              fontSize: '12px',
              color: '#6B8BB5',
              cursor: 'pointer',
            }}>
              Esqueceu a senha?
            </p>
          )}

        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '11px',
          color: '#3D5A7A',
        }}>
          7 dias grátis · Sem cartão de crédito
        </p>

      </div>
    </div>
  )
}

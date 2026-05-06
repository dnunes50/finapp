'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard',     icon: '⬜', label: 'Dashboard' },
  { href: '/lancamentos',   icon: '📋', label: 'Lançamentos' },
  { href: '/relatorios',    icon: '📊', label: 'Relatórios' },
  { href: '/metas',         icon: '🎯', label: 'Metas' },
  { href: '/orcamento',     icon: '📅', label: 'Orçamento' },
  { href: '/patrimonio',    icon: '📈', label: 'Patrimônio' },
  { href: '/recorrentes',   icon: '🔄', label: 'Recorrentes' },
]

const NAV_CONFIG = [
  { href: '/configuracoes/contas',      icon: '🏦', label: 'Contas' },
  { href: '/configuracoes/cartoes',     icon: '💳', label: 'Cartões' },
  { href: '/configuracoes/categorias',  icon: '🏷️', label: 'Categorias' },
  { href: '/configuracoes/whatsapp',    icon: '💬', label: 'WhatsApp' },
]

export default function AppLayout({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F5F3', fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Sidebar */}
      <div style={{
        width: collapsed ? '56px' : '200px',
        background: '#FFFFFF',
        borderRight: '1px solid #E8E8E5',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>

        {/* Logo */}
        <div style={{ padding: '16px 14px', borderBottom: '1px solid #E8E8E5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>💰</div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A18' }}>FinApp</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#888', padding: '2px' }}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: '8px 6px', overflowY: 'auto' }}>
          {!collapsed && <div style={{ fontSize: '9px', color: '#AAAAAA', padding: '6px 8px 3px', textTransform: 'uppercase', letterSpacing: '.08em' }}>Principal</div>}
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <div key={item.href} onClick={() => router.push(item.href)}
                title={collapsed ? item.label : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: collapsed ? '8px' : '7px 9px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '8px', cursor: 'pointer', marginBottom: '1px',
                  background: active ? '#E1F5EE' : 'transparent',
                  color: active ? '#0F6E56' : '#666',
                  fontSize: '12px', fontWeight: active ? '500' : '400',
                  transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: '13px', flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && item.label}
              </div>
            )
          })}

          {!collapsed && <div style={{ fontSize: '9px', color: '#AAAAAA', padding: '10px 8px 3px', textTransform: 'uppercase', letterSpacing: '.08em' }}>Configurações</div>}
          {NAV_CONFIG.map(item => (
            <div key={item.href} onClick={() => router.push(item.href)}
              title={collapsed ? item.label : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: collapsed ? '8px' : '7px 9px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '8px', cursor: 'pointer', marginBottom: '1px',
                background: pathname === item.href ? '#E1F5EE' : 'transparent',
                color: pathname === item.href ? '#0F6E56' : '#888',
                fontSize: '12px', transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: '12px', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && item.label}
            </div>
          ))}
        </div>

        {/* Logout */}
        <div style={{ padding: '10px 6px', borderTop: '1px solid #E8E8E5' }}>
          <div onClick={logout}
            title={collapsed ? 'Sair' : ''}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: collapsed ? '8px' : '7px 9px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '8px', cursor: 'pointer',
              color: '#E24B4A', fontSize: '12px', transition: 'all 0.15s',
            }}>
            <span>🚪</span>
            {!collapsed && 'Sair'}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

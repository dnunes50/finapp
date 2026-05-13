'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// SVG Icons
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  lancamentos: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  relatorios: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  metas: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  orcamento: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  patrimonio: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  recorrentes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  ),
  contas: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  cartoes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      <circle cx="7" cy="15" r="1" fill="currentColor"/>
    </svg>
  ),
  categorias: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  whatsapp: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  fluxo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  menu: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
}

const NAV = [
  { href: '/dashboard',   icon: Icons.dashboard,   label: 'Dashboard' },
  { href: '/lancamentos', icon: Icons.lancamentos,  label: 'Lançamentos' },
  { href: '/relatorios',  icon: Icons.relatorios,   label: 'Relatórios' },
  { href: '/metas',       icon: Icons.metas,        label: 'Metas' },
  { href: '/orcamento',   icon: Icons.orcamento,    label: 'Orçamento' },
  { href: '/patrimonio',  icon: Icons.patrimonio,   label: 'Patrimônio' },
  { href: '/fluxo',       icon: Icons.fluxo,        label: 'Fluxo' },
]

const NAV_CONFIG = [
  { href: '/configuracoes/contas',     icon: Icons.contas,     label: 'Contas' },
  { href: '/configuracoes/cartoes',    icon: Icons.cartoes,    label: 'Cartões' },
  { href: '/configuracoes/categorias', icon: Icons.categorias, label: 'Categorias' },
  { href: '/configuracoes/whatsapp',   icon: Icons.whatsapp,   label: 'WhatsApp' },
]

// Logo SVG Controle+
function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="url(#lg)"/>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E"/>
          <stop offset="1" stopColor="#16A34A"/>
        </linearGradient>
      </defs>
      <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle"
        fill="white" fontWeight="700" fontSize="16" fontFamily="Inter,sans-serif">C+</text>
    </svg>
  )
}

export default function AppLayout({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sideW = collapsed ? '60px' : '210px'

  const navItem = (item) => {
    const active = pathname === item.href
    return (
      <div
        key={item.href}
        onClick={() => router.push(item.href)}
        title={collapsed ? item.label : ''}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: collapsed ? '9px 0' : '9px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: '10px', cursor: 'pointer', marginBottom: '2px',
          background: active ? 'rgba(34,197,94,0.12)' : 'transparent',
          color: active ? '#22C55E' : '#64748B',
          fontSize: '13px', fontWeight: active ? '500' : '400',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F1F5F9' }}
        onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(34,197,94,0.12)' : 'transparent'; e.currentTarget.style.color = active ? '#22C55E' : '#64748B' }}
      >
        <span style={{ flexShrink: 0 }}>{item.icon}</span>
        {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F172A', fontFamily: "'Inter', sans-serif" }}>

      {/* Sidebar */}
      <div style={{
        width: sideW,
        background: '#0D1526',
        borderRight: '1px solid rgba(255,255,255,0.07)',
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
        <div style={{
          padding: '16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: '8px',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <Logo size={28} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#F1F5F9', lineHeight: 1 }}>Controle<span style={{ color: '#22C55E' }}>+</span></div>
              </div>
            </div>
          )}
          {collapsed && <Logo size={28} />}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', borderRadius: '6px', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          {collapsed && (
            <button onClick={() => setCollapsed(false)} style={{ position: 'absolute', bottom: '60px', left: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'none' }}></button>
          )}
        </div>

        {/* Toggle quando collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748B',
            padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            {Icons.menu}
          </button>
        )}

        {/* Nav */}
        <div style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {!collapsed && (
            <div style={{ fontSize: '9px', color: '#334155', padding: '4px 12px 6px', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: '600' }}>Principal</div>
          )}
          {NAV.map(navItem)}

          {!collapsed && (
            <div style={{ fontSize: '9px', color: '#334155', padding: '12px 12px 6px', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: '600' }}>Configurações</div>
          )}
          {collapsed && <div style={{ height: '12px' }} />}
          {NAV_CONFIG.map(navItem)}
        </div>

        {/* Logout */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div
            onClick={logout}
            title={collapsed ? 'Sair' : ''}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: collapsed ? '9px 0' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '10px', cursor: 'pointer',
              color: '#EF4444', fontSize: '13px', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {Icons.logout}
            {!collapsed && 'Sair'}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'auto', background: '#0F172A' }}>
        {children}
      </div>
    </div>
  )
}

'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const supabase = createClient()
  const router   = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F5F3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Login funcionando!</h1>
        <p style={{ color: '#888', marginBottom: '24px' }}>Dashboard em construção...</p>
        <button
          onClick={logout}
          style={{
            padding: '10px 20px',
            background: '#1D9E75',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Sair
        </button>
      </div>
    </div>
  )
}

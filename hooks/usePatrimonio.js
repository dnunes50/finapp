import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'

export function usePatrimonio() {
  const [ativos, setAtivos] = useState([])
  const [passivos, setPassivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = getSupabase()

    const [{ data: a, error: ea }, { data: p, error: ep }] = await Promise.all([
      supabase.from('ativos').select('*').order('nome'),
      supabase.from('passivos').select('*').order('nome'),
    ])

    if (ea || ep) setError((ea || ep).message)
    else {
      setAtivos(a)
      setPassivos(p)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function adicionarAtivo(ativo) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('ativos').insert(ativo).select().single()
    if (error) throw error
    setAtivos((prev) => [...prev, data])
    return data
  }

  async function adicionarPassivo(passivo) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('passivos').insert(passivo).select().single()
    if (error) throw error
    setPassivos((prev) => [...prev, data])
    return data
  }

  async function removerAtivo(id) {
    const supabase = getSupabase()
    const { error } = await supabase.from('ativos').delete().eq('id', id)
    if (error) throw error
    setAtivos((prev) => prev.filter((a) => a.id !== id))
  }

  async function removerPassivo(id) {
    const supabase = getSupabase()
    const { error } = await supabase.from('passivos').delete().eq('id', id)
    if (error) throw error
    setPassivos((prev) => prev.filter((p) => p.id !== id))
  }

  const totalAtivos = ativos.reduce((s, a) => s + Number(a.valor), 0)
  const totalPassivos = passivos.reduce((s, p) => s + Number(p.valor), 0)
  const patrimonioLiquido = totalAtivos - totalPassivos

  return {
    ativos, passivos,
    totalAtivos, totalPassivos, patrimonioLiquido,
    loading, error,
    adicionarAtivo, adicionarPassivo,
    removerAtivo, removerPassivo,
    refresh: fetch,
  }
}

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'

export function useLanc({ mes, ano } = {}) {
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = getSupabase()

    let query = supabase
      .from('lancamentos')
      .select('*')
      .order('data', { ascending: false })

    if (mes && ano) {
      const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
      const fim = new Date(ano, mes, 0).toISOString().split('T')[0]
      query = query.gte('data', inicio).lte('data', fim)
    }

    const { data, error } = await query
    if (error) setError(error.message)
    else setLancamentos(data)
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { fetch() }, [fetch])

  async function adicionar(lanc) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('lancamentos').insert(lanc).select().single()
    if (error) throw error
    setLancamentos((prev) => [data, ...prev])
    return data
  }

  async function remover(id) {
    const supabase = getSupabase()
    const { error } = await supabase.from('lancamentos').delete().eq('id', id)
    if (error) throw error
    setLancamentos((prev) => prev.filter((l) => l.id !== id))
  }

  async function atualizar(id, changes) {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('lancamentos')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setLancamentos((prev) => prev.map((l) => (l.id === id ? data : l)))
    return data
  }

  const receitas = lancamentos.filter((l) => l.tipo === 'receita')
  const despesas = lancamentos.filter((l) => l.tipo === 'despesa')
  const totalReceitas = receitas.reduce((s, l) => s + Number(l.valor), 0)
  const totalDespesas = despesas.reduce((s, l) => s + Number(l.valor), 0)
  const saldo = totalReceitas - totalDespesas

  return {
    lancamentos, receitas, despesas,
    totalReceitas, totalDespesas, saldo,
    loading, error,
    adicionar, remover, atualizar, refresh: fetch,
  }
}

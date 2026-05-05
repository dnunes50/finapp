import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'

export function useOrcamento({ mes, ano } = {}) {
  const [orcamentos, setOrcamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = getSupabase()

    let query = supabase.from('orcamentos').select(`
      *,
      categoria:categorias(id, nome, cor, icone)
    `).order('categoria_id')

    if (mes && ano) {
      query = query.eq('mes', mes).eq('ano', ano)
    }

    const { data, error } = await query
    if (error) setError(error.message)
    else setOrcamentos(data)
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { fetch() }, [fetch])

  async function definir(categoriaId, valor) {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('orcamentos')
      .upsert({ categoria_id: categoriaId, mes, ano, valor }, { onConflict: 'categoria_id,mes,ano' })
      .select(`*, categoria:categorias(id, nome, cor, icone)`)
      .single()
    if (error) throw error
    setOrcamentos((prev) => {
      const idx = prev.findIndex((o) => o.categoria_id === categoriaId)
      return idx >= 0 ? prev.map((o, i) => (i === idx ? data : o)) : [...prev, data]
    })
    return data
  }

  async function remover(id) {
    const supabase = getSupabase()
    const { error } = await supabase.from('orcamentos').delete().eq('id', id)
    if (error) throw error
    setOrcamentos((prev) => prev.filter((o) => o.id !== id))
  }

  const totalOrcado = orcamentos.reduce((s, o) => s + Number(o.valor), 0)

  return {
    orcamentos, totalOrcado,
    loading, error,
    definir, remover, refresh: fetch,
  }
}

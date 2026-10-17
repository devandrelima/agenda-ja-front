import { useEffect, useState } from 'react'
import { requisitar } from './api'

export type DadosNegocio = {
  nome: string
  categoria: string
  localizacao: string
}

export const categoriasNegocio = [
  'Salão de beleza',
  'Clínica de estética',
  'Barbearia',
  'Outro',
] as const

const chave = 'agendaja-demo-dados-negocio-v1'
const eventoAtualizacao = 'agendaja:dados-negocio-atualizados'

type DadosSalvos = {
  estabelecimentoAtivo: number
  porEstabelecimento: Record<string, DadosNegocio>
}

function dadosValidos(dados: unknown): dados is DadosNegocio {
  if (!dados || typeof dados !== 'object') return false
  const valor = dados as Partial<DadosNegocio>
  return (
    typeof valor.nome === 'string' &&
    typeof valor.categoria === 'string' &&
    typeof valor.localizacao === 'string'
  )
}

function lerDadosSalvos(): DadosSalvos | null {
  try {
    const salvo: unknown = JSON.parse(localStorage.getItem(chave) ?? 'null')
    if (!salvo || typeof salvo !== 'object') return null
    const { estabelecimentoAtivo, porEstabelecimento } = salvo as Partial<DadosSalvos>
    if (
      typeof estabelecimentoAtivo !== 'number' ||
      !Number.isInteger(estabelecimentoAtivo) ||
      !porEstabelecimento ||
      typeof porEstabelecimento !== 'object' ||
      Array.isArray(porEstabelecimento)
    ) {
      return null
    }
    return { estabelecimentoAtivo, porEstabelecimento }
  } catch {
    return null
  }
}

export function lerDadosNegocioLocais(estabelecimentoId: number): DadosNegocio | null {
  const salvo = lerDadosSalvos()
  const dados = salvo?.porEstabelecimento[estabelecimentoId]
  return dadosValidos(dados) ? dados : null
}

export function salvarDadosNegocioLocais(estabelecimentoId: number, dados: DadosNegocio) {
  const anteriores = lerDadosSalvos()?.porEstabelecimento ?? {}
  localStorage.setItem(
    chave,
    JSON.stringify({
      estabelecimentoAtivo: estabelecimentoId,
      porEstabelecimento: { ...anteriores, [estabelecimentoId]: dados },
    }),
  )
  window.dispatchEvent(new Event(eventoAtualizacao))
}

export async function buscarDadosNegocio(estabelecimentoId: number): Promise<DadosNegocio> {
  const resposta = await requisitar(`/api/admin/estabelecimentos/${estabelecimentoId}`)
  const dados: DadosNegocio = await resposta.json()
  return dados
}

export function useDadosNegocioDemo() {
  const [dados, definirDados] = useState(() => {
    const ativo = lerDadosSalvos()?.estabelecimentoAtivo
    return ativo == null ? null : lerDadosNegocioLocais(ativo)
  })

  useEffect(() => {
    const atualizar = () => {
      const ativo = lerDadosSalvos()?.estabelecimentoAtivo
      definirDados(ativo == null ? null : lerDadosNegocioLocais(ativo))
    }
    const atualizarOutraAba = (evento: StorageEvent) => {
      if (evento.key === chave) atualizar()
    }
    window.addEventListener(eventoAtualizacao, atualizar)
    window.addEventListener('storage', atualizarOutraAba)
    return () => {
      window.removeEventListener(eventoAtualizacao, atualizar)
      window.removeEventListener('storage', atualizarOutraAba)
    }
  }, [])

  return dados
}

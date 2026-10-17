import { requisitar } from './api'

export type EstabelecimentoPublico = {
  id: number
  nome: string
  categoria: string
  localizacao: string
  imagemUrl: string | null
}

export async function buscarEstabelecimentoPublico(id: string): Promise<EstabelecimentoPublico> {
  const resposta = await requisitar(`/api/estabelecimentos/${encodeURIComponent(id)}`)
  return resposta.json()
}

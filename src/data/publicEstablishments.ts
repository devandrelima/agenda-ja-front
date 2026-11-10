import { requisitar } from './api'

export type EstabelecimentoResumoPublico = {
  id: number
  publicId: string
  nome: string
  categoria: string
  localizacao: string
  imagemUrl: string | null
  logoUrl: string | null
  mediaAvaliacoes: number
  quantidadeAvaliacoes: number
}

export async function listarEstabelecimentosPublicos(): Promise<EstabelecimentoResumoPublico[]> {
  const resposta = await requisitar('/api/estabelecimentos/publico')
  return resposta.json()
}

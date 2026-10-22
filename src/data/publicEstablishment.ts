import { requisitar } from './api'

export type EstabelecimentoPublico = {
  id: number
  publicId: string
  nome: string
  categoria: string
  localizacao: string
  imagemUrl: string | null
}

export const identificadorPublicoValido = (valor: string) =>
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(valor)

export async function buscarEstabelecimentoPublico(
  publicId: string,
): Promise<EstabelecimentoPublico> {
  const resposta = await requisitar(`/api/estabelecimentos/publico/${encodeURIComponent(publicId)}`)
  return resposta.json()
}

export async function buscarIdentificadorPublico(estabelecimentoId: number): Promise<string> {
  const resposta = await requisitar(`/api/admin/estabelecimentos/${estabelecimentoId}`)
  const dados: { publicId?: unknown } = await resposta.json()
  if (typeof dados.publicId !== 'string' || !identificadorPublicoValido(dados.publicId)) {
    throw new Error('O estabelecimento ainda não possui link público.')
  }
  return dados.publicId
}

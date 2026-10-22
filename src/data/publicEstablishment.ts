import { requisitar, tokenCsrf } from './api'
import type { Servico } from './services'
import type { HorarioDia } from './businessHours'

export type EstabelecimentoPublico = {
  id: number
  publicId: string
  nome: string
  categoria: string
  localizacao: string
  imagemUrl: string | null
  horariosFuncionamento: HorarioDia[]
}

export const eventoConfiguracaoAtualizada = 'agendaja:configuracao-atualizada'

export function avisarConfiguracaoAtualizada() {
  localStorage.setItem(eventoConfiguracaoAtualizada, String(Date.now()))
  window.dispatchEvent(new Event(eventoConfiguracaoAtualizada))
}

export async function buscarEstabelecimentoAdmin(id: number): Promise<EstabelecimentoPublico> {
  const resposta = await requisitar(`/api/admin/estabelecimentos/${id}`)
  return resposta.json()
}

export async function salvarConfiguracao(id: number, tipo: 'dados' | 'capa' | 'horarios', dados: unknown) {
  await requisitar(`/api/admin/estabelecimentos/${id}/${tipo}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': await tokenCsrf() },
    body: JSON.stringify(dados),
  })
  avisarConfiguracaoAtualizada()
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

export async function listarServicosPublicos(estabelecimentoId: number): Promise<Servico[]> {
  const resposta = await requisitar(`/api/estabelecimentos/${estabelecimentoId}/servicos`)
  return resposta.json()
}

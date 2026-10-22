import { requisitar } from './api'

/**
 * Horários livres (HH:mm) de um serviço numa data. Sem `profissionalId`, o backend devolve a união
 * das agendas de todos os profissionais aptos. Endpoint público.
 */
export async function listarHorariosDisponiveis(
  estabelecimentoId: string,
  servicoId: string,
  data: string,
  profissionalId?: string,
): Promise<string[]> {
  const parametros = new URLSearchParams({ data })
  if (profissionalId) parametros.set('profissionalId', profissionalId)
  const resposta = await requisitar(
    `/api/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/servicos/${encodeURIComponent(servicoId)}/disponibilidade?${parametros}`,
  )
  return resposta.json()
}

import { requisitar } from './api'
import type { Profissional } from '../domain/models'

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

/** Confirma no backend quem ainda atende o horário escolhido, preservando a ordem da lista. */
export async function encontrarProfissionalDisponivel(
  estabelecimentoId: string,
  servicoId: string,
  profissionais: Profissional[],
  data: string,
  horario: string,
): Promise<Profissional | null> {
  const consultas = await Promise.allSettled(
    profissionais.map((profissional) =>
      listarHorariosDisponiveis(estabelecimentoId, servicoId, data, profissional.id),
    ),
  )
  const indice = consultas.findIndex(
    (consulta) => consulta.status === 'fulfilled' && consulta.value.includes(horario),
  )
  if (indice >= 0) return profissionais[indice]
  if (consultas.some((consulta) => consulta.status === 'rejected'))
    throw new Error('Não foi possível confirmar o profissional disponível. Tente novamente.')
  return null
}

import { requisitar } from './api'

export type AgendamentoDaAgenda = {
  id: number
  clienteNome: string
  servicoNome: string
  profissionalId: number
  profissionalNome: string
  /** Data/hora local sem fuso, como `2026-11-10T14:00:00`. */
  dataHoraInicio: string
  dataHoraFim: string
  /** Código do backend, como `AGUARDANDO_CONFIRMACAO`. */
  status: string
}

export type FiltrosDaAgenda = {
  /** Primeiro dia (`YYYY-MM-DD`), inclusive. */
  de: string
  /** Último dia (`YYYY-MM-DD`), inclusive. */
  ate: string
}

/**
 * Agendamentos do período para o gestor. O backend compara `inicio`/`fim` como horário local
 * (ambos inclusivos), então o último dia vai até 23:59:59.
 */
export async function listarAgenda(
  estabelecimentoId: number | string,
  { de, ate }: FiltrosDaAgenda,
): Promise<AgendamentoDaAgenda[]> {
  const consulta = new URLSearchParams({ inicio: `${de}T00:00:00`, fim: `${ate}T23:59:59` })
  const resposta = await requisitar(
    `/api/admin/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/agenda?${consulta}`,
  )
  return resposta.json()
}

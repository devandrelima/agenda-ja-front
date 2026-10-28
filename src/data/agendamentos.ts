import { requisitar, tokenCsrf } from './api'

export type AgendamentoRegistrado = {
  id: number
  servicoId: number
  profissionalId: number
  dataHoraInicio: string
  dataHoraFim: string
  status: string
  valor: number
}

export type NovoAgendamento = {
  servicoId: string
  profissionalId: string
  /** Chave `YYYY-MM-DD` da data. */
  data: string
  /** Horário `HH:mm`. */
  horario: string
}

/**
 * Reserva o horário para o cliente logado. O início vai como data/hora local sem fuso
 * (`2026-11-03T14:00:00`), como o backend e a consulta de disponibilidade usam.
 */
export async function registrarAgendamento(
  estabelecimentoId: string,
  agendamento: NovoAgendamento,
): Promise<AgendamentoRegistrado> {
  const token = await tokenCsrf()
  const resposta = await requisitar(
    `/api/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/agendamentos`,
    {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        servicoId: Number(agendamento.servicoId),
        profissionalId: Number(agendamento.profissionalId),
        dataHoraInicio: `${agendamento.data}T${agendamento.horario}:00`,
      }),
    },
  )
  return resposta.json()
}

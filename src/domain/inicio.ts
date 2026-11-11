import type { AgendamentoDaAgenda } from '../data/agenda'

const dataDe = (momento: string) => momento.slice(0, 10)

/** Reservas que ainda vão acontecer: aguardando confirmação ou confirmadas. */
export const estaAtivo = (agendamento: AgendamentoDaAgenda) =>
  agendamento.status === 'AGUARDANDO_CONFIRMACAO' || agendamento.status === 'CONFIRMADO'

export type ResumoDoInicio = {
  /** Reservas de hoje que não foram canceladas. */
  hoje: number
  confirmados: number
  aguardando: number
  /** Soma do valor das reservas confirmadas; `null` se o valor de algum serviço é desconhecido. */
  faturamentoPrevisto: number | null
}

/**
 * Números da página inicial a partir das reservas do período carregado. O valor vem do cadastro
 * de serviços (a agenda traz só o nome do serviço); sem ele o faturamento fica indefinido.
 */
export function resumirAgenda(
  agendamentos: AgendamentoDaAgenda[],
  hoje: string,
  valorPorServico: ReadonlyMap<string, number> | null,
): ResumoDoInicio {
  const confirmados = agendamentos.filter((item) => item.status === 'CONFIRMADO')
  const valores = confirmados.map((item) => valorPorServico?.get(item.servicoNome))
  return {
    hoje: agendamentos.filter(
      (item) => item.status !== 'CANCELADO' && dataDe(item.dataHoraInicio) === hoje,
    ).length,
    confirmados: confirmados.length,
    aguardando: agendamentos.filter((item) => item.status === 'AGUARDANDO_CONFIRMACAO').length,
    faturamentoPrevisto: valores.some((valor) => valor === undefined)
      ? null
      : valores.reduce<number>((total, valor) => total + (valor ?? 0), 0),
  }
}

/** As próximas reservas ativas, da mais próxima para a mais distante. */
export function proximosAtendimentos(agendamentos: AgendamentoDaAgenda[], limite = 8) {
  return agendamentos
    .filter(estaAtivo)
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio) || a.id - b.id)
    .slice(0, limite)
}

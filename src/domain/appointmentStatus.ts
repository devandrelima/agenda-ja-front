import type { MeuAgendamento } from '../data/clientAppointments'

const rotulos: Record<string, string> = {
  AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação',
  CONFIRMADO: 'Confirmado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

/** Texto do status do backend (`CONFIRMADO`) para exibição. */
export function rotuloDoStatus(status: string): string {
  return rotulos[status] ?? status
}

const prioridadeDoStatus: Record<MeuAgendamento['status'], number> = {
  AGUARDANDO_CONFIRMACAO: 0,
  CONFIRMADO: 1,
  CONCLUIDO: 2,
  CANCELADO: 3,
}

/** Agrupa a lista pelo estado mais útil ao cliente e, dentro de cada grupo, pelo próximo horário. */
export function ordenarMeusAgendamentos(agendamentos: MeuAgendamento[]) {
  return [...agendamentos].sort((primeiro, segundo) => {
    const diferencaDeStatus = prioridadeDoStatus[primeiro.status] - prioridadeDoStatus[segundo.status]
    if (diferencaDeStatus !== 0) return diferencaDeStatus
    return new Date(primeiro.inicio).getTime() - new Date(segundo.inicio).getTime()
  })
}

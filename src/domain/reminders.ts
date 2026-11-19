/** O backend envia os lembretes por e-mail, todo dia às 8h, para os atendimentos do dia seguinte. */
const HORA_DO_ENVIO = 8

export type EstadoDoLembrete =
  | { tipo: 'agendado'; dataDoEnvio: Date }
  | { tipo: 'cancelado' }
  | { tipo: 'perdido' }
  | { tipo: 'nenhum' }

/**
 * Só reservas confirmadas ou aguardando confirmação recebem lembrete. Se o envio da véspera já
 * passou quando o atendimento ainda está por vir (reserva feita em cima da hora), não há lembrete.
 */
export function estadoDoLembrete(
  status: string,
  inicio: string,
  agora: Date = new Date(),
): EstadoDoLembrete {
  if (status === 'CANCELADO') return { tipo: 'cancelado' }
  if (status !== 'CONFIRMADO' && status !== 'AGUARDANDO_CONFIRMACAO') return { tipo: 'nenhum' }

  const inicioDoAtendimento = new Date(inicio)
  if (Number.isNaN(inicioDoAtendimento.getTime()) || inicioDoAtendimento <= agora) {
    return { tipo: 'nenhum' }
  }
  const dataDoEnvio = new Date(inicioDoAtendimento)
  dataDoEnvio.setDate(dataDoEnvio.getDate() - 1)
  dataDoEnvio.setHours(HORA_DO_ENVIO, 0, 0, 0)
  return dataDoEnvio > agora ? { tipo: 'agendado', dataDoEnvio } : { tipo: 'perdido' }
}

/** Texto do aviso, ou `null` quando não há o que informar. */
export function mensagemDoLembrete(
  estado: EstadoDoLembrete,
  { destinatario, email }: { destinatario: 'cliente' | 'gestor'; email?: string | null },
): string | null {
  const sujeito = destinatario === 'cliente' ? 'Você receberá' : 'O cliente receberá'
  switch (estado.tipo) {
    case 'agendado': {
      const data = estado.dataDoEnvio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const canal = email ? `por e-mail (${email})` : 'por e-mail'
      return `${sujeito} um lembrete ${canal} na véspera, ${data}, às ${HORA_DO_ENVIO}h.`
    }
    case 'cancelado':
      return 'Reservas canceladas não recebem lembrete.'
    case 'perdido':
      return 'O horário do lembrete da véspera já passou, então este atendimento não terá lembrete.'
    default:
      return null
  }
}

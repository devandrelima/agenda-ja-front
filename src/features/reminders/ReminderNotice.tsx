import { estadoDoLembrete, mensagemDoLembrete } from '../../domain/reminders'

/** Informa se e quando o lembrete da véspera será enviado para esta reserva. */
export function AvisoDeLembrete({
  status,
  inicio,
  destinatario,
  email,
  className = 'reminder-notice',
}: {
  status: string
  inicio: string
  destinatario: 'cliente' | 'gestor'
  email?: string | null
  className?: string
}) {
  const mensagem = mensagemDoLembrete(estadoDoLembrete(status, inicio), { destinatario, email })
  if (!mensagem) return null
  return (
    <p className={className} role="note">
      <span aria-hidden="true">🔔</span> {mensagem}
    </p>
  )
}

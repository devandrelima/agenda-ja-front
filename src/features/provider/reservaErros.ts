import { ErroApi } from '../../data/api'

export function mensagemFalhaReserva(falha: unknown) {
  if (falha instanceof ErroApi) {
    if (falha.status === 401) return 'Sua sessão expirou. Atualize a página para entrar novamente.'
    if (falha.status === 403) return 'Você não tem acesso a esta reserva.'
    if (falha.status === 404) return 'Reserva não encontrada.'
    return falha.message
  }
  return falha instanceof Error ? falha.message : 'Não foi possível concluir a solicitação.'
}

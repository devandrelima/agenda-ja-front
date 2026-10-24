import type { EscolhasAgendamento } from './models'

export function etapaDisponivel(escolhas: EscolhasAgendamento): number {
  if (!escolhas.idServico) return 1
  if (!escolhas.idProfissional && !escolhas.qualquerProfissional) return 2
  if (!escolhas.data || !escolhas.horario) return 3
  if (!escolhas.cliente) return 4
  return 5
}

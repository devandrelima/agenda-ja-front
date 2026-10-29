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

export type MeuAgendamento = {
  id: string
  estabelecimento: string
  servico: string
  profissional: string
  localizacao: string
  publicId: string
  inicio: string
  fim: string
  status: 'AGUARDANDO_CONFIRMACAO' | 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO'
  valor: number
}

// O backend ainda não disponibiliza HU18-BE01/BE03. Este repositório em memória
// mantém o fluxo demonstrável e deve ser substituído pelas respostas da API.
const agendamentos: MeuAgendamento[] = [
  {
    id: '1',
    estabelecimento: 'Studio Marina',
    servico: 'Corte e escova',
    profissional: 'Marina Souza',
    localizacao: 'Av. Rio Branco, 214, Centro',
    publicId: 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311',
    inicio: '2026-11-07T14:00:00',
    fim: '2026-11-07T15:00:00',
    status: 'AGUARDANDO_CONFIRMACAO',
    valor: 75,
  },
  {
    id: '2',
    estabelecimento: 'Vivian Unhas',
    servico: 'Manicure',
    profissional: 'Vivian Lima',
    localizacao: 'Rua das Flores, 89, Tirol',
    publicId: 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311',
    inicio: '2026-11-12T10:30:00',
    fim: '2026-11-12T11:30:00',
    status: 'CONFIRMADO',
    valor: 45,
  },
]

export function listarMeusAgendamentos() {
  return [...agendamentos].sort((primeiro, segundo) => primeiro.inicio.localeCompare(segundo.inicio))
}

export function buscarMeuAgendamento(id: string) {
  return agendamentos.find((agendamento) => agendamento.id === id)
}

export function confirmarMeuAgendamento(id: string) {
  const agendamento = buscarMeuAgendamento(id)
  if (!agendamento || agendamento.status !== 'AGUARDANDO_CONFIRMACAO') return agendamento
  agendamento.status = 'CONFIRMADO'
  return agendamento
}

/** Simula HU18-BE03: o backend deverá cancelar e liberar o horário no calendário. */
export function cancelarMeuAgendamento(id: string) {
  const agendamento = buscarMeuAgendamento(id)
  if (!agendamento || ['CANCELADO', 'CONCLUIDO'].includes(agendamento.status)) return agendamento
  agendamento.status = 'CANCELADO'
  return agendamento
}

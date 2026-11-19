import { requisitar } from './api'

export type ProximoAtendimento = {
  agendamentoId: number
  horarioInicio: string
  clienteNome: string
  servicoNome: string
  profissionalNome: string
  status: string
  valorPrevisto: number
}

export type DashboardResumo = {
  data: string
  totalReservas: number
  confirmados: number
  pendentes: number
  cancelados: number
  concluidos: number
  faturamentoPrevisto: number
  proximosAtendimentos: ProximoAtendimento[]
}

export type ServicoPopular = {
  servicoId: number
  servicoNome: string
  quantidadeAgendamentos: number
}

export type RelatorioOperacional = {
  dataInicio: string
  dataFim: string
  totalConcluidos: number
  faturamentoConcluidos: number
  taxaConfirmacao: number
  servicosMaisPopulares: ServicoPopular[]
}

export async function buscarDashboard(estabelecimentoId: number, data: string) {
  const resposta = await requisitar(
    `/api/admin/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/dashboard?data=${encodeURIComponent(data)}`,
  )
  return resposta.json() as Promise<DashboardResumo>
}

export async function buscarRelatorio(
  estabelecimentoId: number,
  dataInicio: string,
  dataFim: string,
) {
  const parametros = new URLSearchParams({ dataInicio, dataFim })
  const resposta = await requisitar(
    `/api/admin/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/relatorios?${parametros}`,
  )
  return resposta.json() as Promise<RelatorioOperacional>
}

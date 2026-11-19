import { requisitar } from './api'

export type ClienteResumo = {
  id: number
  nome: string
  telefone: string
  totalVisitas: number
  ultimaVisita: string | null
}

export type AgendamentoHistorico = {
  id: number
  servicoNome: string
  profissionalNome: string
  dataHoraInicio: string
  status: string
  valor: number
}

export type ClienteHistorico = {
  id: number
  nome: string
  telefone: string
  servicoMaisFrequente: string
  agendamentos: AgendamentoHistorico[]
}

function caminhoClientes(estabelecimentoId: number) {
  return `/api/admin/estabelecimentos/${estabelecimentoId}/clientes`
}

export async function listarClientes(estabelecimentoId: number): Promise<ClienteResumo[]> {
  const resposta = await requisitar(caminhoClientes(estabelecimentoId))
  return resposta.json()
}

export async function buscarHistoricoDoCliente(
  estabelecimentoId: number,
  clienteId: number,
): Promise<ClienteHistorico> {
  const resposta = await requisitar(`${caminhoClientes(estabelecimentoId)}/${clienteId}`)
  return resposta.json()
}

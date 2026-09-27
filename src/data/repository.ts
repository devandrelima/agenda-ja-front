import type { Agendamento, Cliente, Estabelecimento, Profissional, Servico } from '../domain/models'

export interface RepositorioAgenda {
  buscarEstabelecimento(): Estabelecimento
  buscarServicos(): Servico[]
  buscarProfissionais(): Profissional[]
  buscarAgendamentos(): Agendamento[]
  buscarClientes(): Cliente[]
}

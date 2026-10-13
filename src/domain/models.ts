export type StatusAgendamento = 'Confirmado' | 'Aguardando confirmação' | 'Cancelado'

export type Servico = {
  id: string
  nome: string
  duracao: number
  valor: number
}

export type Profissional = {
  id: string
  nome: string
  especialidades: string[]
  idsServicos: string[]
  diasDeFolga: string[]
  diasDeAtendimento: number[]
}

export type Estabelecimento = {
  id: string
  nome: string
  categoria: string
  endereco: string
  avaliacao: number
  quantidadeAvaliacoes: number
  avaliacoes: Avaliacao[]
  horarioDeFuncionamento: string
}

export type Avaliacao = {
  id: string
  nomeCliente: string
  comentario: string
  estrelas: number
}

export type Cliente = {
  id: string
  nome: string
  telefone: string
  email: string
}

export type Agendamento = {
  id: string
  idServico: string
  idProfissional: string
  idCliente: string
  inicio: string
  status: StatusAgendamento
}

export type EscolhasAgendamento = {
  idServico?: string
  idProfissional?: string
  data?: string
  horario?: string
  cliente?: Omit<Cliente, 'id'>
}

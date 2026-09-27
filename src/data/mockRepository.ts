import { adicionarDias, paraChaveData } from '../domain/availability'
import type { Agendamento, Cliente, Estabelecimento, Profissional, Servico } from '../domain/models'
import type { RepositorioAgenda } from './repository'

const primeiroDiaDaAgenda = paraChaveData(adicionarDias(new Date(), 1))
const segundoDiaDaAgenda = paraChaveData(adicionarDias(new Date(), 2))

const estabelecimento: Estabelecimento = {
  id: 'est-1',
  nome: 'Ateliê Aurora',
  categoria: 'Salão de beleza',
  endereco: 'Endereço ilustrativo · Centro',
  avaliacao: 4.9,
  horarioDeFuncionamento: 'Seg–Sáb, 9h às 18h',
}

const servicos: Servico[] = [
  { id: 'corte', nome: 'Corte feminino', duracao: 60, valor: 75 },
  { id: 'escova', nome: 'Escova', duracao: 45, valor: 55 },
  { id: 'sobrancelha', nome: 'Design de sobrancelha', duracao: 30, valor: 40 },
]

const profissionais: Profissional[] = [
  {
    id: 'ana',
    nome: 'Ana Martins',
    especialidades: ['Cortes e visagismo'],
    idsServicos: ['corte', 'escova'],
    diasDeFolga: [],
  },
  {
    id: 'bia',
    nome: 'Beatriz Lima',
    especialidades: ['Escovas e finalização'],
    idsServicos: ['escova', 'sobrancelha'],
    diasDeFolga: [segundoDiaDaAgenda],
  },
  {
    id: 'clara',
    nome: 'Clara Nunes',
    especialidades: ['Sobrancelhas'],
    idsServicos: ['sobrancelha'],
    diasDeFolga: [],
  },
]

const clientes: Cliente[] = [
  { id: 'c1', nome: 'Marina Souza', telefone: '(85) 99999-0001', email: 'marina@exemplo.com' },
  { id: 'c2', nome: 'Luana Costa', telefone: '(85) 99999-0002', email: 'luana@exemplo.com' },
  { id: 'c3', nome: 'Paula Reis', telefone: '(85) 99999-0003', email: 'paula@exemplo.com' },
]

const agendamentos: Agendamento[] = [
  {
    id: 'a1',
    idServico: 'corte',
    idProfissional: 'ana',
    idCliente: 'c1',
    inicio: `${primeiroDiaDaAgenda}T10:00:00`,
    status: 'Confirmado',
  },
  {
    id: 'a2',
    idServico: 'escova',
    idProfissional: 'ana',
    idCliente: 'c2',
    inicio: `${primeiroDiaDaAgenda}T14:00:00`,
    status: 'Aguardando confirmação',
  },
  {
    id: 'a3',
    idServico: 'sobrancelha',
    idProfissional: 'clara',
    idCliente: 'c3',
    inicio: `${segundoDiaDaAgenda}T11:00:00`,
    status: 'Confirmado',
  },
]

export const repositorioMock: RepositorioAgenda = {
  buscarEstabelecimento: () => estabelecimento,
  buscarServicos: () => servicos,
  buscarProfissionais: () => profissionais,
  buscarAgendamentos: () => agendamentos,
  buscarClientes: () => clientes,
}

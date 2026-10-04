import { adicionarDias, paraChaveData } from '../domain/availability'
import type {
  Agendamento,
  Avaliacao,
  Cliente,
  Estabelecimento,
  Profissional,
  Servico,
} from '../domain/models'
import type { RepositorioAgenda } from './repository'

const primeiroDiaDaAgenda = paraChaveData(adicionarDias(new Date(), 1))
const segundoDiaDaAgenda = paraChaveData(adicionarDias(new Date(), 2))

const comentariosDeAvaliacao: Omit<Avaliacao, 'id'>[] = [
  {
    nomeCliente: 'Marina Souza',
    comentario: 'Atendimento impecável e um resultado lindo. Voltarei com certeza!',
    estrelas: 5,
  },
  {
    nomeCliente: 'Luana Costa',
    comentario: 'A equipe foi muito atenciosa e o ambiente é super acolhedor.',
    estrelas: 5,
  },
  {
    nomeCliente: 'Paula Reis',
    comentario: 'Adorei o corte e as dicas para cuidar do cabelo em casa.',
    estrelas: 4,
  },
  {
    nomeCliente: 'Rafael Alves',
    comentario: 'Profissionais muito cuidadosos e pontuais. Recomendo demais.',
    estrelas: 5,
  },
  {
    nomeCliente: 'Camila Rocha',
    comentario: 'Fiquei muito feliz com o resultado e com o atendimento.',
    estrelas: 4,
  },
  {
    nomeCliente: 'João Mendes',
    comentario: 'Ambiente agradável e serviço excelente do início ao fim.',
    estrelas: 5,
  },
  {
    nomeCliente: 'Fernanda Lima',
    comentario: 'Gostei bastante, mas esperei alguns minutos além do horário.',
    estrelas: 3,
  },
  {
    nomeCliente: 'Gabriela Torres',
    comentario: 'Meu cabelo ficou exatamente como eu queria. Experiência perfeita!',
    estrelas: 5,
  },
  {
    nomeCliente: 'Carlos Henrique',
    comentario: 'Ótimo atendimento e preço justo.',
    estrelas: 4,
  },
  {
    nomeCliente: 'Aline Freitas',
    comentario: 'O resultado foi bom, mas acredito que a comunicação poderia melhorar.',
    estrelas: 2,
  },
  {
    nomeCliente: 'Renata Campos',
    comentario: 'Sempre saio satisfeita. Minha escolha favorita no Centro!',
    estrelas: 5,
  },
  {
    nomeCliente: 'Diego Santos',
    comentario: 'Serviço muito bem feito e equipe simpática.',
    estrelas: 4,
  },
]

const estabelecimento: Estabelecimento = {
  id: 'est-1',
  nome: 'Ateliê Aurora',
  categoria: 'Salão de beleza',
  endereco: 'Endereço ilustrativo · Centro',
  avaliacao: 4.9,
  quantidadeAvaliacoes: 126,
  avaliacoes: Array.from({ length: 126 }, (_, indice) => ({
    id: `av-${indice + 1}`,
    ...comentariosDeAvaliacao[indice % comentariosDeAvaliacao.length],
  })),
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

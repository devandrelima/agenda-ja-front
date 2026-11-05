import { ErroApi } from './api'
import type { DetalhesAgendamento, FonteReserva, NovoStatusAgendamento } from './agendamentos'
import { repositorioMock } from './mockRepository'
import { buscarHorariosDisponiveis } from '../domain/availability'
import type { StatusAgendamento } from '../domain/models'

const codigos: Record<StatusAgendamento, string> = {
  'Aguardando confirmação': 'AGUARDANDO_CONFIRMACAO',
  Confirmado: 'CONFIRMADO',
  Concluído: 'CONCLUIDO',
  Cancelado: 'CANCELADO',
}

const rotulos: Record<NovoStatusAgendamento, StatusAgendamento> = {
  CONFIRMADO: 'Confirmado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

// As mesmas transições que o backend aceita.
const transicoes: Record<StatusAgendamento, StatusAgendamento[]> = {
  'Aguardando confirmação': ['Confirmado', 'Cancelado'],
  Confirmado: ['Concluído', 'Cancelado'],
  Concluído: [],
  Cancelado: [],
}

const dois = (numero: number) => String(numero).padStart(2, '0')

/** Data/hora local sem fuso (`2026-11-03T14:00:00`), como o backend envia. */
function formatarLocal(data: Date) {
  return (
    `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}` +
    `T${dois(data.getHours())}:${dois(data.getMinutes())}:00`
  )
}

/**
 * Faz o modal da reserva funcionar sobre os agendamentos do mock (página inicial e agenda de
 * demonstração). As alterações ficam só em memória e seguem as regras do backend.
 */
export function criarFonteMock(idAgendamento: string): FonteReserva {
  function localizar() {
    const agendamento = repositorioMock
      .buscarAgendamentos()
      .find((item) => item.id === idAgendamento)
    if (!agendamento) throw new ErroApi(404, 'Reserva não encontrada.')
    const servico = repositorioMock.buscarServicos().find((i) => i.id === agendamento.idServico)!
    const profissional = repositorioMock
      .buscarProfissionais()
      .find((i) => i.id === agendamento.idProfissional)!
    return { agendamento, servico, profissional }
  }

  function horariosLivres(data: string) {
    const { agendamento, servico, profissional } = localizar()
    const outros = repositorioMock.buscarAgendamentos().filter((item) => item !== agendamento)
    return buscarHorariosDisponiveis(
      data,
      profissional,
      servico,
      outros,
      repositorioMock.buscarServicos(),
    )
  }

  return {
    demonstracao: true,
    async buscar() {
      const { agendamento, servico, profissional } = localizar()
      const inicio = new Date(agendamento.inicio)
      return {
        id: 0,
        estabelecimentoNome: repositorioMock.buscarEstabelecimento().nome,
        servicoNome: servico.nome,
        profissionalNome: profissional.nome,
        dataHoraInicio: agendamento.inicio,
        dataHoraFim: formatarLocal(new Date(inicio.getTime() + servico.duracao * 60000)),
        status: codigos[agendamento.status],
        valor: servico.valor,
      } satisfies DetalhesAgendamento
    },
    async alterarStatus(status) {
      const { agendamento } = localizar()
      const novo = rotulos[status]
      if (!transicoes[agendamento.status].includes(novo))
        throw new ErroApi(400, 'Transição de status inválida.')
      agendamento.status = novo
    },
    async listarHorarios(_reserva, data) {
      return horariosLivres(data)
    },
    async reagendar(data, horario) {
      const { agendamento } = localizar()
      if (agendamento.status === 'Cancelado' || agendamento.status === 'Concluído')
        throw new ErroApi(400, 'Reserva não pode ser reagendada.')
      if (!horariosLivres(data).includes(horario)) throw new ErroApi(409, 'Horário ocupado.')
      agendamento.inicio = `${data}T${horario}:00`
    },
  }
}

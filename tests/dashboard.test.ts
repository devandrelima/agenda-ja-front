import { describe, expect, it } from 'vitest'
import { repositorioMock } from '../src/data/mockRepository'
describe('indicadores do dashboard', () =>
  it('calcula faturamento somente de agendamentos confirmados', () => {
    const servicos = repositorioMock.buscarServicos()
    const total = repositorioMock
      .buscarAgendamentos()
      .filter((agendamento) => agendamento.status === 'Confirmado')
      .reduce(
        (soma, agendamento) =>
          soma + (servicos.find((servico) => servico.id === agendamento.idServico)?.valor ?? 0),
        0,
      )
    expect(total).toBe(115)
  }))

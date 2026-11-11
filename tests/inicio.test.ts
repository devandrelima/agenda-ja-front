import { describe, expect, it } from 'vitest'
import type { AgendamentoDaAgenda } from '../src/data/agenda'
import { proximosAtendimentos, resumirAgenda } from '../src/domain/inicio'

const reserva = (campos: Partial<AgendamentoDaAgenda>): AgendamentoDaAgenda => ({
  id: 1,
  clienteNome: 'Marina Souza',
  servicoNome: 'Corte',
  profissionalId: 1,
  profissionalNome: 'Ana Martins',
  dataHoraInicio: '2026-11-11T10:00:00',
  dataHoraFim: '2026-11-11T11:00:00',
  status: 'CONFIRMADO',
  ...campos,
})

const valores = new Map([
  ['Corte', 50],
  ['Escova', 40],
])

describe('resumo da página inicial', () => {
  const lista = [
    reserva({ id: 1 }),
    reserva({ id: 2, servicoNome: 'Escova', status: 'AGUARDANDO_CONFIRMACAO' }),
    reserva({ id: 3, status: 'CANCELADO' }),
    reserva({ id: 4, status: 'CONCLUIDO', dataHoraInicio: '2026-11-11T08:00:00' }),
    reserva({ id: 5, servicoNome: 'Escova', dataHoraInicio: '2026-11-13T09:00:00' }),
  ]

  it('conta as reservas de hoje sem as canceladas, e por status', () => {
    expect(resumirAgenda(lista, '2026-11-11', valores)).toMatchObject({
      hoje: 3,
      confirmados: 2,
      aguardando: 1,
    })
  })

  it('soma o valor só das reservas confirmadas', () => {
    expect(resumirAgenda(lista, '2026-11-11', valores).faturamentoPrevisto).toBe(90)
  })

  it('deixa o faturamento indefinido sem o valor dos serviços', () => {
    expect(resumirAgenda(lista, '2026-11-11', null).faturamentoPrevisto).toBeNull()
    expect(
      resumirAgenda(lista, '2026-11-11', new Map([['Corte', 50]])).faturamentoPrevisto,
    ).toBeNull()
  })

  it('tem faturamento zero quando nada está confirmado', () => {
    expect(resumirAgenda([reserva({ status: 'CANCELADO' })], '2026-11-11', null)).toMatchObject({
      confirmados: 0,
      faturamentoPrevisto: 0,
    })
  })
})

describe('próximos atendimentos', () => {
  it('ordena por início, ignora concluídas e canceladas e respeita o limite', () => {
    const lista = [
      reserva({ id: 1, dataHoraInicio: '2026-11-12T10:00:00' }),
      reserva({ id: 2, dataHoraInicio: '2026-11-11T16:00:00', status: 'AGUARDANDO_CONFIRMACAO' }),
      reserva({ id: 3, dataHoraInicio: '2026-11-11T09:00:00', status: 'CONCLUIDO' }),
      reserva({ id: 4, dataHoraInicio: '2026-11-11T12:00:00', status: 'CANCELADO' }),
      reserva({ id: 5, dataHoraInicio: '2026-11-11T16:00:00' }),
    ]
    expect(proximosAtendimentos(lista).map((item) => item.id)).toEqual([2, 5, 1])
    expect(proximosAtendimentos(lista, 2).map((item) => item.id)).toEqual([2, 5])
  })

  it('não altera a lista recebida', () => {
    const lista = [
      reserva({ id: 1, dataHoraInicio: '2026-11-12T10:00:00' }),
      reserva({ id: 2, dataHoraInicio: '2026-11-11T10:00:00' }),
    ]
    proximosAtendimentos(lista)
    expect(lista.map((item) => item.id)).toEqual([1, 2])
  })
})

import { describe, expect, it } from 'vitest'
import { ErroApi } from '../src/data/api'
import { criarFonteMock } from '../src/data/mockReserva'
import { repositorioMock } from '../src/data/mockRepository'
import { paraChaveData } from '../src/domain/availability'

/** Primeira data dos próximos dias em que a profissional da reserva tem horários livres. */
async function dataComHorarios(idAgendamento: string) {
  const fonte = criarFonteMock(idAgendamento)
  const reserva = await fonte.buscar()
  for (let dias = 3; dias < 14; dias++) {
    const data = new Date()
    data.setDate(data.getDate() + dias)
    const chave = paraChaveData(data)
    const horarios = await fonte.listarHorarios(reserva, chave)
    if (horarios.length) return { fonte, chave, horarios }
  }
  throw new Error('Sem horários livres')
}

describe('fonte mock da reserva', () => {
  it('descreve a reserva com o mesmo formato da API', async () => {
    const reserva = await criarFonteMock('a1').buscar()
    expect(reserva).toMatchObject({
      servicoNome: 'Corte feminino',
      profissionalNome: 'Ana Martins',
      status: 'CONFIRMADO',
    })
    expect(new Date(reserva.dataHoraFim) > new Date(reserva.dataHoraInicio)).toBe(true)
  })

  it('recusa transições que o backend também recusa', async () => {
    const fonte = criarFonteMock('a3')
    await fonte.alterarStatus('CANCELADO')
    await expect(fonte.alterarStatus('CONFIRMADO')).rejects.toMatchObject({ status: 400 })
    await expect(fonte.reagendar('2099-01-01', '10:00')).rejects.toBeInstanceOf(ErroApi)
  })

  it('reagenda para um horário livre e recusa um ocupado', async () => {
    const { fonte, chave, horarios } = await dataComHorarios('a2')
    await fonte.reagendar(chave, horarios[0])
    expect((await fonte.buscar()).dataHoraInicio).toBe(`${chave}T${horarios[0]}:00`)

    // A reserva a1 é da mesma profissional: o horário dela passa a estar ocupado para a2.
    const a1 = repositorioMock.buscarAgendamentos().find((item) => item.id === 'a1')!
    const [dataA1, horaA1] = [a1.inicio.slice(0, 10), a1.inicio.slice(11, 16)]
    await expect(fonte.reagendar(dataA1, horaA1)).rejects.toMatchObject({ status: 409 })
  })
})

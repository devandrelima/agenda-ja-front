import { describe, expect, it } from 'vitest'
import {
  adicionarDias,
  buscarHorariosDeQualquerProfissional,
  buscarHorariosDisponiveis,
  buscarProfissionaisDoServico,
  paraChaveData,
} from '../src/domain/availability'
import { repositorioMock } from '../src/data/mockRepository'
describe('regras de disponibilidade', () => {
  const servicos = repositorioMock.buscarServicos()
  const profissionais = repositorioMock.buscarProfissionais()
  it('filtra profissionais aptos ao serviço', () =>
    expect(
      buscarProfissionaisDoServico(profissionais, 'corte').map((profissional) => profissional.id),
    ).toEqual(['ana']))
  it('remove horário ocupado e respeita folga', () => {
    const servico = servicos[0]
    const data = repositorioMock.buscarAgendamentos()[0].inicio.slice(0, 10)
    expect(
      buscarHorariosDisponiveis(
        data,
        profissionais[0],
        servico,
        repositorioMock.buscarAgendamentos(),
        servicos,
      ),
    ).not.toContain('10:00')
    const diaDeFolga = profissionais[1].diasDeFolga[0]
    expect(
      buscarHorariosDisponiveis(
        diaDeFolga,
        profissionais[1],
        servicos[1],
        repositorioMock.buscarAgendamentos(),
        servicos,
      ),
    ).toEqual([])
  })
  it('só oferece horários nos dias de atendimento do profissional', () => {
    const data = paraChaveData(adicionarDias(new Date(), 1))
    const diaDaSemana = new Date(`${data}T12:00:00`).getDay()
    const profissional = { ...profissionais[2], diasDeAtendimento: [diaDaSemana] }
    expect(buscarHorariosDisponiveis(data, profissional, servicos[2], [], servicos)).toContain(
      '09:00',
    )
    const outroDia = { ...profissional, diasDeAtendimento: [(diaDaSemana + 1) % 7] }
    expect(buscarHorariosDisponiveis(data, outroDia, servicos[2], [], servicos)).toEqual([])
  })
  it('une os horários livres de todos os profissionais, sem repetir', () => {
    const agendamentos = repositorioMock.buscarAgendamentos()
    const data = agendamentos[0].inicio.slice(0, 10)
    const ana = { ...profissionais[0], diasDeAtendimento: [0, 1, 2, 3, 4, 5, 6] }
    const bia = { ...profissionais[1], diasDeAtendimento: [0, 1, 2, 3, 4, 5, 6], diasDeFolga: [] }
    const horarios = buscarHorariosDeQualquerProfissional(
      data,
      [ana, bia],
      servicos[1],
      agendamentos,
      servicos,
    )
    // Ana tem agendamentos às 10:00 e às 14:00 nesse dia; Beatriz cobre esses horários.
    expect(horarios).toEqual(expect.arrayContaining(['09:00', '10:00', '14:00']))
    expect(new Set(horarios).size).toBe(horarios.length)
    expect(horarios).toEqual([...horarios].sort())
  })
})

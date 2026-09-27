import { describe, expect, it } from 'vitest'
import { buscarHorariosDisponiveis, buscarProfissionaisDoServico } from '../src/domain/availability'
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
})

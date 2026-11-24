import { describe, expect, it } from 'vitest'
import { etapaDisponivel } from '../src/domain/bookingProgress'

const cliente = { nome: 'Paula Reis', telefone: '84994291683', email: 'paula@exemplo.com' }

describe('etapa liberada no agendamento (HU25-FE02)', () => {
  it('só libera o serviço enquanto nada foi escolhido', () =>
    expect(etapaDisponivel({})).toBe(1))

  it('libera o profissional depois de escolher o serviço', () =>
    expect(etapaDisponivel({ idServico: 'corte' })).toBe(2))

  it('libera data e horário ao escolher um profissional', () =>
    expect(etapaDisponivel({ idServico: 'corte', idProfissional: 'ana' })).toBe(3))

  it('libera data e horário ao aceitar qualquer profissional', () =>
    expect(etapaDisponivel({ idServico: 'corte', qualquerProfissional: true })).toBe(3))

  it('mantém data e horário se falta a data ou o horário', () => {
    const base = { idServico: 'corte', idProfissional: 'ana' }
    expect(etapaDisponivel({ ...base, data: '2026-11-03' })).toBe(3)
    expect(etapaDisponivel({ ...base, horario: '09:00' })).toBe(3)
  })

  it('exige profissional definido ao escolher o horário com qualquer profissional', () => {
    const base = { idServico: 'corte', qualquerProfissional: true, data: '2026-11-03', horario: '09:00' }
    expect(etapaDisponivel(base)).toBe(3)
    expect(etapaDisponivel({ ...base, idProfissional: 'ana' })).toBe(4)
  })

  it('libera os dados do cliente com serviço, profissional e horário', () =>
    expect(
      etapaDisponivel({
        idServico: 'corte',
        idProfissional: 'ana',
        data: '2026-11-03',
        horario: '09:00',
      }),
    ).toBe(4))

  it('libera a confirmação quando os dados do cliente foram informados', () =>
    expect(
      etapaDisponivel({
        idServico: 'corte',
        idProfissional: 'ana',
        data: '2026-11-03',
        horario: '09:00',
        cliente,
      }),
    ).toBe(5))
})

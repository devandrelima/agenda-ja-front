import { describe, expect, it } from 'vitest'
import {
  cabecalhoDoDia,
  diasDaSemana,
  inicioDaSemana,
  rotuloDaSemana,
  somarDiasNaChave,
} from '../src/domain/semana'

describe('semana da agenda', () => {
  it('soma dias atravessando meses e anos', () => {
    expect(somarDiasNaChave('2026-11-28', 5)).toBe('2026-12-03')
    expect(somarDiasNaChave('2026-12-30', 3)).toBe('2027-01-02')
    expect(somarDiasNaChave('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('começa a semana na segunda-feira', () => {
    expect(inicioDaSemana('2026-11-11')).toBe('2026-11-09')
    expect(inicioDaSemana('2026-11-09')).toBe('2026-11-09')
    expect(inicioDaSemana('2026-11-15')).toBe('2026-11-09')
    expect(inicioDaSemana('2026-11-16')).toBe('2026-11-16')
  })

  it('lista os sete dias de segunda a domingo', () => {
    expect(diasDaSemana('2026-11-30')).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ])
  })

  it('descreve a semana dentro de um mês e entre dois meses', () => {
    expect(rotuloDaSemana('2026-11-09')).toBe('9 a 15 de novembro de 2026')
    expect(rotuloDaSemana('2026-11-30')).toBe('30 de nov. a 6 de dez. de 2026')
  })

  it('monta o cabeçalho de cada coluna', () => {
    expect(cabecalhoDoDia('2026-11-09')).toMatchObject({
      diaDoMes: '09',
      porExtenso: 'segunda-feira, 9 de novembro',
    })
  })
})

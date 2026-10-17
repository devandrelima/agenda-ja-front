// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest'
import { lerHorariosFuncionamento, resumirHorario } from '../src/data/businessHours'

afterEach(() => localStorage.clear())

test('preserva os horários salvos antes do suporte a vários turnos', () => {
  localStorage.setItem(
    'agendaja-demo-horarios-atelie-aurora-v1',
    JSON.stringify(
      Array.from({ length: 7 }, (_, indice) => ({
        aberto: indice !== 6,
        abertura: '09:00',
        fechamento: '17:00',
      })),
    ),
  )

  const horarios = lerHorariosFuncionamento()
  expect(horarios[0].turnos).toEqual([{ inicio: '09:00', fim: '17:00' }])
  expect(resumirHorario(horarios[6])).toBe('Fechado')
})

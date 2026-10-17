import { expect, test } from 'vitest'
import { emailValido, formatarTelefone, telefoneValido } from '../src/domain/contact'

test('formata celular brasileiro durante a digitação e limita a onze dígitos', () => {
  expect(formatarTelefone('8')).toBe('(8')
  expect(formatarTelefone('849')).toBe('(84) 9')
  expect(formatarTelefone('84994291683')).toBe('(84) 9 9429-1683')
  expect(formatarTelefone('(84) 9 9429-1683 extra 9')).toBe('(84) 9 9429-1683')
})

test('aceita celular com DDD e rejeita número incompleto ou sem nono dígito', () => {
  expect(telefoneValido('(84) 9 9429-1683')).toBe(true)
  expect(telefoneValido('8499429168')).toBe(false)
  expect(telefoneValido('(84) 8 9429-1683')).toBe(false)
  expect(telefoneValido('(00) 9 9429-1683')).toBe(false)
})

test('exige domínio completo no e-mail', () => {
  expect(emailValido('ana+cliente@exemplo.com')).toBe(true)
  expect(emailValido('ana@exemplo')).toBe(false)
  expect(emailValido('ana@exemplo..com')).toBe(false)
  expect(emailValido('ana@@exemplo.com')).toBe(false)
  expect(emailValido('ana exemplo@exemplo.com')).toBe(false)
})

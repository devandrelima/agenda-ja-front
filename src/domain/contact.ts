export function formatarTelefone(entrada: string) {
  const numeros = entrada.replace(/\D/g, '').slice(0, 11)
  if (!numeros) return ''
  if (numeros.length <= 2) return `(${numeros}`

  const prefixo = `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)}`
  if (numeros.length === 3) return prefixo
  if (numeros.length <= 7) return `${prefixo} ${numeros.slice(3)}`
  return `${prefixo} ${numeros.slice(3, 7)}-${numeros.slice(7)}`
}

export function telefoneValido(telefone: string) {
  return /^[1-9]{2}9\d{8}$/.test(telefone.replace(/\D/g, ''))
}

export function emailValido(email: string) {
  return /^[^\s@]+@(?:[^\s@.]+\.)+[^\s@.]{2,}$/.test(email.trim())
}

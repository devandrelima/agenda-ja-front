import { paraChaveData } from './availability'

/** Soma dias a uma chave `YYYY-MM-DD` sem passar pelo fuso do navegador. */
export function somarDiasNaChave(chave: string, dias: number): string {
  const data = new Date(`${chave}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

/** Chave da segunda-feira da semana que contém a data (a semana vai de segunda a domingo). */
export function inicioDaSemana(chave: string): string {
  const diaDaSemana = new Date(`${chave}T12:00:00Z`).getUTCDay()
  return somarDiasNaChave(chave, -((diaDaSemana + 6) % 7))
}

/** As sete chaves `YYYY-MM-DD` da semana que começa em `segunda`. */
export function diasDaSemana(segunda: string): string[] {
  return Array.from({ length: 7 }, (_, indice) => somarDiasNaChave(segunda, indice))
}

/** Chave de hoje no fuso do estabelecimento. */
export const chaveDeHoje = () => paraChaveData(new Date())

const formatarDiaMes = (chave: string, opcoes: Intl.DateTimeFormatOptions) =>
  new Date(`${chave}T12:00:00Z`).toLocaleDateString('pt-BR', { ...opcoes, timeZone: 'UTC' })

/** Ex.: `10 a 16 de novembro de 2026`, ou `30 de nov. a 6 de dez. de 2026` entre meses. */
export function rotuloDaSemana(segunda: string): string {
  const domingo = somarDiasNaChave(segunda, 6)
  const mesmoMes = segunda.slice(0, 7) === domingo.slice(0, 7)
  if (mesmoMes) {
    return `${formatarDiaMes(segunda, { day: 'numeric' })} a ${formatarDiaMes(domingo, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`
  }
  const curto: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${formatarDiaMes(segunda, curto)} a ${formatarDiaMes(domingo, {
    ...curto,
    year: 'numeric',
  })}`
}

/** Cabeçalho de coluna: `seg.` e `10`. */
export function cabecalhoDoDia(chave: string) {
  return {
    diaDaSemana: formatarDiaMes(chave, { weekday: 'short' }),
    diaDoMes: formatarDiaMes(chave, { day: '2-digit' }),
    porExtenso: formatarDiaMes(chave, { weekday: 'long', day: 'numeric', month: 'long' }),
  }
}

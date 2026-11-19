import type { ClienteResumo } from '../data/clients'

const semAcento = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Filtra pelo nome, sem diferenciar maiúsculas nem acentos. */
export function filtrarClientesPorNome(clientes: ClienteResumo[], busca: string) {
  const termo = semAcento(busca)
  if (!termo) return clientes
  return clientes.filter((cliente) => semAcento(cliente.nome).includes(termo))
}

/** Mantém quem tem ao menos `minimo` agendamentos; texto vazio ou inválido não filtra. */
export function filtrarClientesPorQuantidade(clientes: ClienteResumo[], minimo: string) {
  const valor = Number(minimo)
  if (!minimo.trim() || !Number.isFinite(valor)) return clientes
  return clientes.filter((cliente) => cliente.totalVisitas >= valor)
}

export function rotuloDeVisitas(total: number) {
  return total === 1 ? '1 agendamento' : `${total} agendamentos`
}

/** Telefone só com dígitos e DDI 55, para o link do WhatsApp. */
export function linkWhatsapp(telefone: string) {
  const digitos = telefone.replace(/\D/g, '')
  return `https://wa.me/${digitos.startsWith('55') ? digitos : `55${digitos}`}`
}

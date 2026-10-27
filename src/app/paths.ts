import { identificadorPublicoValido } from '../data/publicEstablishment'

export const caminhos = {
  login: '/login',
  cadastro: '/cadastro',
  meusAgendamentos: '/meus-agendamentos',
  painel: '/painel',
  configuracoes: '/painel/configuracoes',
  profissionais: '/painel/profissionais',
  servicos: '/painel/servicos',
  estabelecimento: '/estabelecimento/atelie-aurora',
  avaliacoes: '/estabelecimento/atelie-aurora/avaliacoes',
  disponibilidade: '/estabelecimento/atelie-aurora/disponibilidade',
  agendamento: '/estabelecimento/atelie-aurora/agendar',
} as const

export function caminhoDeAvaliacoesValido(caminho: unknown): caminho is string {
  if (caminho === caminhos.avaliacoes) return true
  if (typeof caminho !== 'string') return false
  const partes = /^\/estabelecimento\/([^/]+)\/avaliacoes$/.exec(caminho)
  return !!partes && identificadorPublicoValido(partes[1])
}

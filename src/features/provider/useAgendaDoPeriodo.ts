import { useEffect, useState } from 'react'
import { INTERVALO_ATUALIZACAO_MS, listarAgenda, type AgendamentoDaAgenda } from '../../data/agenda'
import { ErroApi } from '../../data/api'

export function mensagemFalhaDaAgenda(falha: unknown) {
  if (falha instanceof ErroApi) {
    if (falha.status === 401) return 'Sua sessão expirou. Atualize a página para entrar novamente.'
    if (falha.status === 403) return 'Você não tem acesso à agenda deste estabelecimento.'
    return falha.message
  }
  return falha instanceof Error ? falha.message : 'Não foi possível carregar a agenda.'
}

type Resultado = {
  chave: string
  agendamentos?: AgendamentoDaAgenda[]
  erro?: string
  /** Uma atualização em segundo plano falhou; o que está na tela pode estar desatualizado. */
  atualizacaoFalhou?: boolean
}

export type FiltrosDoPeriodo = {
  /** Primeiro dia (`YYYY-MM-DD`). */
  de: string
  /** Último dia (`YYYY-MM-DD`). */
  ate: string
  profissionalId?: string
  /** Código de um status (`CONFIRMADO`...); vazio, todos. */
  status?: string
}

/**
 * Carrega os agendamentos de um período e os relê de tempos em tempos. Uma consulta por vez; em
 * segundo plano uma falha só avisa, sem apagar o que já está na tela. Trocar de período ou de
 * filtro descarta respostas antigas e volta ao carregamento. A agenda inteira é relida (em vez de
 * só as mudanças recentes) para que reservas remarcadas, canceladas ou fora do filtro também
 * saiam da tela.
 */
export function useAgendaDoPeriodo(
  estabelecimentoId: number | null | undefined,
  { de, ate, profissionalId = '', status = '' }: FiltrosDoPeriodo,
) {
  const [tentativa, definirTentativa] = useState(0)
  // Aumenta quando uma alteração é salva: relê a agenda sem voltar ao estado de carregamento.
  const [versao, definirVersao] = useState(0)
  const [resultado, definirResultado] = useState<Resultado | null>(null)
  // Cada consulta tem uma chave; enquanto o resultado guardado é de outra, está carregando.
  const chave = `${estabelecimentoId}|${de}|${ate}|${profissionalId}|${status}|${tentativa}`
  const atual = resultado?.chave === chave ? resultado : null

  useEffect(() => {
    if (estabelecimentoId == null) return
    let ativo = true
    let consultando = false
    function consultar(emSegundoPlano: boolean) {
      if (consultando || (emSegundoPlano && document.hidden)) return
      consultando = true
      listarAgenda(estabelecimentoId!, {
        de,
        ate,
        profissionalId,
        status: status ? [status] : [],
      })
        .then((agendamentos) => ativo && definirResultado({ chave, agendamentos }))
        .catch((falha) => {
          if (!ativo) return
          if (emSegundoPlano) {
            definirResultado((anterior) =>
              anterior?.chave === chave ? { ...anterior, atualizacaoFalhou: true } : anterior,
            )
          } else {
            definirResultado({ chave, erro: mensagemFalhaDaAgenda(falha) })
          }
        })
        .finally(() => {
          consultando = false
        })
    }
    const aoVoltarParaAba = () => consultar(true)
    consultar(versao > 0)
    const intervalo = window.setInterval(() => consultar(true), INTERVALO_ATUALIZACAO_MS)
    document.addEventListener('visibilitychange', aoVoltarParaAba)
    return () => {
      ativo = false
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoVoltarParaAba)
    }
  }, [chave, estabelecimentoId, de, ate, profissionalId, status, versao])

  return {
    agendamentos: atual?.agendamentos ?? null,
    erro: atual?.erro ?? '',
    atualizacaoFalhou: atual?.atualizacaoFalhou ?? false,
    tentarNovamente: () => definirTentativa((valor) => valor + 1),
    recarregar: () => definirVersao((valor) => valor + 1),
  }
}

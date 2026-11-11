import { useEffect, useState } from 'react'
import { useAutenticacao } from '../../app/useAutenticacao'
import { listarAgenda, type AgendamentoDaAgenda } from '../../data/agenda'
import { ErroApi } from '../../data/api'
import { Button, Card, Empty } from '../../design-system/ui'
import {
  chaveDeHoje,
  diasDaSemana,
  inicioDaSemana,
  rotuloDaSemana,
  somarDiasNaChave,
} from '../../domain/semana'
import { CalendarioSemanal } from './CalendarioSemanal'

function mensagemFalha(falha: unknown) {
  if (falha instanceof ErroApi) {
    if (falha.status === 401) return 'Sua sessão expirou. Atualize a página para entrar novamente.'
    if (falha.status === 403) return 'Você não tem acesso à agenda deste estabelecimento.'
    return falha.message
  }
  return falha instanceof Error ? falha.message : 'Não foi possível carregar a agenda.'
}

export function Agenda() {
  const { sessao } = useAutenticacao()
  const estabelecimentoId = sessao?.estabelecimentoId
  const hoje = chaveDeHoje()
  const [segunda, definirSegunda] = useState(() => inicioDaSemana(chaveDeHoje()))
  const dias = diasDaSemana(segunda)
  const primeiroDia = dias[0]
  const ultimoDia = dias[dias.length - 1]
  const [tentativa, definirTentativa] = useState(0)
  const [resultado, definirResultado] = useState<{
    chave: string
    agendamentos?: AgendamentoDaAgenda[]
    erro?: string
  } | null>(null)
  // Cada consulta tem uma chave; enquanto o resultado guardado é de outra, a tela está carregando.
  const chave = `${estabelecimentoId}|${primeiroDia}|${tentativa}`
  const atual = resultado?.chave === chave ? resultado : null

  useEffect(() => {
    if (estabelecimentoId == null) return
    let ativo = true
    listarAgenda(estabelecimentoId, { de: primeiroDia, ate: ultimoDia })
      .then((agendamentos) => ativo && definirResultado({ chave, agendamentos }))
      .catch((falha) => ativo && definirResultado({ chave, erro: mensagemFalha(falha) }))
    return () => {
      ativo = false
    }
  }, [chave, estabelecimentoId, primeiroDia, ultimoDia])

  return (
    <>
      <header className="topbar">
        <div>
          <p className="muted">{segunda === inicioDaSemana(hoje) ? 'Semana atual' : 'Semana'}</p>
          <h1>Agenda</h1>
        </div>
        <nav className="agenda-navegacao" aria-label="Navegar entre semanas">
          <Button
            variant="secondary"
            aria-label="Semana anterior"
            onClick={() => definirSegunda(somarDiasNaChave(segunda, -7))}
          >
            ‹
          </Button>
          <Button variant="secondary" onClick={() => definirSegunda(inicioDaSemana(hoje))}>
            Hoje
          </Button>
          <Button
            variant="secondary"
            aria-label="Próxima semana"
            onClick={() => definirSegunda(somarDiasNaChave(segunda, 7))}
          >
            ›
          </Button>
          <strong className="agenda-semana" aria-live="polite">
            {rotuloDaSemana(segunda)}
          </strong>
        </nav>
      </header>
      <Card>
        {atual?.erro ? (
          <div role="alert">
            <p className="auth-error">{atual.erro}</p>
            <Button variant="secondary" onClick={() => definirTentativa((valor) => valor + 1)}>
              Tentar novamente
            </Button>
          </div>
        ) : !atual?.agendamentos ? (
          <Empty>Carregando agenda...</Empty>
        ) : (
          <CalendarioSemanal dias={dias} hoje={hoje} agendamentos={atual.agendamentos} />
        )}
      </Card>
    </>
  )
}

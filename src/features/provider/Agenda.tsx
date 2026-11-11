import { useEffect, useState } from 'react'
import { useAutenticacao } from '../../app/useAutenticacao'
import { listarProfissionais, type Profissional } from '../../data/professionals'
import { rotuloDoStatus } from '../../domain/appointmentStatus'
import { criarFonteApi, type FonteReserva } from '../../data/agendamentos'
import { Button, Card, Empty } from '../../design-system/ui'
import {
  chaveDeHoje,
  diasDaSemana,
  inicioDaSemana,
  rotuloDaSemana,
  somarDiasNaChave,
} from '../../domain/semana'
import { CalendarioSemanal } from './CalendarioSemanal'
import { DetalhesDaReserva } from './ReservaDetalhes'
import { useAgendaDoPeriodo } from './useAgendaDoPeriodo'

const statusFiltraveis = ['AGUARDANDO_CONFIRMACAO', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO']

export function Agenda() {
  const { sessao } = useAutenticacao()
  const estabelecimentoId = sessao?.estabelecimentoId
  const hoje = chaveDeHoje()
  const [segunda, definirSegunda] = useState(() => inicioDaSemana(chaveDeHoje()))
  const dias = diasDaSemana(segunda)
  const primeiroDia = dias[0]
  const ultimoDia = dias[dias.length - 1]
  const [profissionalId, definirProfissionalId] = useState('')
  const [status, definirStatus] = useState('')
  const [profissionais, definirProfissionais] = useState<Profissional[]>([])
  const [fonteAberta, definirFonteAberta] = useState<FonteReserva | null>(null)
  // Os profissionais só alimentam o filtro: se a lista falhar, a agenda continua funcionando.
  useEffect(() => {
    if (estabelecimentoId == null) return
    let ativo = true
    listarProfissionais(estabelecimentoId)
      .then((lista) => ativo && definirProfissionais(lista))
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [estabelecimentoId])

  const { agendamentos, erro, atualizacaoFalhou, tentarNovamente, recarregar } = useAgendaDoPeriodo(
    estabelecimentoId,
    {
      de: primeiroDia,
      ate: ultimoDia,
      profissionalId,
      status,
    },
  )

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
      <div className="agenda-filtros">
        <select
          aria-label="Filtrar por profissional"
          value={profissionalId}
          onChange={(evento) => definirProfissionalId(evento.target.value)}
        >
          <option value="">Todos os profissionais</option>
          {profissionais.map((profissional) => (
            <option key={profissional.id} value={profissional.id}>
              {profissional.nome}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(evento) => definirStatus(evento.target.value)}
        >
          <option value="">Todos os status</option>
          {statusFiltraveis.map((codigo) => (
            <option key={codigo} value={codigo}>
              {rotuloDoStatus(codigo)}
            </option>
          ))}
        </select>
      </div>
      <Card>
        {erro ? (
          <div role="alert">
            <p className="auth-error">{erro}</p>
            <Button variant="secondary" onClick={tentarNovamente}>
              Tentar novamente
            </Button>
          </div>
        ) : agendamentos === null ? (
          <Empty>Carregando agenda...</Empty>
        ) : (
          <>
            {atualizacaoFalhou && (
              <p className="muted" role="status">
                Não foi possível atualizar a agenda agora. Tentaremos novamente em instantes.
              </p>
            )}
            <CalendarioSemanal
              dias={dias}
              hoje={hoje}
              agendamentos={agendamentos}
              aoAbrir={(id) => definirFonteAberta(criarFonteApi(estabelecimentoId!, id))}
            />
          </>
        )}
      </Card>
      {fonteAberta && (
        <DetalhesDaReserva
          fonte={fonteAberta}
          aoFechar={() => definirFonteAberta(null)}
          aoAtualizar={recarregar}
        />
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { useAutenticacao } from '../../app/useAutenticacao'
import { INTERVALO_ATUALIZACAO_MS, listarAgenda, type AgendamentoDaAgenda } from '../../data/agenda'
import { ErroApi } from '../../data/api'
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

function mensagemFalha(falha: unknown) {
  if (falha instanceof ErroApi) {
    if (falha.status === 401) return 'Sua sessão expirou. Atualize a página para entrar novamente.'
    if (falha.status === 403) return 'Você não tem acesso à agenda deste estabelecimento.'
    return falha.message
  }
  return falha instanceof Error ? falha.message : 'Não foi possível carregar a agenda.'
}

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
  const [tentativa, definirTentativa] = useState(0)
  // Aumenta quando o modal altera uma reserva: relê a agenda sem trocar os blocos por "Carregando".
  const [versao, definirVersao] = useState(0)
  const [fonteAberta, definirFonteAberta] = useState<FonteReserva | null>(null)
  const [resultado, definirResultado] = useState<{
    chave: string
    agendamentos?: AgendamentoDaAgenda[]
    erro?: string
    /** Uma atualização em segundo plano falhou; os blocos mostrados podem estar desatualizados. */
    atualizacaoFalhou?: boolean
  } | null>(null)
  // Cada consulta tem uma chave; enquanto o resultado guardado é de outra, a tela está carregando.
  const chave = `${estabelecimentoId}|${primeiroDia}|${profissionalId}|${status}|${tentativa}`
  const atual = resultado?.chave === chave ? resultado : null

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

  // Carrega a semana e a refaz de tempos em tempos. Uma consulta por vez; em segundo plano uma
  // falha só avisa, sem apagar o que já está na tela. Trocar de semana ou de filtro descarta
  // respostas antigas. A agenda inteira é relida (em vez de só as mudanças recentes) para que
  // reservas remarcadas, canceladas ou fora do filtro também saiam da tela.
  useEffect(() => {
    if (estabelecimentoId == null) return
    let ativo = true
    let consultando = false
    function consultar(emSegundoPlano: boolean) {
      if (consultando || (emSegundoPlano && document.hidden)) return
      consultando = true
      listarAgenda(estabelecimentoId!, {
        de: primeiroDia,
        ate: ultimoDia,
        profissionalId,
        status: status ? [status] : [],
      })
        .then((agendamentos) => ativo && definirResultado({ chave, agendamentos }))
        .catch((falha) => {
          if (!ativo) return
          if (emSegundoPlano) {
            definirResultado((atual) =>
              atual?.chave === chave ? { ...atual, atualizacaoFalhou: true } : atual,
            )
          } else {
            definirResultado({ chave, erro: mensagemFalha(falha) })
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
  }, [chave, estabelecimentoId, primeiroDia, ultimoDia, profissionalId, status, versao])

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
          <>
            {atual.atualizacaoFalhou && (
              <p className="muted" role="status">
                Não foi possível atualizar a agenda agora. Tentaremos novamente em instantes.
              </p>
            )}
            <CalendarioSemanal
              dias={dias}
              hoje={hoje}
              agendamentos={atual.agendamentos}
              aoAbrir={(id) => definirFonteAberta(criarFonteApi(estabelecimentoId!, id))}
            />
          </>
        )}
      </Card>
      {fonteAberta && (
        <DetalhesDaReserva
          fonte={fonteAberta}
          aoFechar={() => definirFonteAberta(null)}
          aoAtualizar={() => definirVersao((valor) => valor + 1)}
        />
      )}
    </>
  )
}

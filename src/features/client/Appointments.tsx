import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Logo } from '../../design-system/ui'
import { caminhoDoMeuAgendamento, caminhos } from '../../app/paths'
import {
  buscarMeuAgendamento,
  cancelarMeuAgendamento,
  confirmarMeuAgendamento,
  listarMeusAgendamentos,
  type MeuAgendamento,
} from '../../data/clientAppointments'
import { rotuloDoStatus } from '../../domain/appointmentStatus'
import { ConfirmarCancelamento } from './ConfirmCancel'

function formatarData(data: string) {
  return new Date(data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatarHora(data: string) {
  return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function CabecalhoCliente() {
  return (
    <header className="client-appointments-header">
      <Logo />
      <span className="client-avatar" aria-label="Perfil do cliente" role="img">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c.8-4.1 3.5-6.2 8-6.2s7.2 2.1 8 6.2" />
        </svg>
      </span>
    </header>
  )
}

function ResumoDoAgendamento({ agendamento }: { agendamento: MeuAgendamento }) {
  return (
    <>
      <strong>{agendamento.estabelecimento}</strong>
      <span className="client-appointment-service">{agendamento.servico}</span>
      <span className="client-appointment-date">
        {formatarData(agendamento.inicio)} · {formatarHora(agendamento.inicio)}
      </span>
    </>
  )
}

export function MeusAgendamentos() {
  const [agendamentos, definirAgendamentos] = useState<MeuAgendamento[]>([])
  const [carregando, definirCarregando] = useState(true)
  const [erro, definirErro] = useState('')

  useEffect(() => {
    let ativo = true
    listarMeusAgendamentos()
      .then((dados) => {
        if (ativo) definirAgendamentos(dados)
      })
      .catch((falha) => {
        if (ativo)
          definirErro(falha instanceof Error ? falha.message : 'Não foi possível carregar seus agendamentos.')
      })
      .finally(() => {
        if (ativo) definirCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])
  return (
    <main className="client-appointments-page">
      <section className="client-appointments-shell" aria-labelledby="client-appointments-title">
        <CabecalhoCliente />

        <div className="client-appointments-intro">
          <h1 id="client-appointments-title">Seus agendamentos</h1>
          <p>Acompanhe os detalhes das suas reservas.</p>
        </div>

        {carregando && <p role="status">Carregando agendamentos...</p>}
        {erro && <p className="auth-error" role="alert">{erro}</p>}
        {!carregando && !erro && <ul className="client-appointments-list" aria-label="Lista de agendamentos">
          {agendamentos.map((agendamento) => (
            <li key={agendamento.id}>
              <Link to={caminhoDoMeuAgendamento(agendamento.id)} aria-label={`Ver agendamento em ${agendamento.estabelecimento}`}>
                <span className="client-appointment-copy"><ResumoDoAgendamento agendamento={agendamento} /></span>
                <span className="client-appointment-side"><Badge status={rotuloDoStatus(agendamento.status)} /><i aria-hidden="true">›</i></span>
              </Link>
            </li>
          ))}
        </ul>}

        <Link
          className="client-new-booking"
          to={caminhos.novoAgendamento}
        >
          <span>Novo Agendamento</span>
          <span aria-hidden="true">+</span>
        </Link>
      </section>
    </main>
  )
}

export function DetalheDoAgendamento() {
  const { agendamentoId } = useParams()
  const [agendamento, definirAgendamento] = useState<MeuAgendamento>()
  const [carregando, definirCarregando] = useState(() => Boolean(agendamentoId))
  const [erro, definirErro] = useState('')
  const [confirmando, definirConfirmando] = useState(false)
  const [cancelando, definirCancelando] = useState(false)
  const [aviso, definirAviso] = useState('')
  const [confirmandoCancelamento, definirConfirmandoCancelamento] = useState(false)

  useEffect(() => {
    if (!agendamentoId) return
    let ativo = true
    buscarMeuAgendamento(agendamentoId)
      .then((dados) => {
        if (ativo) definirAgendamento(dados)
      })
      .catch((falha) => {
        if (ativo)
          definirErro(falha instanceof Error ? falha.message : 'Não foi possível carregar o agendamento.')
      })
      .finally(() => {
        if (ativo) definirCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [agendamentoId])

  if (carregando)
    return <main className="client-appointments-page"><section className="client-appointments-shell client-empty"><p role="status">Carregando agendamento...</p></section></main>

  if (!agendamento)
    return (
      <main className="client-appointments-page"><section className="client-appointments-shell client-empty"><h1>Agendamento não encontrado</h1>{erro && <p className="auth-error" role="alert">{erro}</p>}<Link to={caminhos.meusAgendamentos}>Voltar para seus agendamentos</Link></section></main>
    )

  const pendente = agendamento.status === 'AGUARDANDO_CONFIRMACAO'
  async function confirmar() {
    if (!agendamentoId || confirmando || !pendente) return
    definirConfirmando(true)
    definirAviso('')
    try {
      const confirmado = await confirmarMeuAgendamento(agendamentoId)
      definirAgendamento(confirmado)
      definirAviso('Agendamento confirmado com sucesso.')
    } catch (falha) {
      definirAviso(falha instanceof Error ? falha.message : 'Não foi possível confirmar o agendamento.')
    } finally {
      definirConfirmando(false)
    }
  }

  async function cancelar() {
    if (!agendamentoId || cancelando) return
    definirCancelando(true)
    definirAviso('')
    try {
      const cancelado = await cancelarMeuAgendamento(agendamentoId)
      definirAgendamento(cancelado)
      definirAviso('Reserva cancelada. A data e o horário foram liberados.')
      definirConfirmandoCancelamento(false)
    } catch (falha) {
      definirAviso(falha instanceof Error ? falha.message : 'Não foi possível cancelar a reserva.')
    } finally {
      definirCancelando(false)
    }
  }

  const agendamentoAtivo = !['CANCELADO', 'CONCLUIDO'].includes(agendamento.status)
  const caminhoNovoAgendamento = `/estabelecimento/${agendamento.publicId}/agendar`

  return (
    <main className="client-appointments-page">
      <section className="client-appointments-shell" aria-labelledby="appointment-detail-title">
        <CabecalhoCliente />
        <Link className="client-back" to={caminhos.meusAgendamentos}>← Seus agendamentos</Link>
        <div className="client-appointments-intro client-detail-intro">
          <p>Detalhes da reserva</p>
          <h1 id="appointment-detail-title">{agendamento.estabelecimento}</h1>
          <Badge status={rotuloDoStatus(agendamento.status)} />
        </div>
        <dl className="client-appointment-details">
          <div><dt>Serviço</dt><dd>{agendamento.servico}</dd></div>
          <div><dt>Profissional</dt><dd>{agendamento.profissional}</dd></div>
          <div><dt>Data</dt><dd>{formatarData(agendamento.inicio)}</dd></div>
          <div><dt>Horário</dt><dd>{formatarHora(agendamento.inicio)} às {formatarHora(agendamento.fim)}</dd></div>
          <div>
            <dt>Localização</dt>
            <dd>
              <a
                className="client-map-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agendamento.localizacao)}`}
                target="_blank"
                rel="noreferrer"
              >
                {agendamento.localizacao} <span aria-hidden="true">↗</span>
              </a>
            </dd>
          </div>
          <div><dt>Valor</dt><dd>{agendamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</dd></div>
        </dl>
        {aviso && <p className="client-appointment-feedback" role="status">{aviso}</p>}
        {pendente && <button className="client-confirm-appointment" type="button" onClick={() => void confirmar()} disabled={confirmando}>{confirmando ? 'Confirmando...' : 'Confirmar agendamento'}</button>}
        {agendamentoAtivo && (
          <Link
            className="client-reschedule-appointment"
            to={caminhoNovoAgendamento}
            state={{ reagendamentoId: agendamento.id, fluxoCliente: 'entrar' }}
          >
            Reagendar
          </Link>
        )}
        {agendamentoAtivo && <button className="client-cancel-appointment" type="button" onClick={() => definirConfirmandoCancelamento(true)}>Cancelar reserva</button>}
        <Link className="client-new-booking" to={caminhoNovoAgendamento}><span>Novo Agendamento</span><span aria-hidden="true">+</span></Link>
      </section>
      {confirmandoCancelamento && (
        <ConfirmarCancelamento
          estabelecimento={agendamento.estabelecimento}
          confirmando={cancelando}
          aoCancelar={() => definirConfirmandoCancelamento(false)}
          aoConfirmar={() => void cancelar()}
        />
      )}
    </main>
  )
}

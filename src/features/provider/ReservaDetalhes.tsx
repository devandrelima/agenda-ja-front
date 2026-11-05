import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Badge, Button } from '../../design-system/ui'
import { buscarAgendamento, type DetalhesAgendamento } from '../../data/agendamentos'
import { mensagemFalhaReserva } from './reservaErros'
import { rotuloDoStatus } from '../../domain/appointmentStatus'

const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatarData = (inicio: string) =>
  new Date(inicio).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

const formatarHora = (momento: string) =>
  new Date(momento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function DetalhesDaReserva({
  estabelecimentoId,
  agendamentoId,
  aoFechar,
}: {
  estabelecimentoId: number
  agendamentoId: number
  aoFechar: () => void
}) {
  const [reserva, definirReserva] = useState<DetalhesAgendamento | null>(null)
  const [erro, definirErro] = useState('')
  const [tentativa, definirTentativa] = useState(0)

  useEffect(() => {
    function fecharComEsc(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', fecharComEsc)
    return () => document.removeEventListener('keydown', fecharComEsc)
  }, [aoFechar])

  useEffect(() => {
    let ativo = true
    buscarAgendamento(estabelecimentoId, agendamentoId)
      .then((dados) => {
        if (ativo) definirReserva(dados)
      })
      .catch((falha) => {
        if (ativo) definirErro(mensagemFalhaReserva(falha))
      })
    return () => {
      ativo = false
    }
  }, [estabelecimentoId, agendamentoId, tentativa])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar()
      }}
    >
      <section
        className="card modal reserva-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserva-dialog-title"
      >
        <h2 id="reserva-dialog-title">Detalhes da reserva</h2>
        {erro ? (
          <>
            <p className="auth-error" role="alert">
              {erro}
            </p>
            <div className="form-actions">
              <Button type="button" variant="ghost" onClick={aoFechar}>
                Fechar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  definirErro('')
                  definirTentativa((atual) => atual + 1)
                }}
              >
                Tentar novamente
              </Button>
            </div>
          </>
        ) : !reserva ? (
          <p className="muted">Carregando reserva...</p>
        ) : (
          <>
            <dl className="reserva-dados">
              <dt>Status</dt>
              <dd>
                <Badge status={rotuloDoStatus(reserva.status)} />
              </dd>
              <dt>Serviço</dt>
              <dd>{reserva.servicoNome}</dd>
              <dt>Profissional</dt>
              <dd>{reserva.profissionalNome}</dd>
              <dt>Data</dt>
              <dd>{formatarData(reserva.dataHoraInicio)}</dd>
              <dt>Horário</dt>
              <dd>
                {formatarHora(reserva.dataHoraInicio)} às {formatarHora(reserva.dataHoraFim)}
              </dd>
              <dt>Valor</dt>
              <dd>{formatarMoeda(reserva.valor)}</dd>
            </dl>
            <div className="form-actions">
              <Button type="button" variant="ghost" autoFocus onClick={aoFechar}>
                Fechar
              </Button>
            </div>
          </>
        )}
      </section>
    </div>,
    document.body,
  )
}

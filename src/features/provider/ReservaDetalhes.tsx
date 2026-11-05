import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Badge, Button } from '../../design-system/ui'
import {
  alterarStatusAgendamento,
  buscarAgendamento,
  type DetalhesAgendamento,
  type NovoStatusAgendamento,
} from '../../data/agendamentos'
import { ErroApi } from '../../data/api'
import { ReagendarReserva } from './ReagendarReserva'
import { mensagemFalhaReserva } from './reservaErros'
import { rotuloDoStatus } from '../../domain/appointmentStatus'

type AcaoStatus = {
  status: NovoStatusAgendamento
  rotulo: string
  sucesso: string
  secundaria?: boolean
}

const confirmar: AcaoStatus = {
  status: 'CONFIRMADO',
  rotulo: 'Confirmar',
  sucesso: 'Reserva confirmada.',
}
const concluir: AcaoStatus = {
  status: 'CONCLUIDO',
  rotulo: 'Concluir',
  sucesso: 'Reserva concluída.',
}
const cancelar: AcaoStatus = {
  status: 'CANCELADO',
  rotulo: 'Cancelar reserva',
  sucesso: 'Reserva cancelada.',
  secundaria: true,
}

// Espelha as transições aceitas pelo backend (StatusAgendamento).
const acoesPorStatus: Record<string, AcaoStatus[]> = {
  AGUARDANDO_CONFIRMACAO: [confirmar, cancelar],
  CONFIRMADO: [concluir, cancelar],
}

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
  aoAtualizar,
}: {
  estabelecimentoId: number
  agendamentoId: number
  aoFechar: () => void
  /** Chamado depois de uma alteração salva, para a tela de origem recarregar seus dados. */
  aoAtualizar?: () => void
}) {
  const [reserva, definirReserva] = useState<DetalhesAgendamento | null>(null)
  const [erro, definirErro] = useState('')
  const [tentativa, definirTentativa] = useState(0)
  const [executando, definirExecutando] = useState(false)
  const [confirmandoCancelamento, definirConfirmandoCancelamento] = useState(false)
  const [erroAcao, definirErroAcao] = useState('')
  const [feedback, definirFeedback] = useState('')
  const [reagendando, definirReagendando] = useState(false)

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

  async function executar(acao: AcaoStatus) {
    definirExecutando(true)
    definirErroAcao('')
    definirFeedback('')
    definirConfirmandoCancelamento(false)
    try {
      await alterarStatusAgendamento(estabelecimentoId, agendamentoId, acao.status)
      definirFeedback(acao.sucesso)
      aoAtualizar?.()
    } catch (falha) {
      definirErroAcao(
        falha instanceof ErroApi && falha.status === 400
          ? 'Esta ação não é permitida para o status atual da reserva.'
          : mensagemFalhaReserva(falha),
      )
    } finally {
      definirExecutando(false)
      // Recarrega para exibir o status que o backend guardou, tenha a ação funcionado ou não.
      definirTentativa((atual) => atual + 1)
    }
  }

  function aoReagendar() {
    definirReagendando(false)
    definirFeedback('Reserva reagendada.')
    definirErroAcao('')
    aoAtualizar?.()
    definirTentativa((atual) => atual + 1)
  }

  const acoes = reserva ? (acoesPorStatus[reserva.status] ?? []) : []

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
        <h2 id="reserva-dialog-title">
          {reagendando ? 'Reagendar reserva' : 'Detalhes da reserva'}
        </h2>
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
        ) : reagendando ? (
          <ReagendarReserva
            estabelecimentoId={estabelecimentoId}
            agendamentoId={agendamentoId}
            reserva={reserva}
            aoReagendar={aoReagendar}
            aoVoltar={() => definirReagendando(false)}
          />
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
            {feedback && (
              <p className="notice" role="status">
                {feedback}
              </p>
            )}
            {erroAcao && (
              <p className="auth-error" role="alert">
                {erroAcao}
              </p>
            )}
            {confirmandoCancelamento ? (
              <div className="form-actions">
                <span>Cancelar esta reserva?</span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={executando}
                  onClick={() => definirConfirmandoCancelamento(false)}
                >
                  Manter reserva
                </Button>
                <Button type="button" disabled={executando} onClick={() => void executar(cancelar)}>
                  Sim, cancelar
                </Button>
              </div>
            ) : (
              <div className="form-actions">
                <Button type="button" variant="ghost" autoFocus onClick={aoFechar}>
                  Fechar
                </Button>
                {acoes.map((acao) => (
                  <Button
                    key={acao.status}
                    type="button"
                    variant={acao.secundaria ? 'secondary' : 'primary'}
                    disabled={executando}
                    onClick={() =>
                      acao.status === 'CANCELADO'
                        ? definirConfirmandoCancelamento(true)
                        : void executar(acao)
                    }
                  >
                    {acao.rotulo}
                  </Button>
                ))}
                {acoes.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={executando}
                    onClick={() => {
                      definirFeedback('')
                      definirErroAcao('')
                      definirReagendando(true)
                    }}
                  >
                    Reagendar
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>,
    document.body,
  )
}

import { Link } from 'react-router-dom'
import { caminhos } from '../../app/paths'
import type { DetalhesAgendamento } from '../../data/agendamentos'
import { rotuloDoStatus } from '../../domain/appointmentStatus'
import { Badge, Card } from '../../design-system/ui'

const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatarHora = (data: Date) =>
  data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Tela exibida depois que o backend registrou a reserva: resumo, valor e atalho para a lista. */
export function ConfirmacaoDoAgendamento({
  detalhes,
  nomeCliente,
  caminhoDoEstabelecimento,
}: {
  detalhes: DetalhesAgendamento
  nomeCliente?: string
  caminhoDoEstabelecimento: string
}) {
  const confirmado = detalhes.status === 'CONFIRMADO'
  const inicio = new Date(detalhes.dataHoraInicio)
  const fim = new Date(detalhes.dataHoraFim)
  return (
    <Card className="confirmation confirmation-success">
      <div className="confirmation-header">
        <span className="confirmation-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" />
            <path d="m10.5 16.5 4 4 7-8" />
          </svg>
        </span>
        <div>
          <p className="eyebrow">Confirmação</p>
          <h2>{confirmado ? 'Agendamento confirmado!' : 'Detalhes do agendamento'}</h2>
          <p className="confirmation-intro">
            {confirmado
              ? `Seu horário está reservado em ${detalhes.estabelecimentoNome}.`
              : `Reserva em ${detalhes.estabelecimentoNome}.`}
          </p>
        </div>
      </div>
      <p className="confirmation-status" role="status">
        <span aria-hidden="true">i</span>
        Reserva nº {detalhes.id} registrada.
      </p>
      <dl className="summary confirmation-summary" aria-label="Detalhes da reserva">
        <div>
          <dt>Serviço</dt>
          <dd>{detalhes.servicoNome}</dd>
        </div>
        <div>
          <dt>Profissional</dt>
          <dd>{detalhes.profissionalNome}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{inicio.toLocaleDateString('pt-BR', { dateStyle: 'full' })}</dd>
        </div>
        <div>
          <dt>Horário</dt>
          <dd>
            {formatarHora(inicio)} às {formatarHora(fim)}
          </dd>
        </div>
        {nomeCliente && (
          <div>
            <dt>Cliente</dt>
            <dd>{nomeCliente}</dd>
          </div>
        )}
        <div>
          <dt>Status</dt>
          <dd>
            <Badge status={rotuloDoStatus(detalhes.status)} />
          </dd>
        </div>
        <div className="confirmation-total">
          <dt>Valor</dt>
          <dd>{formatarMoeda(detalhes.valor)}</dd>
        </div>
      </dl>
      <div className="form-actions confirmation-actions">
        <Link className="button secondary" to={caminhoDoEstabelecimento}>
          Voltar ao estabelecimento
        </Link>
        <Link className="button primary" to={caminhos.meusAgendamentos}>
          Ver meus agendamentos
        </Link>
      </div>
    </Card>
  )
}

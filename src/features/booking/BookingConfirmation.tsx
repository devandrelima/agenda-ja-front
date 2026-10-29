import { Link } from 'react-router-dom'
import type { AgendamentoRegistrado } from '../../data/agendamentos'
import { Card } from '../../design-system/ui'

const formatarHora = (data: Date) =>
  data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Tela exibida depois que o backend registrou a reserva: resumo, valor e atalho para a lista. */
export function ConfirmacaoDoAgendamento({
  agendamento,
  nomeEstabelecimento,
  nomeServico,
  nomeProfissional,
  nomeCliente,
  caminhoDoEstabelecimento,
}: {
  agendamento: AgendamentoRegistrado
  nomeEstabelecimento: string
  nomeServico: string
  nomeProfissional: string
  nomeCliente: string
  caminhoDoEstabelecimento: string
}) {
  const inicio = new Date(agendamento.dataHoraInicio)
  const fim = new Date(agendamento.dataHoraFim)
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
          <h2>Agendamento confirmado!</h2>
          <p className="confirmation-intro">Seu horário está reservado em {nomeEstabelecimento}.</p>
        </div>
      </div>
      <p className="confirmation-status" role="status">
        <span aria-hidden="true">i</span>
        Reserva nº {agendamento.id} registrada.
      </p>
      <dl className="summary confirmation-summary" aria-label="Detalhes da reserva">
        <div>
          <dt>Serviço</dt>
          <dd>{nomeServico}</dd>
        </div>
        <div>
          <dt>Profissional</dt>
          <dd>{nomeProfissional}</dd>
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
        <div>
          <dt>Cliente</dt>
          <dd>{nomeCliente}</dd>
        </div>
      </dl>
      <div className="form-actions confirmation-actions">
        <Link className="button secondary" to={caminhoDoEstabelecimento}>
          Voltar ao estabelecimento
        </Link>
      </div>
    </Card>
  )
}

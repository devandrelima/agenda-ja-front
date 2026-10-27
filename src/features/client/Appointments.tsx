import { Link } from 'react-router-dom'
import { Logo } from '../../design-system/ui'
import { caminhos } from '../../app/paths'

// O backend ainda não oferece listagem, alteração ou cancelamento por cliente.
// Trocar esta lista pela resposta da API quando esses endpoints existirem.
const agendamentosMock = [
  { id: 'studio-marina', estabelecimento: 'Studio Marina' },
  { id: 'vivian-unhas', estabelecimento: 'Vivian Unhas' },
]

export function MeusAgendamentos() {
  return (
    <main className="client-appointments-page">
      <section className="client-appointments-shell" aria-labelledby="client-appointments-title">
        <header className="client-appointments-header">
          <Logo />
          <span className="client-avatar" aria-label="Perfil do cliente" role="img">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c.8-4.1 3.5-6.2 8-6.2s7.2 2.1 8 6.2" />
            </svg>
          </span>
        </header>

        <div className="client-appointments-intro">
          <h1 id="client-appointments-title">Seus agendamentos</h1>
          <p>Altere ou cancele quando precisar.</p>
        </div>

        <ul className="client-appointments-list" aria-label="Estabelecimentos com agendamento">
          {agendamentosMock.map((agendamento) => (
            <li key={agendamento.id}>
              <button type="button" aria-label={`Ver agendamento em ${agendamento.estabelecimento}`}>
                <strong>{agendamento.estabelecimento}</strong>
                <span aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>

        <Link className="client-new-booking" to={caminhos.estabelecimento}>
          <span>Novo Agendamento</span>
          <span aria-hidden="true">+</span>
        </Link>

        <div className="client-appointment-actions" aria-hidden="true">
          <button type="button" disabled>
            Confirmar
          </button>
          <button type="button" disabled>
            Cancelar
          </button>
        </div>
      </section>
    </main>
  )
}

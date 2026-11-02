import { Link } from 'react-router-dom'
import { Logo } from '../../design-system/ui'
import { negociosDoCatalogo, type NegocioDoCatalogo } from '../../data/businessCatalog'
import { listarMeusAgendamentos } from '../../data/clientAppointments'
import { useLogoDoNegocio } from '../../data/businessLogo'
import { caminhos } from '../../app/paths'

function AvatarDoNegocio({ negocio }: { negocio: NegocioDoCatalogo }) {
  const logoLocal = useLogoDoNegocio(negocio.id)
  const logo = logoLocal ?? negocio.logoUrl
  return logo ? (
    <img className="business-avatar" src={logo} alt={`Logo do ${negocio.nome}`} />
  ) : (
    <span className="business-avatar business-avatar-fallback" aria-hidden="true">
      {negocio.nome.slice(0, 1)}
    </span>
  )
}

function LinhaDeNegocio({ negocio }: { negocio: NegocioDoCatalogo }) {
  return (
    <li>
      <Link to={`/estabelecimento/${negocio.publicId}/agendar`}>
        <AvatarDoNegocio negocio={negocio} />
        <span className="business-picker-copy">
          <strong>{negocio.nome}</strong>
          <small>{negocio.categoria}</small>
          <small className="business-picker-rating">
            {negocio.mediaAvaliacoes.toLocaleString('pt-BR')} ★ · {negocio.quantidadeAvaliacoes}{' '}
            {negocio.quantidadeAvaliacoes === 1 ? 'comentário' : 'comentários'}
          </small>
        </span>
        <span className="business-picker-arrow" aria-hidden="true">›</span>
      </Link>
    </li>
  )
}

export function EscolherNegocioParaAgendar() {
  const idsAgendados = new Set(listarMeusAgendamentos().map((agendamento) => agendamento.publicId))
  const jaAgendados = negociosDoCatalogo.filter((negocio) => idsAgendados.has(negocio.publicId))
  const outros = negociosDoCatalogo.filter((negocio) => !idsAgendados.has(negocio.publicId))

  return (
    <main className="business-picker-page">
      <section className="business-picker-shell" aria-labelledby="business-picker-title">
        <header className="client-appointments-header"><Logo /></header>
        <Link className="client-back" to={caminhos.meusAgendamentos}>← Seus agendamentos</Link>
        <div className="business-picker-intro">
          <h1 id="business-picker-title">Novo agendamento</h1>
          <p>Escolha onde você quer agendar.</p>
        </div>
        {jaAgendados.length > 0 && (
          <section aria-labelledby="previous-businesses-title">
            <h2 id="previous-businesses-title">Já fiz agendamento</h2>
            <ul className="business-picker-list">{jaAgendados.map((negocio) => <LinhaDeNegocio key={negocio.id} negocio={negocio} />)}</ul>
          </section>
        )}
        <section aria-labelledby="all-businesses-title">
          <h2 id="all-businesses-title">Outros negócios</h2>
          <ul className="business-picker-list">{outros.map((negocio) => <LinhaDeNegocio key={negocio.id} negocio={negocio} />)}</ul>
        </section>
      </section>
    </main>
  )
}

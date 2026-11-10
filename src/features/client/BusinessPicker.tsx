import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../design-system/ui'
import { listarMeusAgendamentos } from '../../data/clientAppointments'
import { listarEstabelecimentosPublicos, type EstabelecimentoResumoPublico } from '../../data/publicEstablishments'
import { caminhos } from '../../app/paths'

function AvatarDoNegocio({ negocio }: { negocio: EstabelecimentoResumoPublico }) {
  return negocio.logoUrl ? (
    <img className="business-avatar" src={negocio.logoUrl} alt={`Logo do ${negocio.nome}`} />
  ) : (
    <span className="business-avatar business-avatar-fallback" aria-hidden="true">
      {negocio.nome.slice(0, 1)}
    </span>
  )
}

function LinhaDeNegocio({ negocio }: { negocio: EstabelecimentoResumoPublico }) {
  return (
    <li>
      <Link to={`/estabelecimento/${negocio.publicId}`}>
        <AvatarDoNegocio negocio={negocio} />
        <span className="business-picker-copy">
          <strong>{negocio.nome}</strong>
          <small>{negocio.categoria}</small>
          <small className="business-picker-rating">{negocio.quantidadeAvaliacoes > 0
            ? `${negocio.mediaAvaliacoes.toLocaleString('pt-BR')} ★ · ${negocio.quantidadeAvaliacoes} ${negocio.quantidadeAvaliacoes === 1 ? 'comentário' : 'comentários'}`
            : 'Novo no AgendaJá'}</small>
        </span>
        <span className="business-picker-arrow" aria-hidden="true">›</span>
      </Link>
    </li>
  )
}

export function EscolherNegocioParaAgendar() {
  const [idsAgendados, definirIdsAgendados] = useState<Set<string>>(new Set())
  const [negocios, definirNegocios] = useState<EstabelecimentoResumoPublico[]>([])
  const [carregando, definirCarregando] = useState(true)
  const [erro, definirErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([listarMeusAgendamentos(), listarEstabelecimentosPublicos()])
      .then(([agendamentos, estabelecimentos]) => {
        if (!ativo) return
        definirIdsAgendados(new Set(agendamentos.map((agendamento) => agendamento.publicId)))
        definirNegocios(estabelecimentos)
      })
      .catch((falha) => {
        if (ativo)
          definirErro(falha instanceof Error ? falha.message : 'Não foi possível carregar seus agendamentos.')
      })
      .finally(() => { if (ativo) definirCarregando(false) })
    return () => {
      ativo = false
    }
  }, [])
  const jaAgendados = negocios.filter((negocio) => idsAgendados.has(negocio.publicId))
  const outros = negocios.filter((negocio) => !idsAgendados.has(negocio.publicId))

  return (
    <main className="business-picker-page">
      <section className="business-picker-shell" aria-labelledby="business-picker-title">
        <header className="client-appointments-header"><Logo /></header>
        <Link className="client-back" to={caminhos.meusAgendamentos}>← Seus agendamentos</Link>
        <div className="business-picker-intro">
          <h1 id="business-picker-title">Novo agendamento</h1>
          <p>Escolha onde você quer agendar.</p>
        </div>
        {erro && <p className="auth-error" role="alert">{erro}</p>}
        {carregando && <p role="status">Carregando negócios...</p>}
        {jaAgendados.length > 0 && (
          <section aria-labelledby="previous-businesses-title">
            <h2 id="previous-businesses-title">Já fiz agendamento</h2>
            <ul className="business-picker-list">{jaAgendados.map((negocio) => <LinhaDeNegocio key={negocio.id} negocio={negocio} />)}</ul>
          </section>
        )}
        {!carregando && <section aria-labelledby="all-businesses-title">
          <h2 id="all-businesses-title">Outros negócios</h2>
          <ul className="business-picker-list">{outros.map((negocio) => <LinhaDeNegocio key={negocio.id} negocio={negocio} />)}</ul>
        </section>}
      </section>
    </main>
  )
}

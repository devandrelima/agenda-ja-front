import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ErroApi } from '../../data/api'
import {
  buscarEstabelecimentoPublico,
  identificadorPublicoValido,
  listarServicosPublicos,
  eventoConfiguracaoAtualizada,
} from '../../data/publicEstablishment'
import type { EstabelecimentoPublico } from '../../data/publicEstablishment'
import type { Servico } from '../../data/services'
import { nomesDias, resumirHorario } from '../../data/businessHours'
import { MarcaAgendaJa, PaginaEstabelecimento } from './Booking'
import { PaginaAvaliacoes } from '../reviews/Reviews'

const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ErroLinkPublico({ mensagem }: { mensagem: string }) {
  return (
    <main className="public-state" role="alert">
      <h1>{mensagem}</h1>
      <Link to="/login">Ir para a página inicial</Link>
    </main>
  )
}

export function PaginaEstabelecimentoPublico() {
  const { estabelecimentoId: publicId } = useParams()
  const [resultado, definirResultado] = useState<{
    publicId: string
    estabelecimento?: EstabelecimentoPublico
    erro?: string
  } | null>(null)

  useEffect(() => {
    if (!publicId || !identificadorPublicoValido(publicId)) return

    let ativo = true
    const carregar = () => {
      buscarEstabelecimentoPublico(publicId)
        .then((dados) => {
          if (ativo) definirResultado({ publicId, estabelecimento: dados })
        })
        .catch((falha: unknown) => {
          if (ativo)
            definirResultado({
              publicId,
              erro:
                falha instanceof ErroApi && falha.status === 404
                  ? 'Estabelecimento não encontrado.'
                  : 'Não foi possível carregar este estabelecimento. Tente novamente.',
            })
        })
    }
    const outraAba = (evento: StorageEvent) => {
      if (evento.key === eventoConfiguracaoAtualizada) carregar()
    }
    carregar()
    window.addEventListener(eventoConfiguracaoAtualizada, carregar)
    window.addEventListener('storage', outraAba)
    return () => {
      ativo = false
      window.removeEventListener(eventoConfiguracaoAtualizada, carregar)
      window.removeEventListener('storage', outraAba)
    }
  }, [publicId])

  if (!publicId || !identificadorPublicoValido(publicId))
    return <ErroLinkPublico mensagem="Estabelecimento não encontrado." />

  if (resultado?.publicId !== publicId)
    return (
      <main className="public-state" role="status">
        Carregando estabelecimento...
      </main>
    )

  if (resultado.erro || !resultado.estabelecimento)
    return <ErroLinkPublico mensagem={resultado.erro || 'Estabelecimento não encontrado.'} />

  const estabelecimento = resultado.estabelecimento
  return (
    <PaginaEstabelecimento
      dados={{
        nome: estabelecimento.nome,
        categoria: estabelecimento.categoria,
        endereco: estabelecimento.localizacao,
        imagemUrl: estabelecimento.imagemUrl,
      }}
      rotaBase={`/estabelecimento/${publicId}`}
      identificadorPublico={publicId}
    />
  )
}

export function PaginaAvaliacoesPublicas() {
  const { estabelecimentoId: publicId } = useParams()
  const [resultado, definirResultado] = useState<{ publicId: string; erro?: string } | null>(null)

  useEffect(() => {
    if (!publicId || !identificadorPublicoValido(publicId)) return

    let ativo = true
    buscarEstabelecimentoPublico(publicId)
      .then(() => {
        if (ativo) definirResultado({ publicId })
      })
      .catch((falha: unknown) => {
        if (ativo)
          definirResultado({
            publicId,
            erro:
              falha instanceof ErroApi && falha.status === 404
                ? 'Estabelecimento não encontrado.'
                : 'Não foi possível carregar este estabelecimento. Tente novamente.',
          })
      })
    return () => {
      ativo = false
    }
  }, [publicId])

  if (!publicId || !identificadorPublicoValido(publicId))
    return <ErroLinkPublico mensagem="Estabelecimento não encontrado." />

  if (resultado?.publicId !== publicId)
    return (
      <main className="public-state" role="status">
        Carregando avaliações...
      </main>
    )

  if (resultado.erro) return <ErroLinkPublico mensagem={resultado.erro} />

  return (
    <PaginaAvaliacoes identificadorPublico={publicId} rotaBase={`/estabelecimento/${publicId}`} />
  )
}

export function ProximaEtapaPublica({ etapa }: { etapa: 'servicos' | 'agendar' }) {
  const { estabelecimentoId: publicId } = useParams()
  const [parametros, definirParametros] = useSearchParams()
  const [resultado, definirResultado] = useState<{
    publicId: string
    estabelecimento?: EstabelecimentoPublico
    servicos?: Servico[]
    erro?: string
  } | null>(null)

  useEffect(() => {
    if (!publicId || !identificadorPublicoValido(publicId)) return

    let ativo = true
    buscarEstabelecimentoPublico(publicId)
      .then(async (estabelecimento) => {
        const servicos = await listarServicosPublicos(estabelecimento.id)
        if (ativo) definirResultado({ publicId, estabelecimento, servicos })
      })
      .catch((falha: unknown) => {
        if (ativo)
          definirResultado({
            publicId,
            erro:
              falha instanceof ErroApi && falha.status === 404
                ? 'Estabelecimento não encontrado.'
                : 'Não foi possível carregar os serviços. Tente novamente.',
          })
      })
    return () => {
      ativo = false
    }
  }, [publicId])

  if (!publicId || !identificadorPublicoValido(publicId))
    return <ErroLinkPublico mensagem="Estabelecimento não encontrado." />

  if (resultado?.publicId !== publicId)
    return (
      <main className="public-state" role="status">
        Carregando serviços...
      </main>
    )

  if (resultado.erro || !resultado.estabelecimento || !resultado.servicos)
    return <ErroLinkPublico mensagem={resultado.erro || 'Estabelecimento não encontrado.'} />

  const rotaBase = `/estabelecimento/${publicId}`
  const servicoSelecionado = resultado.servicos.find(
    (servico) => String(servico.id) === parametros.get('servico'),
  )

  return (
    <main className="public-services-page">
      <section className="public-services-shell">
        <header className="availability-header">
          <Link
            className="availability-back"
            to={rotaBase}
            aria-label="Voltar para a página do estabelecimento"
          >
            ‹
          </Link>
          <MarcaAgendaJa />
        </header>

        <div className="public-services-heading">
          <p>{resultado.estabelecimento.nome}</p>
          <h1>{etapa === 'servicos' ? 'Horários de funcionamento' : 'Escolha o serviço'}</h1>
          {etapa === 'agendar' && <p>Confira a duração e o preço de cada atendimento.</p>}
        </div>

        {etapa === 'servicos' && (
          <>
            <section aria-label="Horários da semana">
              <ul className="availability-list">
                {resultado.estabelecimento.horariosFuncionamento?.map((dia, indice) => (
                  <li key={nomesDias[indice]}>
                    <strong>{nomesDias[indice]}</strong>
                    <span>{resumirHorario(dia)}</span>
                  </li>
                ))}
              </ul>
            </section>
            <h2 className="public-services-section-title">Serviços</h2>
          </>
        )}

        {resultado.servicos.length === 0 ? (
          <p className="public-services-empty">Nenhum serviço disponível no momento.</p>
        ) : (
          <ul className="public-services-list">
            {resultado.servicos.map((servico) => (
              <li key={servico.id}>
                {etapa === 'servicos' ? (
                  <article className="public-service-card">
                    <div>
                      <h2>{servico.nome}</h2>
                      <p>{servico.duracaoMinutos} min</p>
                    </div>
                    <strong>{formatarMoeda(servico.valor)}</strong>
                  </article>
                ) : (
                  <button
                    className={`public-service-card public-service-option${servicoSelecionado?.id === servico.id ? ' selected' : ''}`}
                    type="button"
                    aria-pressed={servicoSelecionado?.id === servico.id}
                    onClick={() => definirParametros({ servico: String(servico.id) })}
                  >
                    <span>
                      <strong>{servico.nome}</strong>
                      <small>{servico.duracaoMinutos} min</small>
                    </span>
                    <strong>{formatarMoeda(servico.valor)}</strong>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {etapa === 'agendar' && servicoSelecionado && (
          <p className="public-service-selection" role="status">
            Serviço selecionado: <strong>{servicoSelecionado.nome}</strong>
          </p>
        )}
      </section>
    </main>
  )
}

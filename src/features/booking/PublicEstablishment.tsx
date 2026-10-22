import { useEffect, useState, type ReactElement } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
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
import { caminhos } from '../../app/paths'
import { Steps } from '../../design-system/ui'
import { Agendamento, MarcaAgendaJa, PaginaEstabelecimento } from './Booking'
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

type ResultadoServicos = {
  publicId: string
  estabelecimento?: EstabelecimentoPublico
  servicos?: Servico[]
  erro?: string
}

/**
 * Carrega o estabelecimento do link público e seus serviços. Enquanto não há dados, `tela` traz o
 * estado de carregamento ou de erro a exibir no lugar da página.
 */
function useServicosDoEstabelecimento(
  publicId: string | undefined,
):
  | { estabelecimento: EstabelecimentoPublico; servicos: Servico[]; tela?: undefined }
  | { estabelecimento?: undefined; servicos?: undefined; tela: ReactElement } {
  const [resultado, definirResultado] = useState<ResultadoServicos | null>(null)

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
    return { tela: <ErroLinkPublico mensagem="Estabelecimento não encontrado." /> }

  if (resultado?.publicId !== publicId)
    return {
      tela: (
        <main className="public-state" role="status">
          Carregando serviços...
        </main>
      ),
    }

  if (resultado.erro || !resultado.estabelecimento || !resultado.servicos)
    return {
      tela: <ErroLinkPublico mensagem={resultado.erro || 'Estabelecimento não encontrado.'} />,
    }

  return { estabelecimento: resultado.estabelecimento, servicos: resultado.servicos }
}

export function ProximaEtapaPublica({ etapa }: { etapa: 'servicos' | 'agendar' }) {
  const { estabelecimentoId: publicId } = useParams()
  const localizacao = useLocation()
  const [parametros, definirParametros] = useSearchParams()
  const resultado = useServicosDoEstabelecimento(publicId)
  if (!resultado.estabelecimento) return resultado.tela

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
            to={localizacao.state?.origem === 'painel' ? caminhos.painel : rotaBase}
            aria-label={
              localizacao.state?.origem === 'painel'
                ? 'Voltar ao painel'
                : 'Voltar para a página do estabelecimento'
            }
          >
            ‹
          </Link>
          <MarcaAgendaJa />
        </header>
        {etapa === 'agendar' && (
          <div className="public-steps">
            <Steps step={1} />
          </div>
        )}

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
                    onClick={() =>
                      definirParametros(
                        { servico: String(servico.id) },
                        { state: localizacao.state },
                      )
                    }
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
        {etapa === 'agendar' && servicoSelecionado && (
          <Link
            className="button primary public-service-continue"
            to={`${rotaBase}/agendar/profissional?servico=${servicoSelecionado.id}`}
            state={localizacao.state}
          >
            Continuar
          </Link>
        )}
      </section>
    </main>
  )
}

/** Etapas seguintes ao serviço (profissional, data e horário, dados), numa página própria. */
export function AgendamentoPublico() {
  const { estabelecimentoId: publicId } = useParams()
  const localizacao = useLocation()
  const [parametros] = useSearchParams()
  const resultado = useServicosDoEstabelecimento(publicId)
  if (!resultado.estabelecimento) return resultado.tela

  const rotaBase = `/estabelecimento/${publicId}`
  const servico = resultado.servicos.find((item) => String(item.id) === parametros.get('servico'))
  if (!servico) return <Navigate to={`${rotaBase}/agendar`} state={localizacao.state} replace />

  const caminhoDoServico = `${rotaBase}/agendar?servico=${servico.id}`
  return (
    <main className="public-services-page">
      <section className="public-services-shell">
        <header className="availability-header">
          <Link
            className="availability-back"
            to={caminhoDoServico}
            state={localizacao.state}
            aria-label="Voltar para a escolha do serviço"
          >
            ‹
          </Link>
          <MarcaAgendaJa />
        </header>
        <Agendamento
          key={servico.id}
          publico={{
            estabelecimentoId: String(resultado.estabelecimento.id),
            servico: {
              id: String(servico.id),
              nome: servico.nome,
              duracao: servico.duracaoMinutos,
              valor: Number(servico.valor),
            },
            rotaBase,
            caminhoDoServico,
          }}
        />
      </section>
    </main>
  )
}

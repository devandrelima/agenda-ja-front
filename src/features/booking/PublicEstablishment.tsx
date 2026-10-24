import { useEffect, useState, type ReactElement } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { ErroApi } from '../../data/api'
import {
  buscarEstabelecimentoPublico,
  identificadorPublicoValido,
  listarServicosPublicos,
  eventoConfiguracaoAtualizada,
} from '../../data/publicEstablishment'
import type { EstabelecimentoPublico } from '../../data/publicEstablishment'
import type { Servico } from '../../data/services'
import type { EscolhasAgendamento } from '../../domain/models'
import { etapaDisponivel } from '../../domain/bookingProgress'
import { nomesDias, resumirHorario } from '../../data/businessHours'
import { caminhos } from '../../app/paths'
import { Card, Steps } from '../../design-system/ui'
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
  dadosAnteriores?: ResultadoServicos,
):
  | { estabelecimento: EstabelecimentoPublico; servicos: Servico[]; tela?: undefined }
  | { estabelecimento?: undefined; servicos?: undefined; tela: ReactElement } {
  const [resultado, definirResultado] = useState<ResultadoServicos | null>(
    dadosAnteriores && dadosAnteriores.publicId === publicId ? dadosAnteriores : null,
  )

  useEffect(() => {
    if (!publicId || !identificadorPublicoValido(publicId)) return
    if (
      dadosAnteriores?.publicId === publicId &&
      dadosAnteriores.estabelecimento &&
      dadosAnteriores.servicos
    )
      return

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
  }, [publicId, dadosAnteriores])

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
  const navegar = useNavigate()
  const [parametros, definirParametros] = useSearchParams()
  const dadosAnteriores = localizacao.state?.dadosAgendamentoPublico as
    ResultadoServicos | undefined
  const resultado = useServicosDoEstabelecimento(publicId, dadosAnteriores)
  if (!resultado.estabelecimento) return resultado.tela

  const dadosAgendamentoPublico = {
    publicId: publicId!,
    estabelecimento: resultado.estabelecimento,
    servicos: resultado.servicos,
  }

  const rotaBase = `/estabelecimento/${publicId}`
  const servicoSelecionado = resultado.servicos.find(
    (servico) => String(servico.id) === parametros.get('servico'),
  )
  const escolhasAnteriores = localizacao.state?.escolhasAgendamento as
    EscolhasAgendamento | undefined
  const maxStep = servicoSelecionado
    ? Math.max(
        2,
        escolhasAnteriores?.idServico === String(servicoSelecionado.id)
          ? etapaDisponivel(escolhasAnteriores)
          : 2,
      )
    : 1

  function navegarPelasEtapas(destino: number) {
    if (!servicoSelecionado || destino < 2 || destino > maxStep) return
    navegar(`${rotaBase}/agendar/profissional?servico=${servicoSelecionado.id}`, {
      state: { ...localizacao.state, dadosAgendamentoPublico, etapaDestino: destino },
    })
  }

  if (etapa === 'agendar') {
    const vemDoPainel = localizacao.state?.origem === 'painel'
    return (
      <main className="booking container">
        <div className="booking-main">
          <Link to={vemDoPainel ? caminhos.painel : rotaBase}>
            {vemDoPainel ? '← Voltar ao painel' : `← ${resultado.estabelecimento.nome}`}
          </Link>
          <h1>Fazer agendamento</h1>
          <Steps step={1} maxStep={maxStep} onStepClick={navegarPelasEtapas} />
          <Card>
            <h2>Escolha o serviço</h2>
            {resultado.servicos.length === 0 ? (
              <p>Nenhum serviço disponível no momento.</p>
            ) : (
              resultado.servicos.map((servico) => (
                <button
                  className={`option ${servicoSelecionado?.id === servico.id ? 'selected' : ''}`}
                  type="button"
                  aria-pressed={servicoSelecionado?.id === servico.id}
                  onClick={() =>
                    definirParametros(
                      { servico: String(servico.id) },
                      {
                        state: {
                          ...localizacao.state,
                          dadosAgendamentoPublico,
                          escolhasAgendamento:
                            servicoSelecionado?.id === servico.id ? escolhasAnteriores : undefined,
                          etapaDestino: undefined,
                        },
                      },
                    )
                  }
                  key={servico.id}
                >
                  <span>
                    <strong>{servico.nome}</strong>
                    <br />
                    <small>{servico.duracaoMinutos} min</small>
                  </span>
                  <strong>{formatarMoeda(servico.valor)}</strong>
                </button>
              ))
            )}
            {servicoSelecionado && (
              <div className="form-actions form-actions-end">
                <Link
                  className="button primary"
                  to={`${rotaBase}/agendar/profissional?servico=${servicoSelecionado.id}`}
                  state={{ ...localizacao.state, dadosAgendamentoPublico, etapaDestino: 2 }}
                >
                  Continuar
                </Link>
              </div>
            )}
          </Card>
        </div>
      </main>
    )
  }

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
          <h1>Horários de funcionamento</h1>
        </div>

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

        {resultado.servicos.length === 0 ? (
          <p className="public-services-empty">Nenhum serviço disponível no momento.</p>
        ) : (
          <ul className="public-services-list">
            {resultado.servicos.map((servico) => (
              <li key={servico.id}>
                <article className="public-service-card">
                  <div>
                    <h2>{servico.nome}</h2>
                    <p>{servico.duracaoMinutos} min</p>
                  </div>
                  <strong>{formatarMoeda(servico.valor)}</strong>
                </article>
              </li>
            ))}
          </ul>
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
  const dadosAnteriores = localizacao.state?.dadosAgendamentoPublico as
    ResultadoServicos | undefined
  const resultado = useServicosDoEstabelecimento(publicId, dadosAnteriores)
  if (!resultado.estabelecimento) return resultado.tela

  const rotaBase = `/estabelecimento/${publicId}`
  const servico = resultado.servicos.find((item) => String(item.id) === parametros.get('servico'))
  if (!servico) return <Navigate to={`${rotaBase}/agendar`} state={localizacao.state} replace />

  return (
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
        nomeEstabelecimento: resultado.estabelecimento.nome,
        rotaBase,
        caminhoDoServico: `${rotaBase}/agendar?servico=${servico.id}`,
      }}
    />
  )
}

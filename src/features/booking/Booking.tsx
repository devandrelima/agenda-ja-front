import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { repositorioMock } from '../../data/mockRepository'
import { listarHorariosDisponiveis } from '../../data/publicAvailability'
import { listarProfissionaisDoServico } from '../../data/publicProfessionals'
import {
  adicionarDias,
  buscarHorariosDeQualquerProfissional,
  buscarHorariosDisponiveis,
  buscarProfissionaisDoServico,
  paraChaveData,
} from '../../domain/availability'
import type { Avaliacao, EscolhasAgendamento, Profissional, Servico } from '../../domain/models'
import { emailValido, telefoneValido } from '../../domain/contact'
import { Button, Card, Field, PhoneField, Steps } from '../../design-system/ui'
import { caminhos } from '../../app/paths'
import { resumoAvaliacoes, useAvaliacoesDemo } from '../../data/demoReviews'
import { nomesDias, resumirHorario, useHorariosFuncionamento } from '../../data/businessHours'
import { useCapaNegocio } from '../../data/businessCover'
import { useDadosNegocioDemo } from '../../data/businessProfile'
import imagemPlaceholder from '../../assets/placeholder-imagem.svg'
const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function MarcaAgendaJa() {
  return (
    <div className="presentation-brand" aria-label="AgendaJá">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="5" y="7" width="18" height="19" rx="3" />
        <path d="M10 4v6m8-6v6M5 13h18m-13 5h4m-4 4h4" />
        <circle cx="24" cy="24" r="6" />
        <path d="M24 20.5V24l2.5 1.5" />
      </svg>
      <strong>AgendaJá</strong>
    </div>
  )
}

export type DadosPaginaEstabelecimento = {
  nome: string
  categoria: string
  endereco: string
  imagemUrl?: string | null
  avaliacoes?: Avaliacao[]
}

export function PaginaEstabelecimento({
  dados,
  rotaBase = caminhos.estabelecimento,
  identificadorPublico,
}: {
  dados?: DadosPaginaEstabelecimento
  rotaBase?: string
  identificadorPublico?: string
}) {
  const avaliacoesLocais = useAvaliacoesDemo(identificadorPublico)
  const capaDemo = useCapaNegocio()
  const dadosNegocioDemo = useDadosNegocioDemo()
  const estabelecimento = dados ?? {
    ...repositorioMock.buscarEstabelecimento(),
    ...(dadosNegocioDemo
      ? {
          nome: dadosNegocioDemo.nome,
          categoria: dadosNegocioDemo.categoria,
          endereco: dadosNegocioDemo.localizacao,
        }
      : {}),
  }
  const avaliacoes = dados?.avaliacoes ?? avaliacoesLocais
  const { quantidade: quantidadeAvaliacoes, media: avaliacaoMedia } = resumoAvaliacoes(avaliacoes)
  const rotuloAvaliacoes = quantidadeAvaliacoes === 1 ? 'avaliação' : 'avaliações'
  const caminhoAvaliacoes = `${rotaBase}/avaliacoes`
  const imagemUrl = dados ? dados.imagemUrl : capaDemo
  const caminhoServicos = dados ? `${rotaBase}/servicos` : caminhos.disponibilidade
  const caminhoAgendamento = dados ? `${rotaBase}/agendar` : caminhos.agendamento
  return (
    <main className="public-presentation">
      <section className="presentation-shell" aria-labelledby="business-name">
        <MarcaAgendaJa />

        <div className="presentation-intro">
          <p className="public-business-category">{estabelecimento.categoria}</p>
          <h1 id="business-name">{estabelecimento.nome}</h1>
          <p>Escolha um horário sem precisar enviar mensagem.</p>
        </div>

        <div className="presentation-overview">
          {imagemUrl ? (
            <img
              className="presentation-photo"
              src={imagemUrl}
              alt={`Foto do ${estabelecimento.nome}`}
            />
          ) : (
            <img className="presentation-photo" src={imagemPlaceholder} alt="Foto indisponível" />
          )}
          <div className="presentation-ratings">
            <Link
              className="rating-score"
              to={caminhoAvaliacoes}
              aria-label={`Ver avaliações, média ${avaliacaoMedia.toLocaleString('pt-BR')} de 5 estrelas`}
            >
              {avaliacaoMedia.toLocaleString('pt-BR')} <span aria-hidden="true">★</span>
            </Link>
            <Link className="rating-count" to={caminhoAvaliacoes}>
              <strong>{quantidadeAvaliacoes}</strong> {rotuloAvaliacoes}
            </Link>
          </div>
        </div>

        <a
          className="presentation-info-card"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            estabelecimento.endereco,
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z" />
            <circle cx="12" cy="9" r="2.25" />
          </svg>
          <span>{estabelecimento.endereco}</span>
          <span className="presentation-arrow" aria-hidden="true">
            ›
          </span>
        </a>

        <Link className="presentation-info-card" to={caminhoServicos}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="14" height="16" rx="2" />
            <path d="M7 3v4m6-4v4M6 11h8m-8 4h5m-5 3h4" />
            <circle cx="18" cy="18" r="3" />
            <path d="m20.2 20.2 1.8 1.8" />
          </svg>
          <span>Ver horários e serviços</span>
          <span className="presentation-arrow" aria-hidden="true">
            ›
          </span>
        </Link>

        <div className="presentation-actions">
          <Link
            className="presentation-action"
            to={caminhoAgendamento}
            state={{ origem: 'apresentacao' }}
          >
            Fazer primeiro agendamento
          </Link>
          <Link
            className="presentation-action"
            to={caminhoAgendamento}
            state={{ origem: 'apresentacao' }}
          >
            Já sou cliente
          </Link>
        </div>
      </section>
    </main>
  )
}
export function Disponibilidade() {
  const servicos = repositorioMock.buscarServicos()
  const horarios = useHorariosFuncionamento()

  return (
    <main className="availability-page">
      <section className="availability-shell" aria-labelledby="availability-title">
        <header className="availability-header">
          <Link
            className="availability-back"
            to={caminhos.estabelecimento}
            aria-label="Voltar para a página do estabelecimento"
          >
            ‹
          </Link>
          <MarcaAgendaJa />
        </header>

        <h1 id="availability-title">Horários de funcionamento</h1>
        <section aria-label="Horários da semana">
          <ul className="availability-list">
            {horarios.map((horario, indice) => (
              <li key={nomesDias[indice]}>
                <strong>{nomesDias[indice]}</strong>
                <span>{resumirHorario(horario)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="availability-services" aria-labelledby="services-title">
          <h2 id="services-title">Serviços</h2>
          <ul className="availability-list">
            {servicos.map((servico) => (
              <li key={servico.id}>
                <strong>{servico.nome}</strong>
                <span>{formatarMoeda(servico.valor)}</span>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  )
}
type Carregamento<T> = { dados?: T; carregando: boolean; erro: string; tentarNovamente: () => void }

/**
 * Busca dados no backend. `chave` identifica a consulta (`null` = nada a buscar); ao mudar, a
 * consulta é refeita e o resultado antigo é descartado.
 */
function useDadosRemotos<T>(
  chave: string | null,
  buscar: () => Promise<T>,
  mensagemDeErro: string,
): Carregamento<T> {
  const [tentativa, definirTentativa] = useState(0)
  const [resultado, definirResultado] = useState<{
    chave: string
    dados?: T
    erro?: string
  } | null>(null)
  const chaveCompleta = chave === null ? null : `${chave}/${tentativa}`

  useEffect(() => {
    if (chaveCompleta === null) return
    let ativo = true
    buscar()
      .then((dados) => {
        if (ativo) definirResultado({ chave: chaveCompleta, dados })
      })
      .catch(() => {
        if (ativo) definirResultado({ chave: chaveCompleta, erro: mensagemDeErro })
      })
    return () => {
      ativo = false
    }
    // `buscar` é recriada a cada renderização; `chaveCompleta` já identifica a consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveCompleta])

  const atual = resultado?.chave === chaveCompleta ? resultado : null
  return {
    dados: atual?.dados,
    carregando: chaveCompleta !== null && !atual,
    erro: atual?.erro ?? '',
    tentarNovamente: () => definirTentativa((valor) => valor + 1),
  }
}

function MensagemDeCarga({
  carregamento,
  texto,
}: {
  carregamento: Carregamento<unknown>
  texto: string
}) {
  if (carregamento.carregando) return <p role="status">{texto}</p>
  if (!carregamento.erro) return null
  return (
    <>
      <p className="auth-error" role="alert">
        {carregamento.erro}
      </p>
      <Button type="button" variant="secondary" onClick={carregamento.tentarNovamente}>
        Tentar novamente
      </Button>
    </>
  )
}

const SEM_PROFISSIONAIS: Profissional[] = []

/**
 * Assistente de agendamento. Com `publico`, continua a escolha de serviço feita na página pública
 * (`ProximaEtapaPublica`): começa no profissional, volta ao serviço por `caminhoDoServico` e
 * consulta o backend; sem ele, usa o mock.
 */
export function Agendamento({
  publico,
}: {
  publico?: {
    estabelecimentoId: string
    servico: Servico
    nomeEstabelecimento: string
    rotaBase: string
    caminhoDoServico: string
  }
}) {
  const estabelecimentoId = publico?.estabelecimentoId
  const localizacao = useLocation()
  const [etapa, definirEtapa] = useState(publico ? 2 : 1)
  const [escolhas, definirEscolhas] = useState<EscolhasAgendamento>(
    publico ? { idServico: publico.servico.id } : {},
  )
  const [errosContato, definirErrosContato] = useState<Record<string, string>>({})
  const servicos = useMemo(
    () => (publico ? [publico.servico] : repositorioMock.buscarServicos()),
    [publico],
  )
  const servicoSelecionado = servicos.find((servico) => servico.id === escolhas.idServico)
  const profissionaisRemotos = useDadosRemotos(
    estabelecimentoId && servicoSelecionado
      ? `${estabelecimentoId}/${servicoSelecionado.id}`
      : null,
    () => listarProfissionaisDoServico(estabelecimentoId!, servicoSelecionado!.id),
    'Não foi possível carregar os profissionais. Tente novamente.',
  )
  const profissionaisDemo = useMemo(
    () =>
      servicoSelecionado
        ? buscarProfissionaisDoServico(repositorioMock.buscarProfissionais(), servicoSelecionado.id)
        : SEM_PROFISSIONAIS,
    [servicoSelecionado],
  )
  const profissionaisDisponiveis = estabelecimentoId
    ? (profissionaisRemotos.dados ?? SEM_PROFISSIONAIS)
    : profissionaisDemo
  const profissionalSelecionado = profissionaisDisponiveis.find(
    (profissional) => profissional.id === escolhas.idProfissional,
  )
  const hoje = paraChaveData(new Date())
  const datas = useMemo(
    () =>
      Array.from({ length: 6 }, (_, indice) =>
        paraChaveData(adicionarDias(new Date(`${hoje}T12:00`), indice + 1)),
      ),
    [hoje],
  )
  const podeConsultarHorarios =
    Boolean(servicoSelecionado) &&
    (escolhas.qualquerProfissional || Boolean(profissionalSelecionado))
  // Consulta todas as datas de uma vez para exibir somente as que têm horário livre.
  const horariosRemotos = useDadosRemotos(
    estabelecimentoId && podeConsultarHorarios
      ? `${estabelecimentoId}/${servicoSelecionado!.id}/${escolhas.idProfissional ?? ''}/${hoje}`
      : null,
    async () =>
      Object.fromEntries(
        await Promise.all(
          datas.map(
            async (data) =>
              [
                data,
                await listarHorariosDisponiveis(
                  estabelecimentoId!,
                  servicoSelecionado!.id,
                  data,
                  escolhas.qualquerProfissional ? undefined : escolhas.idProfissional,
                ),
              ] as const,
          ),
        ),
      ),
    'Não foi possível carregar os horários. Tente novamente.',
  )
  const horariosDemo = useMemo(() => {
    if (estabelecimentoId || !podeConsultarHorarios) return {}
    const agendamentos = repositorioMock.buscarAgendamentos()
    return Object.fromEntries(
      datas.map((data) => [
        data,
        escolhas.qualquerProfissional
          ? buscarHorariosDeQualquerProfissional(
              data,
              profissionaisDisponiveis,
              servicoSelecionado!,
              agendamentos,
              servicos,
            )
          : buscarHorariosDisponiveis(
              data,
              profissionalSelecionado!,
              servicoSelecionado!,
              agendamentos,
              servicos,
            ),
      ]),
    )
  }, [
    estabelecimentoId,
    podeConsultarHorarios,
    datas,
    escolhas.qualquerProfissional,
    servicoSelecionado,
    profissionalSelecionado,
    profissionaisDisponiveis,
    servicos,
  ])
  const horariosPorData: Record<string, string[]> = estabelecimentoId
    ? (horariosRemotos.dados ?? {})
    : horariosDemo
  const datasDisponiveis = datas.filter((data) => horariosPorData[data]?.length)
  const times = escolhas.data ? (horariosPorData[escolhas.data] ?? []) : []
  const irParaEtapa = (numeroDaEtapa: number) => definirEtapa(numeroDaEtapa)
  const caminhoDeVolta =
    localizacao.state?.origem === 'painel'
      ? caminhos.painel
      : (publico?.rotaBase ?? caminhos.estabelecimento)
  const rotuloDeVolta =
    localizacao.state?.origem === 'painel'
      ? '← Voltar ao painel'
      : `← ${publico?.nomeEstabelecimento ?? 'Ateliê Aurora'}`
  function selecionarServico(idServico: string) {
    definirEscolhas({ idServico })
    irParaEtapa(2)
  }
  function selecionarProfissional(idProfissional?: string) {
    definirEscolhas((atual) => ({
      ...atual,
      idProfissional,
      qualquerProfissional: !idProfissional,
      data: undefined,
      horario: undefined,
    }))
    irParaEtapa(3)
  }
  if (
    etapa === 5 &&
    servicoSelecionado &&
    (profissionalSelecionado || escolhas.qualquerProfissional) &&
    escolhas.cliente
  )
    return (
      <main className="booking container">
        <div className="booking-main">
          <Card className="confirmation">
            <p className="eyebrow">Agendamento de demonstração</p>
            <h1>Pedido preparado!</h1>
            <p>Nenhum horário foi reservado no servidor e nenhuma notificação foi enviada.</p>
            <div className="summary">
              <strong>
                {servicoSelecionado.nome} · {formatarMoeda(servicoSelecionado.valor)}
              </strong>
              <span>{profissionalSelecionado?.nome ?? 'Qualquer profissional'}</span>
              <span>
                {new Date(`${escolhas.data}T${escolhas.horario}`).toLocaleString('pt-BR', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="form-actions confirmation-actions">
              <Button variant="ghost" onClick={() => irParaEtapa(4)}>
                Voltar
              </Button>
              <Link to={caminhoDeVolta}>
                <Button variant="secondary">
                  {localizacao.state?.origem === 'painel'
                    ? 'Voltar ao painel'
                    : 'Voltar ao estabelecimento'}
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
    )
  return (
    <main className="booking container">
      <div className="booking-main">
        <Link to={caminhoDeVolta}>{rotuloDeVolta}</Link>
        <h1>Fazer agendamento</h1>
        <Steps step={etapa} />
        {etapa === 1 && (
          <Card>
            <h2>Escolha o serviço</h2>
            {servicos.map((servico) => (
              <button
                className={`option ${escolhas.idServico === servico.id ? 'selected' : ''}`}
                onClick={() => selecionarServico(servico.id)}
                key={servico.id}
              >
                <span>
                  <strong>{servico.nome}</strong>
                  <br />
                  <small>{servico.duracao} min</small>
                </span>
                <strong>{formatarMoeda(servico.valor)}</strong>
              </button>
            ))}
          </Card>
        )}
        {etapa === 2 && (
          <Card>
            <h2>Escolha o profissional</h2>
            {profissionaisRemotos.carregando || profissionaisRemotos.erro ? (
              <MensagemDeCarga
                carregamento={profissionaisRemotos}
                texto="Carregando profissionais..."
              />
            ) : profissionaisDisponiveis.length ? (
              <>
                <button
                  className={`option ${escolhas.qualquerProfissional ? 'selected' : ''}`}
                  onClick={() => selecionarProfissional()}
                >
                  <span>
                    <strong>Qualquer profissional</strong>
                    <br />
                    <small>Escolhemos alguém disponível</small>
                  </span>
                </button>
                {profissionaisDisponiveis.map((profissional) => (
                  <button
                    className={`option ${
                      !escolhas.qualquerProfissional && escolhas.idProfissional === profissional.id
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => selecionarProfissional(profissional.id)}
                    key={profissional.id}
                  >
                    <span>
                      <strong>{profissional.nome}</strong>
                      <br />
                      <small>{profissional.especialidades.join(', ')}</small>
                    </span>
                  </button>
                ))}
              </>
            ) : (
              <p>Nenhum profissional atende este serviço.</p>
            )}
            {publico ? (
              <Link to={publico.caminhoDoServico} state={localizacao.state}>
                <Button variant="ghost">Voltar</Button>
              </Link>
            ) : (
              <Button variant="ghost" onClick={() => irParaEtapa(1)}>
                Voltar
              </Button>
            )}
          </Card>
        )}
        {etapa === 3 && (
          <Card>
            <h2>Data e horário</h2>
            <MensagemDeCarga carregamento={horariosRemotos} texto="Carregando horários..." />
            {!datasDisponiveis.length && !horariosRemotos.carregando && !horariosRemotos.erro && (
              <p className="notice">Não há horários disponíveis nos próximos dias.</p>
            )}
            <div className="filters">
              {datasDisponiveis.map((data) => (
                <Button
                  variant={escolhas.data === data ? 'primary' : 'secondary'}
                  key={data}
                  onClick={() =>
                    definirEscolhas((atual) => ({ ...atual, data, horario: undefined }))
                  }
                >
                  {new Date(`${data}T12:00`).toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                  })}
                </Button>
              ))}
            </div>
            {escolhas.data && (
              <>
                <div className="filters">
                  <span className="muted">Manhã · Tarde · Noite</span>
                </div>
                <div className="time-grid">
                  {times.map((horario) => (
                    <button
                      className={escolhas.horario === horario ? 'selected' : ''}
                      key={horario}
                      onClick={() => definirEscolhas((atual) => ({ ...atual, horario }))}
                    >
                      {horario}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="form-actions">
              <Button variant="ghost" onClick={() => irParaEtapa(2)}>
                Voltar
              </Button>
              <Button disabled={!escolhas.horario} onClick={() => irParaEtapa(4)}>
                Continuar
              </Button>
            </div>
          </Card>
        )}
        {etapa === 4 && (
          <Card>
            <h2>Seus dados</h2>
            <p className="notice">
              Usaremos estes dados somente nesta demonstração. O cadastro será integrado ao backend
              futuramente.
            </p>
            <form
              className="form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                const form = new FormData(e.currentTarget)
                const erros: Record<string, string> = {}
                if (!telefoneValido(String(form.get('phone')))) {
                  erros.phone = 'Informe um celular válido com DDD.'
                }
                if (!emailValido(String(form.get('email')))) {
                  erros.email = 'Informe um e-mail válido.'
                }
                definirErrosContato(erros)
                if (Object.keys(erros).length || !e.currentTarget.reportValidity()) return
                definirEscolhas((atual) => ({
                  ...atual,
                  cliente: {
                    nome: String(form.get('name')),
                    telefone: String(form.get('phone')),
                    email: String(form.get('email')).trim(),
                  },
                }))
                irParaEtapa(5)
              }}
            >
              <Field
                name="name"
                label="Nome completo"
                defaultValue={escolhas.cliente?.nome}
                required
              />
              <PhoneField
                name="phone"
                label="Telefone / WhatsApp"
                defaultValue={escolhas.cliente?.telefone}
                placeholder="(84) 9 9429-1683"
                onChange={() => definirErrosContato((atual) => ({ ...atual, phone: '' }))}
                onBlur={(evento) => {
                  if (evento.target.value && !telefoneValido(evento.target.value)) {
                    definirErrosContato((atual) => ({
                      ...atual,
                      phone: 'Informe um celular válido com DDD.',
                    }))
                  }
                }}
                error={errosContato.phone}
                required
              />
              <Field
                name="email"
                label="E-mail"
                type="email"
                defaultValue={escolhas.cliente?.email}
                onChange={() => definirErrosContato((atual) => ({ ...atual, email: '' }))}
                onBlur={(evento) => {
                  if (evento.target.value && !emailValido(evento.target.value)) {
                    definirErrosContato((atual) => ({
                      ...atual,
                      email: 'Informe um e-mail válido.',
                    }))
                  }
                }}
                error={errosContato.email}
                required
              />
              <div className="form-actions">
                <Button type="button" variant="ghost" onClick={() => irParaEtapa(3)}>
                  Voltar
                </Button>
                <Button>Revisar agendamento</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </main>
  )
}

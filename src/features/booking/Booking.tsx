import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { repositorioMock } from '../../data/mockRepository'
import {
  encontrarProfissionalDisponivel,
  listarHorariosDisponiveis,
} from '../../data/publicAvailability'
import { listarProfissionaisDoServico } from '../../data/publicProfessionals'
import {
  adicionarDias,
  buscarHorariosDeQualquerProfissional,
  buscarHorariosDisponiveis,
  buscarProfissionaisDoServico,
  paraChaveData,
} from '../../domain/availability'
import type { Avaliacao, EscolhasAgendamento, Profissional, Servico } from '../../domain/models'
import { etapaDisponivel } from '../../domain/bookingProgress'
import { emailValido, telefoneValido } from '../../domain/contact'
import { BookingSelectionSummary } from './BookingSelectionSummary'
import { cadastrarCliente, ErroApi } from '../../data/auth'
import { registrarAgendamento } from '../../data/agendamentos'
import type { AgendamentoRegistrado } from '../../data/agendamentos'
import { useAutenticacao } from '../../app/useAutenticacao'
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
            state={{ origem: 'apresentacao', fluxoCliente: 'cadastro' }}
          >
            Fazer primeiro agendamento
          </Link>
          <Link
            className="presentation-action"
            to={caminhoAgendamento}
            state={{ origem: 'apresentacao', fluxoCliente: 'entrar' }}
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
  const navegar = useNavigate()
  const [escolhas, definirEscolhas] = useState<EscolhasAgendamento>(() => {
    const anteriores = localizacao.state?.escolhasAgendamento as EscolhasAgendamento | undefined
    return publico
      ? anteriores?.idServico === publico.servico.id
        ? anteriores
        : { idServico: publico.servico.id }
      : {}
  })
  const [etapa, definirEtapa] = useState(() => {
    const destino = Number(localizacao.state?.etapaDestino)
    return publico && destino >= 2 && destino <= etapaDisponivel(escolhas)
      ? destino
      : publico
        ? 2
        : 1
  })
  const [errosContato, definirErrosContato] = useState<Record<string, string>>({})
  const [erroCadastro, definirErroCadastro] = useState('')
  const [cadastrando, definirCadastrando] = useState(false)
  const [modoDados, definirModoDados] = useState<'cadastro' | 'entrar'>(
    localizacao.state?.fluxoCliente === 'entrar' ? 'entrar' : 'cadastro',
  )
  const [resolvendoProfissional, definirResolvendoProfissional] = useState(false)
  const [erroProfissional, definirErroProfissional] = useState('')
  const solicitacaoProfissional = useRef(0)
  const [confirmando, definirConfirmando] = useState(false)
  const [erroConfirmacao, definirErroConfirmacao] = useState('')
  const [agendamentoConfirmado, definirAgendamentoConfirmado] =
    useState<AgendamentoRegistrado | null>(null)
  // O estado só muda na próxima renderização; a ref barra um segundo clique no mesmo instante.
  const confirmacaoEmAndamento = useRef(false)
  useEffect(
    () => () => {
      solicitacaoProfissional.current++
    },
    [],
  )
  const { sessao, autenticar } = useAutenticacao()
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
      ? `${estabelecimentoId}/${servicoSelecionado!.id}/${escolhas.qualquerProfissional ? '' : (escolhas.idProfissional ?? '')}/${hoje}`
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
  const irParaEtapa = (numeroDaEtapa: number) => {
    solicitacaoProfissional.current++
    definirResolvendoProfissional(false)
    definirErroProfissional('')
    definirEtapa(numeroDaEtapa)
  }
  const maxStep = etapaDisponivel(escolhas)
  const nomeProfissional = escolhas.qualquerProfissional
    ? profissionalSelecionado
      ? `Qualquer Profissional (${profissionalSelecionado.nome})`
      : 'Qualquer profissional'
    : (profissionalSelecionado?.nome ?? 'Profissional selecionado')
  const itensResumo: { rotulo: string; valor: string }[] = []
  if (servicoSelecionado)
    itensResumo.push({
      rotulo: 'Serviço',
      valor: `${servicoSelecionado.nome} · ${formatarMoeda(servicoSelecionado.valor)}`,
    })
  if (escolhas.idProfissional || escolhas.qualquerProfissional)
    itensResumo.push({
      rotulo: 'Profissional',
      valor: nomeProfissional,
    })
  if (escolhas.data && escolhas.horario)
    itensResumo.push({
      rotulo: 'Data e horário',
      valor: `${new Date(`${escolhas.data}T12:00`).toLocaleDateString('pt-BR')} às ${escolhas.horario}`,
    })
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
    definirErroProfissional('')
    definirResolvendoProfissional(false)
    definirEscolhas((atual) => ({
      ...atual,
      idProfissional,
      qualquerProfissional: !idProfissional,
      data: undefined,
      horario: undefined,
    }))
    irParaEtapa(3)
  }

  function selecionarData(data: string) {
    solicitacaoProfissional.current++
    definirResolvendoProfissional(false)
    definirErroProfissional('')
    definirEscolhas((atual) => ({
      ...atual,
      data,
      horario: atual.data === data ? atual.horario : undefined,
      idProfissional:
        atual.qualquerProfissional && atual.data !== data ? undefined : atual.idProfissional,
    }))
  }

  async function selecionarHorario(horario: string) {
    if (!escolhas.data || !servicoSelecionado || resolvendoProfissional) return
    if (!escolhas.qualquerProfissional) {
      definirEscolhas((atual) => ({ ...atual, horario }))
      irParaEtapa(4)
      return
    }

    const solicitacao = ++solicitacaoProfissional.current
    definirResolvendoProfissional(true)
    definirErroProfissional('')
    definirEscolhas((atual) => ({ ...atual, idProfissional: undefined, horario: undefined }))
    try {
      const profissional = estabelecimentoId
        ? await encontrarProfissionalDisponivel(
            estabelecimentoId,
            servicoSelecionado.id,
            profissionaisDisponiveis,
            escolhas.data,
            horario,
          )
        : profissionaisDisponiveis.find((candidato) =>
            buscarHorariosDisponiveis(
              escolhas.data!,
              candidato,
              servicoSelecionado,
              repositorioMock.buscarAgendamentos(),
              servicos,
            ).includes(horario),
          )
      if (solicitacao !== solicitacaoProfissional.current) return
      if (!profissional) throw new Error('O horário não está mais disponível. Escolha outro.')
      definirEscolhas((atual) => ({ ...atual, idProfissional: profissional.id, horario }))
      definirResolvendoProfissional(false)
      irParaEtapa(4)
    } catch (falha) {
      if (solicitacao === solicitacaoProfissional.current)
        definirErroProfissional(
          falha instanceof Error ? falha.message : 'Não foi possível confirmar o profissional.',
        )
    } finally {
      if (solicitacao === solicitacaoProfissional.current) definirResolvendoProfissional(false)
    }
  }

  async function confirmarAgendamento() {
    if (
      !estabelecimentoId ||
      !servicoSelecionado ||
      !escolhas.idProfissional ||
      !escolhas.data ||
      !escolhas.horario ||
      confirmacaoEmAndamento.current
    )
      return
    confirmacaoEmAndamento.current = true
    definirConfirmando(true)
    definirErroConfirmacao('')
    try {
      const registrado = await registrarAgendamento(estabelecimentoId, {
        servicoId: servicoSelecionado.id,
        profissionalId: escolhas.idProfissional,
        data: escolhas.data,
        horario: escolhas.horario,
      })
      definirAgendamentoConfirmado(registrado)
    } catch (falha) {
      const status = falha instanceof ErroApi ? falha.status : 0
      if (status === 409) {
        // Outro cliente levou o horário: volta à escolha com os horários atualizados.
        definirEscolhas((atual) => ({
          ...atual,
          horario: undefined,
          idProfissional: atual.qualquerProfissional ? undefined : atual.idProfissional,
        }))
        horariosRemotos.tentarNovamente()
        irParaEtapa(3)
        definirErroProfissional('Esse horário acabou de ser reservado. Escolha outro horário.')
      } else if (status === 401) {
        definirModoDados('entrar')
        irParaEtapa(4)
        definirErroCadastro('Sua sessão expirou. Entre novamente para confirmar o agendamento.')
      } else {
        definirErroConfirmacao(
          falha instanceof Error
            ? falha.message
            : 'Não foi possível confirmar o agendamento. Tente novamente.',
        )
      }
    } finally {
      confirmacaoEmAndamento.current = false
      definirConfirmando(false)
    }
  }

  function navegarPelasEtapas(destino: number) {
    if (destino > maxStep || destino === etapa) return
    if (publico && destino === 1) {
      navegar(publico.caminhoDoServico, {
        state: { ...localizacao.state, fluxoCliente: modoDados, escolhasAgendamento: escolhas },
      })
      return
    }
    irParaEtapa(destino)
  }

  function alterarModoDados(modo: 'cadastro' | 'entrar') {
    definirModoDados(modo)
    definirErrosContato({})
    definirErroCadastro('')
    navegar(`${localizacao.pathname}${localizacao.search}`, {
      replace: true,
      state: {
        ...localizacao.state,
        fluxoCliente: modo,
        escolhasAgendamento: escolhas,
        etapaDestino: 4,
      },
    })
  }

  async function cadastrarDuranteAgendamento(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (cadastrando) return
    const formulario = evento.currentTarget
    const dados = new FormData(formulario)
    const nome = String(dados.get('name') ?? '').trim()
    const telefone = String(dados.get('phone') ?? '').trim()
    const email = String(dados.get('email') ?? '').trim()
    const senha = String(dados.get('senha') ?? '')
    const erros: Record<string, string> = {}
    if (nome.length < 3) erros.name = 'Informe seu nome completo.'
    if (!telefoneValido(telefone)) erros.phone = 'Informe um celular válido com DDD.'
    if (!emailValido(email)) erros.email = 'Informe um e-mail válido.'
    if (senha.length < 8) erros.senha = 'A senha deve ter pelo menos 8 caracteres.'
    definirErrosContato(erros)
    definirErroCadastro('')
    if (Object.keys(erros).length) return

    definirCadastrando(true)
    try {
      await cadastrarCliente({ nome, telefone, email, senha })
      const sessaoAutenticada = await autenticar(email, senha)
      if (sessaoAutenticada.role !== 'CLIENTE') {
        throw new Error('Use uma conta de cliente para continuar o agendamento.')
      }
      definirEscolhas((atual) => ({ ...atual, cliente: { nome, telefone, email } }))
      irParaEtapa(5)
    } catch (falha) {
      definirErroCadastro(
        falha instanceof Error ? falha.message : 'Não foi possível criar a conta. Tente novamente.',
      )
    } finally {
      definirCadastrando(false)
    }
  }

  async function entrarDuranteAgendamento(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (cadastrando) return
    const dados = new FormData(evento.currentTarget)
    const identificador = String(dados.get('identificador') ?? '').trim()
    const senha = String(dados.get('senha') ?? '')
    const erros: Record<string, string> = {}
    const identificadorValido = identificador.includes('@')
      ? emailValido(identificador)
      : telefoneValido(identificador)
    if (!identificadorValido) erros.identificador = 'Informe um e-mail ou celular válido com DDD.'
    if (!senha) erros.senha = 'Informe sua senha.'
    definirErrosContato(erros)
    definirErroCadastro('')
    if (Object.keys(erros).length) return

    definirCadastrando(true)
    try {
      const sessaoAutenticada = await autenticar(identificador, senha)
      if (sessaoAutenticada.role !== 'CLIENTE') {
        throw new Error('Use uma conta de cliente para continuar o agendamento.')
      }
      definirEscolhas((atual) => ({
        ...atual,
        cliente: {
          nome: sessaoAutenticada.nome,
          telefone: sessaoAutenticada.telefone ?? '',
          email: sessaoAutenticada.email,
        },
      }))
      irParaEtapa(5)
    } catch (falha) {
      definirErroCadastro(
        falha instanceof Error ? falha.message : 'Não foi possível entrar. Tente novamente.',
      )
    } finally {
      definirCadastrando(false)
    }
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
          <Link to={caminhoDeVolta}>{rotuloDeVolta}</Link>
          <h1>Fazer agendamento</h1>
          {!agendamentoConfirmado && (
            <Steps step={etapa} maxStep={maxStep} onStepClick={navegarPelasEtapas} />
          )}
          <Card className="confirmation">
            <div className="confirmation-header">
              <span className="confirmation-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32">
                  <rect x="4" y="7" width="21" height="21" rx="3" />
                  <path d="M9 4v6m11-6v6M4 14h21" />
                  <circle cx="24" cy="24" r="6" />
                  <path d="M24 20.5V24l2.5 1.5" />
                </svg>
              </span>
              <div>
                <p className="eyebrow">{publico ? 'Confirmação' : 'Agendamento de demonstração'}</p>
                <h2>
                  {!publico
                    ? 'Pedido preparado!'
                    : agendamentoConfirmado
                      ? 'Agendamento confirmado!'
                      : 'Revise seu agendamento'}
                </h2>
                <p className="confirmation-intro">
                  {agendamentoConfirmado
                    ? 'Seu horário está reservado.'
                    : 'Confira os detalhes do atendimento escolhido.'}
                </p>
              </div>
            </div>
            <p className="confirmation-status" role={agendamentoConfirmado ? 'status' : undefined}>
              <span aria-hidden="true">i</span>
              {!publico
                ? 'Este horário ainda não foi reservado.'
                : agendamentoConfirmado
                  ? `Reserva nº ${agendamentoConfirmado.id} registrada.`
                  : 'Seu horário só é reservado depois que você confirmar.'}
            </p>
            <dl className="summary confirmation-summary">
              <div>
                <dt>Serviço</dt>
                <dd>
                  {servicoSelecionado.nome}
                  <span>{formatarMoeda(servicoSelecionado.valor)}</span>
                </dd>
              </div>
              <div>
                <dt>Profissional</dt>
                <dd>{nomeProfissional}</dd>
              </div>
              <div>
                <dt>Data e horário</dt>
                <dd>
                  {new Date(`${escolhas.data}T${escolhas.horario}`).toLocaleString('pt-BR', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </dd>
              </div>
            </dl>
            {erroConfirmacao && (
              <p className="auth-error" role="alert">
                {erroConfirmacao}
              </p>
            )}
            <div className="form-actions confirmation-actions">
              {!agendamentoConfirmado && (
                <Button variant="ghost" disabled={confirmando} onClick={() => irParaEtapa(4)}>
                  Voltar
                </Button>
              )}
              {publico && !agendamentoConfirmado && (
                <Button disabled={confirmando} onClick={() => void confirmarAgendamento()}>
                  {confirmando ? 'Confirmando...' : 'Confirmar agendamento'}
                </Button>
              )}
              <Link className="button secondary" to={caminhos.meusAgendamentos}>
                Área do cliente
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
        <Steps step={etapa} maxStep={maxStep} onStepClick={navegarPelasEtapas} />
        {etapa > 1 && <BookingSelectionSummary escolhas={itensResumo} />}
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
              <Link
                to={publico.caminhoDoServico}
                state={{
                  ...localizacao.state,
                  fluxoCliente: modoDados,
                  escolhasAgendamento: escolhas,
                }}
              >
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
                  onClick={() => selecionarData(data)}
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
                      disabled={resolvendoProfissional}
                      onClick={() => void selecionarHorario(horario)}
                    >
                      {horario}
                    </button>
                  ))}
                </div>
              </>
            )}
            {resolvendoProfissional && <p role="status">Confirmando profissional disponível...</p>}
            {erroProfissional && (
              <p className="auth-error" role="alert">
                {erroProfissional}
              </p>
            )}
            <Button variant="ghost" onClick={() => irParaEtapa(2)}>
              Voltar
            </Button>
          </Card>
        )}
        {etapa === 4 && (
          <Card>
            <h2>Seus dados</h2>
            {modoDados === 'cadastro' && (
              <p className="notice">
                Crie sua conta para continuar e acompanhar seus agendamentos.
              </p>
            )}
            <form
              key={modoDados}
              className="form"
              noValidate
              onSubmit={(evento) =>
                void (modoDados === 'entrar'
                  ? entrarDuranteAgendamento(evento)
                  : cadastrarDuranteAgendamento(evento))
              }
            >
              {modoDados === 'cadastro' && (
                <Field
                  name="name"
                  label="Nome completo"
                  defaultValue={
                    escolhas.cliente?.nome ?? (sessao?.role === 'CLIENTE' ? sessao.nome : '')
                  }
                  onChange={() => definirErrosContato((atual) => ({ ...atual, name: '' }))}
                  error={errosContato.name}
                  required
                />
              )}
              {modoDados === 'entrar' && (
                <Field
                  name="identificador"
                  label="E-mail ou telefone"
                  autoComplete="username"
                  defaultValue={
                    escolhas.cliente?.email ?? (sessao?.role === 'CLIENTE' ? sessao.email : '')
                  }
                  placeholder="voce@exemplo.com ou (84) 9 9999-9999"
                  onChange={() => definirErrosContato((atual) => ({ ...atual, identificador: '' }))}
                  error={errosContato.identificador}
                  required
                />
              )}
              {modoDados === 'cadastro' && (
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
              )}
              {modoDados === 'cadastro' && (
                <Field
                  name="email"
                  label="E-mail"
                  type="email"
                  defaultValue={
                    escolhas.cliente?.email ?? (sessao?.role === 'CLIENTE' ? sessao.email : '')
                  }
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
              )}
              <Field
                name="senha"
                label={modoDados === 'cadastro' ? 'Criar senha' : 'Senha'}
                type="password"
                autoComplete={modoDados === 'cadastro' ? 'new-password' : 'current-password'}
                minLength={modoDados === 'cadastro' ? 8 : undefined}
                onChange={() => definirErrosContato((atual) => ({ ...atual, senha: '' }))}
                error={errosContato.senha}
                required
              />
              <button
                className="booking-switch-mode"
                type="button"
                disabled={cadastrando}
                onClick={() => alterarModoDados(modoDados === 'cadastro' ? 'entrar' : 'cadastro')}
              >
                {modoDados === 'cadastro'
                  ? 'Já tenho conta no AgendaJá'
                  : 'Ainda não tenho conta no AgendaJá'}
              </button>
              {erroCadastro && (
                <p className="auth-error" role="alert">
                  {erroCadastro}
                </p>
              )}
              <div className="form-actions">
                <Button type="button" variant="ghost" onClick={() => irParaEtapa(3)}>
                  Voltar
                </Button>
                <Button disabled={cadastrando}>
                  {cadastrando
                    ? 'Aguarde...'
                    : modoDados === 'entrar'
                      ? 'Entrar e revisar agendamento'
                      : 'Revisar agendamento'}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </main>
  )
}

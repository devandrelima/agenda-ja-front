import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { caminhos } from '../../app/paths'
import { useAutenticacao } from '../../app/useAutenticacao'
import { repositorioMock } from '../../data/mockRepository'
import { prepararCapa } from '../../data/businessCover'
import { buscarEstabelecimentoAdmin, buscarIdentificadorPublico, salvarConfiguracao } from '../../data/publicEstablishment'
import imagemPlaceholder from '../../assets/placeholder-imagem.svg'
import { paraChaveData } from '../../domain/availability'
import { Badge, Button, Card, Empty, Logo } from '../../design-system/ui'
import { ConfirmarSaida } from '../auth/ConfirmLogout'
import { HorariosDoNegocio } from './BusinessHours'
import { DadosDoNegocio } from './BusinessProfile'

type IconeMenu =
  'inicio' | 'agenda' | 'profissionais' | 'servicos' | 'clientes' | 'relatorios' | 'sair'

const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function copiarComSelecao(texto: string) {
  const campo = document.createElement('textarea')
  const elementoAtivo = document.activeElement
  campo.value = texto
  campo.style.position = 'fixed'
  campo.style.opacity = '0'
  document.body.appendChild(campo)
  campo.focus()
  campo.select()
  campo.setSelectionRange(0, texto.length)

  try {
    if (!document.execCommand('copy')) throw new Error('Não foi possível copiar o link.')
  } finally {
    campo.remove()
    if (elementoAtivo instanceof HTMLElement) elementoAtivo.focus()
  }
}

async function copiarTexto(texto: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto)
      return
    } catch {
      copiarComSelecao(texto)
      return
    }
  }
  copiarComSelecao(texto)
}

const itensDoMenu: { caminho: string; rotulo: string; icone: IconeMenu }[] = [
  { caminho: '/painel', rotulo: 'Início', icone: 'inicio' },
  { caminho: '/painel/agenda', rotulo: 'Agenda', icone: 'agenda' },
  { caminho: '/painel/profissionais', rotulo: 'Profissionais', icone: 'profissionais' },
  { caminho: '/painel/servicos', rotulo: 'Serviços', icone: 'servicos' },
  { caminho: '/painel/clientes', rotulo: 'Clientes', icone: 'clientes' },
  { caminho: '/painel/relatorios', rotulo: 'Relatórios', icone: 'relatorios' },
]

function IconeDaNavegacao({ nome }: { nome: IconeMenu }) {
  const caminhos = {
    inicio: <path d="m3 10 9-7 9 7v10H3V10Zm6 10v-6h6v6" />,
    agenda: (
      <path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 5h14M8 2v4m8-4v4" />
    ),
    profissionais: (
      <path d="M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m7-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 9v-1a4 4 0 0 0-3-3.87m-1-12a4 4 0 0 1 0 7.75" />
    ),
    servicos: <path d="M20 13.5 13.5 20 4 10.5V4h6.5L20 13.5ZM7 7h.01" />,
    clientes: (
      <path d="M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m14-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 9v-1a4 4 0 0 0-3-3.87" />
    ),
    relatorios: <path d="M4 20V10m8 10V4m8 16v-7" />,
    sair: <path d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />,
  }

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {caminhos[nome]}
    </svg>
  )
}

export function LayoutPrestador({
  children,
  semBarraLateral = false,
}: {
  children: React.ReactNode
  semBarraLateral?: boolean
}) {
  return (
    <div className={`provider${semBarraLateral ? ' without-sidebar' : ''}`}>
      {!semBarraLateral && (
        <aside className="sidebar">
          <Logo />
          <nav>
            {itensDoMenu.map(({ caminho, rotulo, icone }) => (
              <NavLink key={caminho} to={caminho} end={caminho === '/painel'} aria-label={rotulo}>
                <IconeDaNavegacao nome={icone} />
                <span className="nav-label">{rotulo}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
      )}
      <main className="main">{children}</main>
    </div>
  )
}
function ProximosAtendimentos() {
  const agendamentos = repositorioMock.buscarAgendamentos()
  const servicos = repositorioMock.buscarServicos()
  const profissionais = repositorioMock.buscarProfissionais()
  const clientes = repositorioMock.buscarClientes()
  return (
    <Card>
      <h2>Próximos atendimentos</h2>
      {agendamentos.map((agendamento) => {
        const servico = servicos.find((item) => item.id === agendamento.idServico)!
        const profissional = profissionais.find((item) => item.id === agendamento.idProfissional)!
        const cliente = clientes.find((item) => item.id === agendamento.idCliente)!
        return (
          <article className="appointment" key={agendamento.id}>
            <time>
              {new Date(agendamento.inicio).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
            <div className="info">
              <strong>{cliente.nome}</strong>
              <p>
                {servico.nome} · {profissional.nome}
              </p>
            </div>
            <Badge status={agendamento.status} />
          </article>
        )
      })}
    </Card>
  )
}
function CapaDoNegocio() {
  const { sessao } = useAutenticacao()
  const estabelecimentoId = sessao?.estabelecimentoId
  const [capa, definirCapa] = useState(imagemPlaceholder)
  const campoArquivo = useRef<HTMLInputElement>(null)
  const [erro, definirErro] = useState('')
  const [salvando, definirSalvando] = useState(false)

  useEffect(() => {
    if (estabelecimentoId == null) return
    buscarEstabelecimentoAdmin(estabelecimentoId)
      .then((dados) => definirCapa(dados.imagemUrl || imagemPlaceholder))
      .catch(() => definirErro('Não foi possível carregar a foto de capa.'))
  }, [estabelecimentoId])

  async function escolherFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    definirErro('')
    definirSalvando(true)
    try {
      if (estabelecimentoId == null) throw new Error('Negócio não identificado.')
      const imagemUrl = await prepararCapa(arquivo)
      await salvarConfiguracao(estabelecimentoId, 'capa', { imagemUrl })
      definirCapa(imagemUrl)
    } catch (falha) {
      definirErro(
        falha instanceof Error
            ? falha.message
            : 'Não foi possível salvar a foto.',
      )
    } finally {
      definirSalvando(false)
    }
  }

  return (
    <Card className="business-cover-card">
      <div className="business-cover-heading">
        <div>
          <h2>Foto de capa</h2>
          <p className="muted">Imagem da página de apresentação do negócio.</p>
        </div>
        <input
          className="sr-only"
          ref={campoArquivo}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Escolher foto de capa"
          onChange={(evento) => void escolherFoto(evento)}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={salvando}
          onClick={() => campoArquivo.current?.click()}
        >
          {salvando ? 'Salvando...' : 'Trocar foto'}
        </Button>
      </div>
      <img
        className="presentation-photo business-cover-photo"
        src={capa}
        alt="Foto de capa do negócio"
      />
      {erro && (
        <p className="auth-error" role="alert">
          {erro}
        </p>
      )}
    </Card>
  )
}
export function ConfiguracoesDoNegocio() {
  const navegar = useNavigate()
  const { encerrar } = useAutenticacao()
  const [saindo, definirSaindo] = useState(false)
  const [confirmandoSaida, definirConfirmandoSaida] = useState(false)
  const [erroSaida, definirErroSaida] = useState('')

  async function finalizarSessao() {
    definirSaindo(true)
    definirErroSaida('')
    try {
      await encerrar()
      definirConfirmandoSaida(false)
      navegar(caminhos.login, { replace: true })
    } catch {
      definirErroSaida('Não foi possível sair. Tente novamente.')
    } finally {
      definirSaindo(false)
    }
  }

  return (
    <>
      <header className="settings-header">
        <Link
          className="availability-back settings-back"
          to={caminhos.painel}
          aria-label="Voltar ao início do painel"
        >
          ‹
        </Link>
        <h1>Configurações</h1>
      </header>
      <section className="section dashboard-section">
        <CapaDoNegocio />
      </section>
      <section className="section dashboard-section">
        <DadosDoNegocio />
      </section>
      <section className="section dashboard-section">
        <HorariosDoNegocio />
      </section>
      <footer className="settings-footer">
        <Button
          className="settings-logout"
          type="button"
          variant="ghost"
          disabled={saindo}
          onClick={() => {
            definirErroSaida('')
            definirConfirmandoSaida(true)
          }}
        >
          <IconeDaNavegacao nome="sair" />
          Sair
        </Button>
      </footer>
      {confirmandoSaida && (
        <ConfirmarSaida
          saindo={saindo}
          erro={erroSaida}
          aoCancelar={() => {
            definirConfirmandoSaida(false)
            definirErroSaida('')
          }}
          aoConfirmar={() => void finalizarSessao()}
        />
      )}
    </>
  )
}
export function Dashboard() {
  const navegar = useNavigate()
  const { sessao } = useAutenticacao()
  const [avisoCopia, definirAvisoCopia] = useState<{ mensagem: string; erro: boolean } | null>(null)
  const [copiandoLink, definirCopiandoLink] = useState(false)
  const [abrindoAgendamento, definirAbrindoAgendamento] = useState(false)
  const temporizadorAviso = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(temporizadorAviso.current), [])

  function mostrarAviso(mensagem: string, erro = false) {
    window.clearTimeout(temporizadorAviso.current)
    definirAvisoCopia({ mensagem, erro })
    temporizadorAviso.current = window.setTimeout(() => definirAvisoCopia(null), 3500)
  }

  const agendamentos = repositorioMock.buscarAgendamentos()
  const servicos = repositorioMock.buscarServicos()
  const hoje = paraChaveData(new Date())
  const agendamentosDeHoje = agendamentos.filter((agendamento) =>
    agendamento.inicio.startsWith(hoje),
  )
  const confirmados = agendamentos.filter((agendamento) => agendamento.status === 'Confirmado')
  const faturamentoPrevisto = confirmados.reduce(
    (total, agendamento) =>
      total + (servicos.find((servico) => servico.id === agendamento.idServico)?.valor ?? 0),
    0,
  )

  async function copiarLinkDoNegocio() {
    if (sessao?.estabelecimentoId == null) {
      mostrarAviso('Não foi possível identificar o negócio desta conta.', true)
      return
    }
    definirCopiandoLink(true)
    try {
      const publicId = await buscarIdentificadorPublico(sessao.estabelecimentoId)
      const linkDoNegocio = new URL(
        `/estabelecimento/${publicId}`,
        window.location.origin,
      ).toString()
      await copiarTexto(linkDoNegocio)
      mostrarAviso('Link copiado!')
    } catch {
      mostrarAviso('Não foi possível copiar o link.', true)
    } finally {
      definirCopiandoLink(false)
    }
  }

  async function abrirNovoAgendamento() {
    if (sessao?.estabelecimentoId == null) {
      mostrarAviso('Não foi possível identificar o negócio desta conta.', true)
      return
    }
    definirAbrindoAgendamento(true)
    try {
      const publicId = await buscarIdentificadorPublico(sessao.estabelecimentoId)
      navegar(`/estabelecimento/${publicId}/agendar`, { state: { origem: 'painel' } })
    } catch {
      mostrarAviso('Não foi possível abrir o agendamento.', true)
      definirAbrindoAgendamento(false)
    }
  }

  return (
    <>
      <header className="topbar topbar-with-create topbar-dashboard">
        <div>
          <p className="muted">Visão geral</p>
          <h1>Olá, {sessao?.nome ?? 'gestor'}</h1>
        </div>
        <div className="topbar-actions">
          <Button
            className="settings-trigger"
            type="button"
            variant="ghost"
            onClick={() => navegar(caminhos.configuracoes)}
            aria-label="Configurações"
            title="Configurações"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.4 2.5h3.2l.5 2.1c.5.2 1 .4 1.4.8l2-.9 2.3 2.3-.9 2c.3.4.6.9.8 1.4l2.1.5v3.2l-2.1.5c-.2.5-.5 1-.8 1.4l.9 2-2.3 2.3-2-.9c-.4.3-.9.6-1.4.8l-.5 2.1h-3.2l-.5-2.1c-.5-.2-1-.5-1.4-.8l-2 .9-2.3-2.3.9-2c-.3-.4-.6-.9-.8-1.4l-2.1-.5v-3.2l2.1-.5c.2-.5.5-1 .8-1.4l-.9-2 2.3-2.3 2 .9c.4-.4.9-.6 1.4-.8l.5-2.1Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Button>
          <Button
            className="copy-business-link"
            type="button"
            disabled={copiandoLink}
            onClick={() => void copiarLinkDoNegocio()}
            aria-label="Copiar link da página do negócio"
            title="Copiar link da página do negócio"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" />
              <path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15" />
            </svg>
          </Button>
          <Button
            className="new-booking-button"
            disabled={abrindoAgendamento}
            onClick={() => void abrirNovoAgendamento()}
          >
            Novo agendamento
          </Button>
        </div>
      </header>
      {avisoCopia && (
        <div
          className={`copy-toast${avisoCopia.erro ? ' copy-toast-error' : ''}`}
          role={avisoCopia.erro ? 'alert' : 'status'}
        >
          {avisoCopia.mensagem}
        </div>
      )}
      <div className="metric-grid">
        {[
          ['Agendamentos hoje', agendamentosDeHoje.length],
          ['Confirmados', confirmados.length],
          ['Faturamento previsto', formatarMoeda(faturamentoPrevisto)],
          [
            'Aguardando confirmação',
            agendamentos.filter((agendamento) => agendamento.status === 'Aguardando confirmação')
              .length,
          ],
        ].map(([label, value]) => (
          <Card className="metric" key={String(label)}>
            <span className="muted">{label}</span>
            <strong>{value}</strong>
          </Card>
        ))}
      </div>
      <section className="section dashboard-section">
        <ProximosAtendimentos />
      </section>
    </>
  )
}
export function Agenda() {
  const [idProfissional, definirIdProfissional] = useState('')
  const agendamentos = repositorioMock
    .buscarAgendamentos()
    .filter((agendamento) => !idProfissional || agendamento.idProfissional === idProfissional)
  const servicos = repositorioMock.buscarServicos()
  const profissionais = repositorioMock.buscarProfissionais()
  const clientes = repositorioMock.buscarClientes()
  const datas = Array.from({ length: 5 }, (_, indice) => {
    const data = new Date()
    data.setDate(data.getDate() + indice)
    return paraChaveData(data)
  })
  return (
    <>
      <header className="topbar">
        <div>
          <p className="muted">Semana atual</p>
          <h1>Agenda</h1>
        </div>
        <select
          aria-label="Filtrar por profissional"
          value={idProfissional}
          onChange={(evento) => definirIdProfissional(evento.target.value)}
        >
          <option value="">Todos os profissionais</option>
          {profissionais.map((profissional) => (
            <option key={profissional.id} value={profissional.id}>
              {profissional.nome}
            </option>
          ))}
        </select>
      </header>
      <Card>
        <p className="muted">
          Legenda: <Badge status="Confirmado" /> <Badge status="Aguardando confirmação" />
        </p>
        <div className="week">
          <div className="week-grid">
            <div className="dayhead">Hora</div>
            {datas.map((data) => (
              <div className="dayhead" key={data}>
                {new Date(`${data}T12:00`).toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                })}
              </div>
            ))}
            {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'].flatMap(
              (time) => [
                <div className="slot" key={`${time}-time`}>
                  {time}
                </div>,
                ...datas.map((data) => {
                  const agendamento = agendamentos.find((item) =>
                    item.inicio.startsWith(`${data}T${time}`),
                  )
                  if (!agendamento) return <div className="slot" key={`${data}-${time}`} />
                  const cliente = clientes.find((item) => item.id === agendamento.idCliente)!
                  const servico = servicos.find((item) => item.id === agendamento.idServico)!
                  return (
                    <div
                      className="slot"
                      key={`${data}-${time}`}
                      title={`${cliente.nome} — ${servico.nome}`}
                    >
                      <strong>{cliente.nome}</strong>
                      <br />
                      {servico.nome}
                    </div>
                  )
                }),
              ],
            )}
          </div>
        </div>
      </Card>
    </>
  )
}
export function ModuloFuturo({ titulo }: { titulo: string }) {
  return (
    <>
      <header className="topbar">
        <h1>{titulo}</h1>
      </header>
      <Empty>Em construção</Empty>
    </>
  )
}

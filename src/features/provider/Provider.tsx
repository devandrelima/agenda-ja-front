import { useState, type FormEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { caminhos } from '../../app/paths'
import { repositorioMock } from '../../data/mockRepository'
import { paraChaveData } from '../../domain/availability'
import type { Profissional, Servico } from '../../domain/models'
import { Badge, Button, Card, Empty, Field, Logo } from '../../design-system/ui'

type IconeMenu = 'inicio' | 'agenda' | 'profissionais' | 'servicos' | 'clientes' | 'relatorios'

const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
  }

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {caminhos[nome]}
    </svg>
  )
}

export function LayoutPrestador({ children }: { children: React.ReactNode }) {
  return (
    <div className="provider">
      <aside className="sidebar">
        <Logo />
        <nav>
          {itensDoMenu.map(({ caminho, rotulo, icone }) => (
            <NavLink key={caminho} to={caminho} end={caminho === '/painel'}>
              <IconeDaNavegacao nome={icone} />
              <span className="nav-label">{rotulo}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
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
export function Dashboard() {
  const navegar = useNavigate()
  const [linkCopiado, definirLinkCopiado] = useState(false)
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
    const linkDoNegocio = new URL(caminhos.estabelecimento, window.location.origin).toString()
    await navigator.clipboard.writeText(linkDoNegocio)
    definirLinkCopiado(true)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="muted">Visão geral</p>
          <h1>Olá, equipe Aurora</h1>
        </div>
        <div className="topbar-actions">
          <Button
            className="copy-business-link"
            type="button"
            onClick={() => void copiarLinkDoNegocio()}
            aria-label="Copiar link da página do negócio"
            title="Copiar link da página do negócio"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" />
              <path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15" />
            </svg>
          </Button>
          <Button onClick={() => navegar(caminhos.agendamento, { state: { origem: 'painel' } })}>
            Novo agendamento
          </Button>
          <span className="sr-only" role="status">
            {linkCopiado ? 'Link da página do negócio copiado.' : ''}
          </span>
        </div>
      </header>
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
      <section className="section">
        <ProximosAtendimentos />
      </section>
    </>
  )
}
export function Agenda() {
  const agendamentos = repositorioMock.buscarAgendamentos()
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
        <select aria-label="Filtrar por profissional">
          <option>Todos os profissionais</option>
          {profissionais.map((profissional) => (
            <option key={profissional.id}>{profissional.nome}</option>
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

const diasDaSemana = [
  { valor: 1, rotulo: 'seg' },
  { valor: 2, rotulo: 'ter' },
  { valor: 3, rotulo: 'qua' },
  { valor: 4, rotulo: 'qui' },
  { valor: 5, rotulo: 'sex' },
  { valor: 6, rotulo: 'sáb' },
  { valor: 0, rotulo: 'dom' },
]

function FormularioProfissional({
  profissional,
  servicos,
  aoSalvar,
  aoVoltar,
}: {
  profissional?: Profissional
  servicos: Servico[]
  aoSalvar: (dados: Pick<Profissional, 'nome' | 'idsServicos' | 'diasDeAtendimento'>) => void
  aoVoltar: () => void
}) {
  const [erro, definirErro] = useState('')

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = new FormData(evento.currentTarget)
    const idsServicos = form.getAll('servicos').map(String)
    const diasDeAtendimento = form.getAll('dias').map(Number)
    if (!idsServicos.length) return definirErro('Selecione ao menos um serviço.')
    if (!diasDeAtendimento.length) return definirErro('Selecione ao menos um dia de atendimento.')
    aoSalvar({
      nome: profissional?.nome ?? String(form.get('nome')).trim(),
      idsServicos,
      diasDeAtendimento,
    })
  }

  return (
    <Card>
      <form className="form" onSubmit={enviar}>
        {profissional ? (
          <h2>{profissional.nome}</h2>
        ) : (
          <Field name="nome" label="Nome do profissional" required />
        )}
        <fieldset className="checkbox-group">
          <legend>Serviços</legend>
          {servicos.map((servico) => (
            <label key={servico.id}>
              <input
                type="checkbox"
                name="servicos"
                value={servico.id}
                defaultChecked={profissional?.idsServicos.includes(servico.id)}
              />
              {servico.nome}
            </label>
          ))}
        </fieldset>
        <fieldset className="checkbox-group">
          <legend>Horários</legend>
          {diasDaSemana.map(({ valor, rotulo }) => (
            <label key={valor}>
              <input
                type="checkbox"
                name="dias"
                value={valor}
                defaultChecked={profissional?.diasDeAtendimento.includes(valor)}
              />
              {rotulo}
            </label>
          ))}
        </fieldset>
        {erro && (
          <small className="form-error" role="alert">
            {erro}
          </small>
        )}
        <p className="notice">
          As alterações valem somente nesta demonstração e não são enviadas ao servidor.
        </p>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={aoVoltar}>
            Voltar
          </Button>
          <Button>Salvar</Button>
        </div>
      </form>
    </Card>
  )
}
export function Profissionais() {
  const servicos = repositorioMock.buscarServicos()
  const [profissionais, definirProfissionais] = useState(() =>
    repositorioMock.buscarProfissionais(),
  )
  const [emEdicao, definirEmEdicao] = useState<{ id?: string }>()
  const [mensagem, definirMensagem] = useState('')
  const profissionalEmEdicao = profissionais.find(
    (profissional) => profissional.id === emEdicao?.id,
  )

  function salvar(dados: Pick<Profissional, 'nome' | 'idsServicos' | 'diasDeAtendimento'>) {
    if (profissionalEmEdicao) {
      definirProfissionais((atuais) =>
        atuais.map((profissional) =>
          profissional.id === profissionalEmEdicao.id
            ? { ...profissional, ...dados }
            : profissional,
        ),
      )
      definirMensagem(`Alterações de ${dados.nome} salvas.`)
    } else {
      definirProfissionais((atuais) => [
        ...atuais,
        {
          ...dados,
          id: `profissional-${atuais.length + 1}`,
          especialidades: servicos
            .filter((servico) => dados.idsServicos.includes(servico.id))
            .map((servico) => servico.nome),
          diasDeFolga: [],
        },
      ])
      definirMensagem(`${dados.nome} adicionado(a) à equipe.`)
    }
    definirEmEdicao(undefined)
  }

  if (emEdicao)
    return (
      <>
        <header className="topbar">
          <h1>{profissionalEmEdicao ? 'Profissionais' : 'Novo profissional'}</h1>
        </header>
        <FormularioProfissional
          profissional={profissionalEmEdicao}
          servicos={servicos}
          aoSalvar={salvar}
          aoVoltar={() => definirEmEdicao(undefined)}
        />
      </>
    )
  return (
    <>
      <header className="topbar">
        <h1>Profissionais</h1>
        <Button
          onClick={() => {
            definirMensagem('')
            definirEmEdicao({})
          }}
        >
          Novo profissional
        </Button>
      </header>
      {mensagem && (
        <p className="notice" role="status">
          {mensagem}
        </p>
      )}
      <div className="professional-list">
        {profissionais.map((profissional) => (
          <Card className="professional" key={profissional.id}>
            <div>
              <strong>{profissional.nome}</strong>
              <p>{profissional.especialidades.join(', ')}</p>
            </div>
            <Button
              variant="ghost"
              aria-label={`Ver detalhes de ${profissional.nome}`}
              onClick={() => {
                definirMensagem('')
                definirEmEdicao({ id: profissional.id })
              }}
            >
              Ver detalhes ›
            </Button>
          </Card>
        ))}
      </div>
    </>
  )
}

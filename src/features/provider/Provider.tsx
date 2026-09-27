import { NavLink } from 'react-router-dom'
import { repositorioMock } from '../../data/mockRepository'
import { paraChaveData } from '../../domain/availability'
import { Badge, Button, Card, Empty, Logo } from '../../design-system/ui'
const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const itensDoMenu = [
  ['/painel', 'Início'],
  ['/painel/agenda', 'Agenda'],
  ['/painel/profissionais', 'Profissionais'],
  ['/painel/servicos', 'Serviços'],
  ['/painel/clientes', 'Clientes'],
  ['/painel/relatorios', 'Relatórios'],
]
export function LayoutPrestador({ children }: { children: React.ReactNode }) {
  return (
    <div className="provider">
      <aside className="sidebar">
        <Logo />
        <nav>
          {itensDoMenu.map(([caminho, rotulo]) => (
            <NavLink key={caminho} to={caminho} end={caminho === '/painel'}>
              {rotulo}
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
  return (
    <>
      <header className="topbar">
        <div>
          <p className="muted">Visão geral</p>
          <h1>Olá, equipe Aurora</h1>
        </div>
        <Button>Novo agendamento</Button>
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
export function ModuloFuturo() {
  return (
    <>
      <header className="topbar">
        <h1>Módulo em preparação</h1>
      </header>
      <Empty>
        Esta prévia não inclui CRUD ou relatórios fictícios. O módulo será construído em uma próxima
        etapa.
      </Empty>
    </>
  )
}

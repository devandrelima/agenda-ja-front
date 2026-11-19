import { useEffect, useState } from 'react'
import { useAutenticacao } from '../../app/useAutenticacao'
import { buscarRelatorio, type RelatorioOperacional } from '../../data/operational'
import { Button, Card, Empty, Field } from '../../design-system/ui'

const dataHoje = () => new Date().toISOString().slice(0, 10)
const inicioDoMes = () => `${dataHoje().slice(0, 8)}01`
const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function Relatorios() {
  const { sessao } = useAutenticacao()
  const [inicio, definirInicio] = useState(inicioDoMes)
  const [fim, definirFim] = useState(dataHoje)
  const [relatorio, definirRelatorio] = useState<RelatorioOperacional | null>(null)
  const [erro, definirErro] = useState('')
  const [carregando, definirCarregando] = useState(true)

  async function consultar() {
    if (sessao?.estabelecimentoId == null) return
    if (inicio > fim) {
      definirErro('A data inicial não pode ser posterior à data final.')
      return
    }
    definirCarregando(true)
    definirErro('')
    try {
      definirRelatorio(await buscarRelatorio(sessao.estabelecimentoId, inicio, fim))
    } catch (falha) {
      definirErro(falha instanceof Error ? falha.message : 'Não foi possível carregar o relatório.')
    } finally {
      definirCarregando(false)
    }
  }

  useEffect(() => {
    const temporizador = window.setTimeout(() => void consultar(), 0)
    return () => window.clearTimeout(temporizador)
    // Carrega novamente apenas ao trocar o estabelecimento autenticado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao?.estabelecimentoId])

  return (
    <>
      <header className="topbar">
        <div>
          <p className="muted">Acompanhe o desempenho do seu negócio</p>
          <h1>Relatórios</h1>
        </div>
      </header>
      <Card className="report-filter">
        <Field label="Data inicial" type="date" value={inicio} max={fim} onChange={(e) => definirInicio(e.target.value)} />
        <Field label="Data final" type="date" value={fim} min={inicio} max={dataHoje()} onChange={(e) => definirFim(e.target.value)} />
        <Button type="button" disabled={carregando} onClick={() => void consultar()}>
          {carregando ? 'Atualizando...' : 'Atualizar relatório'}
        </Button>
      </Card>
      {erro ? (
        <Card><p className="auth-error" role="alert">{erro}</p></Card>
      ) : carregando && !relatorio ? (
        <Empty>Carregando relatório...</Empty>
      ) : relatorio && (
        <>
          <div className="metric-grid report-metrics">
            <Card className="metric"><span className="muted">Atendimentos concluídos</span><strong>{relatorio.totalConcluidos}</strong></Card>
            <Card className="metric"><span className="muted">Faturamento concluído</span><strong>{moeda(relatorio.faturamentoConcluidos)}</strong></Card>
            <Card className="metric"><span className="muted">Taxa de confirmação</span><strong>{Number(relatorio.taxaConfirmacao).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</strong></Card>
          </div>
          <section className="section dashboard-section">
            <Card>
              <h2>Serviços mais procurados</h2>
              {relatorio.servicosMaisPopulares.length === 0 ? <Empty>Nenhum agendamento no período selecionado.</Empty> : (
                <ol className="popular-services">
                  {relatorio.servicosMaisPopulares.map((servico) => <li key={servico.servicoId}><strong>{servico.servicoNome}</strong><span>{servico.quantidadeAgendamentos} agendamento{servico.quantidadeAgendamentos === 1 ? '' : 's'}</span></li>)}
                </ol>
              )}
            </Card>
          </section>
        </>
      )}
    </>
  )
}

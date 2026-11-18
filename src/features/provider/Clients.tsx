import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { caminhos } from '../../app/paths'
import { useAutenticacao } from '../../app/useAutenticacao'
import { ErroApi } from '../../data/api'
import {
  buscarHistoricoDoCliente,
  listarClientes,
  type ClienteHistorico,
  type ClienteResumo,
} from '../../data/clients'
import { Badge, Button, Card, Empty } from '../../design-system/ui'
import { rotuloDoStatus } from '../../domain/appointmentStatus'
import { filtrarClientesPorNome, linkWhatsapp, rotuloDeVisitas } from '../../domain/clients'
import { formatarTelefone } from '../../domain/contact'

const formatarValor = (valor: number) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
// O backend envia horário local sem fuso (`2026-11-07T14:00:00`); exibe sem converter.
const formatarData = (iso: string) => {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}
const formatarDataHora = (iso: string) => `${formatarData(iso)} às ${iso.slice(11, 16)}`

function mensagemFalha(falha: unknown) {
  if (falha instanceof ErroApi) {
    if (falha.status === 401) return 'Sua sessão expirou. Atualize a página para entrar novamente.'
    if (falha.status === 403) return 'Você não tem acesso aos clientes deste estabelecimento.'
    if (falha.status === 404) return 'Cliente não encontrado.'
    return falha.message
  }
  return falha instanceof Error ? falha.message : 'Não foi possível carregar os clientes.'
}

function SemEstabelecimento({ titulo }: { titulo: string }) {
  return (
    <>
      <header className="topbar">
        <h1>{titulo}</h1>
      </header>
      <p className="auth-error" role="alert">
        Esta conta não possui estabelecimento vinculado.
      </p>
    </>
  )
}

export function Clientes() {
  const { sessao } = useAutenticacao()
  const estabelecimentoId = sessao?.estabelecimentoId
  const [clientes, definirClientes] = useState<ClienteResumo[]>([])
  const [busca, definirBusca] = useState('')
  const [carregando, definirCarregando] = useState(true)
  const [erro, definirErro] = useState('')
  const [tentativa, definirTentativa] = useState(0)

  useEffect(() => {
    if (estabelecimentoId == null) return
    let ativo = true
    listarClientes(estabelecimentoId)
      .then((dados) => ativo && definirClientes(dados))
      .catch((falha) => ativo && definirErro(mensagemFalha(falha)))
      .finally(() => ativo && definirCarregando(false))
    return () => {
      ativo = false
    }
  }, [estabelecimentoId, tentativa])

  if (estabelecimentoId == null) return <SemEstabelecimento titulo="Clientes" />

  const visiveis = filtrarClientesPorNome(clientes, busca)

  return (
    <>
      <header className="topbar">
        <h1>Clientes</h1>
      </header>
      {carregando ? (
        <p role="status">Carregando clientes...</p>
      ) : erro ? (
        <Card>
          <p className="auth-error" role="alert">
            {erro}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              definirErro('')
              definirCarregando(true)
              definirTentativa((atual) => atual + 1)
            }}
          >
            Tentar novamente
          </Button>
        </Card>
      ) : clientes.length === 0 ? (
        <Empty>Nenhum cliente com agendamentos neste estabelecimento ainda.</Empty>
      ) : (
        <>
          <input
            className="client-search"
            type="search"
            aria-label="Buscar cliente por nome"
            placeholder="Buscar cliente por nome"
            value={busca}
            onChange={(evento) => definirBusca(evento.target.value)}
          />
          {visiveis.length === 0 ? (
            <Empty>Nenhum cliente encontrado para “{busca.trim()}”.</Empty>
          ) : (
            <div className="service-list">
              {visiveis.map((cliente) => (
                <Link
                  key={cliente.id}
                  className="client-link"
                  to={`${caminhos.clientes}/${cliente.id}`}
                >
                  <Card className="service-card">
                    <div>
                      <h2>{cliente.nome}</h2>
                      <p>
                        {formatarTelefone(cliente.telefone)}
                        {cliente.ultimaVisita && ` · Última visita em ${formatarData(cliente.ultimaVisita)}`}
                      </p>
                    </div>
                    <span className="client-count">{rotuloDeVisitas(cliente.totalVisitas)}</span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

export function ClienteDetalhe() {
  const { sessao } = useAutenticacao()
  const estabelecimentoId = sessao?.estabelecimentoId
  const { clienteId } = useParams()
  const idNumerico = Number(clienteId)
  const idValido = Number.isSafeInteger(idNumerico)
  const [cliente, definirCliente] = useState<ClienteHistorico>()
  const [carregando, definirCarregando] = useState(true)
  const [erro, definirErro] = useState('')
  const [tentativa, definirTentativa] = useState(0)

  useEffect(() => {
    if (estabelecimentoId == null) return
    if (!idValido) return
    let ativo = true
    buscarHistoricoDoCliente(estabelecimentoId, idNumerico)
      .then((dados) => ativo && definirCliente(dados))
      .catch((falha) => ativo && definirErro(mensagemFalha(falha)))
      .finally(() => ativo && definirCarregando(false))
    return () => {
      ativo = false
    }
  }, [estabelecimentoId, idNumerico, idValido, tentativa])

  if (estabelecimentoId == null) return <SemEstabelecimento titulo="Cliente" />

  const erroExibido = idValido ? erro : 'Cliente não encontrado.'

  return (
    <>
      <header className="topbar">
        <h1>{cliente?.nome ?? 'Cliente'}</h1>
      </header>
      <Link className="client-back-link" to={caminhos.clientes}>
        ← Voltar para clientes
      </Link>
      {idValido && carregando ? (
        <p role="status">Carregando histórico...</p>
      ) : erroExibido || !cliente ? (
        <Card>
          <p className="auth-error" role="alert">
            {erroExibido}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              definirErro('')
              definirCarregando(true)
              definirTentativa((atual) => atual + 1)
            }}
          >
            Tentar novamente
          </Button>
        </Card>
      ) : (
        <>
          <Card className="client-contact">
            <h2>Contato</h2>
            <p>
              Telefone:{' '}
              <a href={`tel:+55${cliente.telefone.replace(/\D/g, '')}`}>
                {formatarTelefone(cliente.telefone)}
              </a>
            </p>
            <a
              className="button secondary"
              href={linkWhatsapp(cliente.telefone)}
              target="_blank"
              rel="noreferrer"
            >
              Chamar no WhatsApp
            </a>
            <p>
              Serviço mais frequente: <strong>{cliente.servicoMaisFrequente}</strong>
            </p>
          </Card>
          <h2 className="client-history-title">Histórico de agendamentos</h2>
          {cliente.agendamentos.length === 0 ? (
            <Empty>Este cliente ainda não tem agendamentos.</Empty>
          ) : (
            <div className="service-list">
              {cliente.agendamentos.map((agendamento) => (
                <Card className="service-card" key={agendamento.id}>
                  <div>
                    <h3>{agendamento.servicoNome}</h3>
                    <p>
                      {formatarDataHora(agendamento.dataHoraInicio)} · {agendamento.profissionalNome}{' '}
                      · {formatarValor(agendamento.valor)}
                    </p>
                  </div>
                  <Badge status={rotuloDoStatus(agendamento.status)} />
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

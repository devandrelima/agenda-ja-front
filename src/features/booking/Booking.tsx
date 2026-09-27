import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { repositorioMock } from '../../data/mockRepository'
import {
  adicionarDias,
  buscarHorariosDisponiveis,
  buscarProfissionaisDoServico,
  paraChaveData,
} from '../../domain/availability'
import type { EscolhasAgendamento } from '../../domain/models'
import { Button, Card, Field, Steps } from '../../design-system/ui'
const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export function PaginaEstabelecimento() {
  const estabelecimento = repositorioMock.buscarEstabelecimento()
  const servicos = repositorioMock.buscarServicos()
  return (
    <>
      <header className="public-header">
        <div className="container">
          <Link to="/">
            <strong>agendaJá</strong>
          </Link>
          <Link to="/login">Área do prestador</Link>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">Agendamento simples e acolhedor</span>
              <h1>{estabelecimento.nome}</h1>
              <p>
                {estabelecimento.categoria} · {estabelecimento.endereco}
              </p>
              <p>
                ★ {estabelecimento.avaliacao.toLocaleString('pt-BR')}{' '}
                <small>(avaliação de demonstração)</small>
              </p>
              <Link to="/agendar">
                <Button>Fazer agendamento</Button>
              </Link>
            </div>
            <div className="hero-art" aria-hidden="true">
              ✦
            </div>
          </div>
        </section>
        <section className="section container">
          <h2>Serviços e horários</h2>
          <p className="muted">{estabelecimento.horarioDeFuncionamento}</p>
          <div className="service-grid">
            {servicos.map((servico) => (
              <Card className="service" key={servico.id}>
                <div>
                  <strong>{servico.nome}</strong>
                  <p className="muted">{servico.duracao} min</p>
                </div>
                <strong>{formatarMoeda(servico.valor)}</strong>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
export function Agendamento() {
  const [etapa, definirEtapa] = useState(1)
  const [escolhas, definirEscolhas] = useState<EscolhasAgendamento>({})
  const servicos = repositorioMock.buscarServicos()
  const profissionais = repositorioMock.buscarProfissionais()
  const servicoSelecionado = servicos.find((servico) => servico.id === escolhas.idServico)
  const profissionaisDisponiveis = servicoSelecionado
    ? buscarProfissionaisDoServico(profissionais, servicoSelecionado.id)
    : []
  const profissionalSelecionado = profissionais.find(
    (profissional) => profissional.id === escolhas.idProfissional,
  )
  const datas = Array.from({ length: 6 }, (_, indice) =>
    paraChaveData(adicionarDias(new Date(), indice + 1)),
  )
  const times = useMemo(
    () =>
      servicoSelecionado && profissionalSelecionado && escolhas.data
        ? buscarHorariosDisponiveis(
            escolhas.data,
            profissionalSelecionado,
            servicoSelecionado,
            repositorioMock.buscarAgendamentos(),
            servicos,
          )
        : [],
    [servicoSelecionado, profissionalSelecionado, escolhas.data, servicos],
  )
  const irParaEtapa = (numeroDaEtapa: number) => definirEtapa(numeroDaEtapa)
  function selecionarServico(idServico: string) {
    definirEscolhas({ idServico })
    irParaEtapa(2)
  }
  function selecionarProfissional(idProfissional: string) {
    definirEscolhas((atual) => ({ ...atual, idProfissional, data: undefined, horario: undefined }))
    irParaEtapa(3)
  }
  if (etapa === 5 && servicoSelecionado && profissionalSelecionado && escolhas.cliente)
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
              <span>{profissionalSelecionado.nome}</span>
              <span>
                {new Date(`${escolhas.data}T${escolhas.horario}`).toLocaleString('pt-BR', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <Link to="/">
              <Button variant="secondary">Voltar ao estabelecimento</Button>
            </Link>
          </Card>
        </div>
      </main>
    )
  return (
    <main className="booking container">
      <div className="booking-main">
        <Link to="/">← Ateliê Aurora</Link>
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
            <button
              className="option"
              onClick={() =>
                profissionaisDisponiveis[0] &&
                selecionarProfissional(profissionaisDisponiveis[0].id)
              }
            >
              <span>
                <strong>Qualquer profissional</strong>
                <br />
                <small>Escolhemos alguém disponível</small>
              </span>
            </button>
            {profissionaisDisponiveis.length ? (
              profissionaisDisponiveis.map((profissional) => (
                <button
                  className={`option ${escolhas.idProfissional === profissional.id ? 'selected' : ''}`}
                  onClick={() => selecionarProfissional(profissional.id)}
                  key={profissional.id}
                >
                  <span>
                    <strong>{profissional.nome}</strong>
                    <br />
                    <small>{profissional.especialidades.join(', ')}</small>
                  </span>
                </button>
              ))
            ) : (
              <p>Nenhum profissional atende este serviço.</p>
            )}
            <Button variant="ghost" onClick={() => irParaEtapa(1)}>
              Voltar
            </Button>
          </Card>
        )}
        {etapa === 3 && (
          <Card>
            <h2>Data e horário</h2>
            <div className="filters">
              {datas.map((data) => (
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
                  {times.map((t) => (
                    <button
                      className={escolhas.horario === t ? 'selected' : ''}
                      key={t}
                      onClick={() => definirEscolhas((atual) => ({ ...atual, horario: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {!times.length && <p className="notice">Não há horários disponíveis nesta data.</p>}
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
              onSubmit={(e) => {
                e.preventDefault()
                const form = new FormData(e.currentTarget)
                definirEscolhas((atual) => ({
                  ...atual,
                  cliente: {
                    nome: String(form.get('name')),
                    telefone: String(form.get('phone')),
                    email: String(form.get('email')),
                  },
                }))
                irParaEtapa(5)
              }}
            >
              <Field name="name" label="Nome completo" required />
              <Field name="phone" label="Telefone / WhatsApp" inputMode="tel" required />
              <Field name="email" label="E-mail" type="email" required />
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

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { caminhos } from '../../app/paths'
import { useAutenticacao } from '../../app/useAutenticacao'
import { ErroApi } from '../../data/api'
import {
  atualizarDisponibilidade,
  buscarDisponibilidade,
  cadastrarProfissional,
  editarProfissional,
  listarProfissionais,
} from '../../data/professionals'
import type {
  DadosProfissional,
  Disponibilidade,
  Folga,
  Jornada,
  Profissional,
} from '../../data/professionals'
import { listarServicos } from '../../data/services'
import type { Servico } from '../../data/services'
import { Button, Card, Empty, Field } from '../../design-system/ui'

const diasDaSemana = [
  { valor: 1, rotulo: 'seg', nome: 'segunda' },
  { valor: 2, rotulo: 'ter', nome: 'terça' },
  { valor: 3, rotulo: 'qua', nome: 'quarta' },
  { valor: 4, rotulo: 'qui', nome: 'quinta' },
  { valor: 5, rotulo: 'sex', nome: 'sexta' },
  { valor: 6, rotulo: 'sáb', nome: 'sábado' },
  { valor: 0, rotulo: 'dom', nome: 'domingo' },
]

const disponibilidadeVazia: Disponibilidade = { jornadas: [], folgas: [] }

type Turno = Jornada & { chave: string }

// Chave só para as listas do React. Não usar crypto.randomUUID(): ele só existe em contexto
// seguro (HTTPS ou localhost), e em produção via HTTP a chamada derrubava a página.
let ultimaChave = 0
const novaChave = () => String(++ultimaChave)

function mensagemFalha(falha: unknown) {
  if (falha instanceof ErroApi) {
    if (falha.status === 401) return 'Sua sessão expirou. Atualize a página para entrar novamente.'
    if (falha.status === 403) return 'Você não tem acesso aos profissionais deste estabelecimento.'
    return falha.message
  }
  return falha instanceof Error ? falha.message : 'Não foi possível concluir a solicitação.'
}

function nomesDosServicos(idsServicos: number[], servicos: Servico[]) {
  return servicos
    .filter((servico) => idsServicos.includes(servico.id))
    .map((servico) => servico.nome)
}

// Espelha as regras do backend, para evitar que só uma das duas requisições seja salva.
function validarDisponibilidade(turnos: Turno[]) {
  if (!turnos.length) return 'Adicione ao menos um turno de atendimento.'
  if (turnos.some((turno) => !turno.horaInicio || !turno.horaFim))
    return 'Preencha o início e o fim de todos os turnos.'
  for (const { valor, nome } of diasDaSemana) {
    const doDia = turnos.filter((turno) => turno.diaSemana === valor)
    if (doDia.some((turno) => turno.horaInicio >= turno.horaFim))
      return `Os turnos de ${nome} devem começar antes de terminar.`
    const sobrepostos = doDia.some((turno, indice) =>
      doDia
        .slice(indice + 1)
        .some((outro) => turno.horaInicio < outro.horaFim && outro.horaInicio < turno.horaFim),
    )
    if (sobrepostos) return `Há turnos sobrepostos em ${nome}.`
  }
  return ''
}

const formatarData = (data: string) => data.split('-').reverse().join('/')

function DialogoFolgas({
  estabelecimentoId,
  profissional,
  aoSalvar,
  aoFechar,
}: {
  estabelecimentoId: number
  profissional: Profissional
  aoSalvar: (folgas: Folga[]) => void
  aoFechar: () => void
}) {
  const [disponibilidade, definirDisponibilidade] = useState<Disponibilidade | null>(null)
  const [erroCarga, definirErroCarga] = useState('')
  const [tentativa, definirTentativa] = useState(0)
  const [salvando, definirSalvando] = useState(false)
  const [erro, definirErro] = useState('')
  const [mensagem, definirMensagem] = useState('')

  useEffect(() => {
    function fecharComEsc(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', fecharComEsc)
    return () => document.removeEventListener('keydown', fecharComEsc)
  }, [aoFechar])

  useEffect(() => {
    let ativo = true
    buscarDisponibilidade(estabelecimentoId, profissional.id)
      .then((dados) => {
        if (ativo) definirDisponibilidade(dados)
      })
      .catch((falha) => {
        if (ativo) definirErroCarga(mensagemFalha(falha))
      })
    return () => {
      ativo = false
    }
  }, [estabelecimentoId, profissional.id, tentativa])

  // O backend substitui turnos e folgas juntos; os turnos são reenviados como foram carregados.
  async function salvarFolgas(folgas: Folga[], sucesso: string) {
    if (!disponibilidade) return false
    definirSalvando(true)
    definirErro('')
    definirMensagem('')
    try {
      const salva = await atualizarDisponibilidade(estabelecimentoId, profissional.id, {
        jornadas: disponibilidade.jornadas,
        folgas,
      })
      definirDisponibilidade(salva)
      definirMensagem(sucesso)
      aoSalvar(salva.folgas)
      return true
    } catch (falha) {
      definirErro(mensagemFalha(falha))
      return false
    } finally {
      definirSalvando(false)
    }
  }

  async function adicionar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!disponibilidade) return
    const formulario = evento.currentTarget
    const form = new FormData(formulario)
    const data = String(form.get('data') ?? '')
    definirMensagem('')
    if (!data) return definirErro('Informe a data da folga.')
    if (disponibilidade.folgas.some((folga) => folga.data === data))
      return definirErro('Já existe uma folga nesta data.')
    const folga = { data, motivo: String(form.get('motivo') ?? '').trim() }
    const salvou = await salvarFolgas(
      [...disponibilidade.folgas, folga],
      `Folga de ${formatarData(data)} adicionada.`,
    )
    if (salvou) formulario.reset()
  }

  const folgasOrdenadas = [...(disponibilidade?.folgas ?? [])].sort((a, b) =>
    a.data.localeCompare(b.data),
  )

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar()
      }}
    >
      <section
        className="card modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folgas-titulo"
      >
        <h2 id="folgas-titulo">Folgas de {profissional.nome}</h2>
        {erroCarga ? (
          <div className="form">
            <p className="auth-error" role="alert">
              {erroCarga}
            </p>
            <div className="form-actions">
              <Button type="button" variant="ghost" onClick={aoFechar}>
                Fechar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  definirErroCarga('')
                  definirTentativa((atual) => atual + 1)
                }}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : !disponibilidade ? (
          <p role="status">Carregando folgas...</p>
        ) : (
          <div className="form">
            <div className="day-off-list">
              {folgasOrdenadas.length === 0 && (
                <small className="schedule-empty">Nenhuma folga cadastrada.</small>
              )}
              {folgasOrdenadas.map((folga) => (
                <div className="day-off" key={folga.data}>
                  <div>
                    <strong>{formatarData(folga.data)}</strong>
                    {folga.motivo && <span>{folga.motivo}</span>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={salvando}
                    aria-label={`Remover folga de ${formatarData(folga.data)}`}
                    onClick={() =>
                      void salvarFolgas(
                        disponibilidade.folgas.filter((atual) => atual.data !== folga.data),
                        `Folga de ${formatarData(folga.data)} removida.`,
                      )
                    }
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <form className="form" onSubmit={(evento) => void adicionar(evento)} noValidate>
              <Field name="data" label="Data da folga" type="date" autoFocus />
              <Field name="motivo" label="Motivo (opcional)" maxLength={255} />
              {erro && (
                <small className="form-error" role="alert">
                  {erro}
                </small>
              )}
              {mensagem && (
                <p className="notice" role="status">
                  {mensagem}
                </p>
              )}
              <div className="form-actions">
                <Button type="button" variant="ghost" onClick={aoFechar} disabled={salvando}>
                  Fechar
                </Button>
                <Button disabled={salvando}>{salvando ? 'Salvando...' : 'Adicionar folga'}</Button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}

function FormularioProfissional({
  profissional,
  disponibilidade,
  servicos,
  aoSalvar,
  aoVoltar,
}: {
  profissional?: Profissional
  disponibilidade: Disponibilidade
  servicos: Servico[]
  aoSalvar: (dados: DadosProfissional, disponibilidade: Disponibilidade) => Promise<void>
  aoVoltar: () => void
}) {
  const [turnos, definirTurnos] = useState<Turno[]>(() =>
    disponibilidade.jornadas.map((jornada) => ({ ...jornada, chave: novaChave() })),
  )
  const [enviando, definirEnviando] = useState(false)
  const [erro, definirErro] = useState('')
  const [errosCampos, definirErrosCampos] = useState<Record<string, string>>({})

  function adicionarTurno(diaSemana: number) {
    const ultimo = turnos.filter((turno) => turno.diaSemana === diaSemana).at(-1)
    definirTurnos((atuais) => [
      ...atuais,
      {
        chave: novaChave(),
        diaSemana,
        horaInicio: ultimo ? ultimo.horaFim : '08:00',
        horaFim: ultimo ? '' : '18:00',
      },
    ])
  }

  function alterarTurno(chave: string, campo: 'horaInicio' | 'horaFim', valor: string) {
    definirTurnos((atuais) =>
      atuais.map((turno) => (turno.chave === chave ? { ...turno, [campo]: valor } : turno)),
    )
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = new FormData(evento.currentTarget)
    const idsServicos = form.getAll('servicos').map(Number)
    definirErrosCampos({})
    if (!idsServicos.length) return definirErro('Selecione ao menos um serviço.')
    const falhaDisponibilidade = validarDisponibilidade(turnos)
    if (falhaDisponibilidade) return definirErro(falhaDisponibilidade)
    definirErro('')

    const jornadas = turnos.map(({ diaSemana, horaInicio, horaFim }) => ({
      diaSemana,
      horaInicio,
      horaFim,
    }))
    // As folgas são geridas na lista de profissionais; aqui são reenviadas sem alteração,
    // porque o backend substitui turnos e folgas na mesma requisição.
    const { folgas } = disponibilidade

    definirEnviando(true)
    try {
      await aoSalvar(
        {
          nome: profissional?.nome ?? String(form.get('nome')).trim(),
          // As especialidades são os serviços que o profissional realiza.
          especialidades: nomesDosServicos(idsServicos, servicos),
          idsServicos,
          diasDeAtendimento: [...new Set(jornadas.map((jornada) => jornada.diaSemana))],
          diasDeFolga: folgas.map((folga) => folga.data),
        },
        { jornadas, folgas },
      )
    } catch (falha) {
      if (falha instanceof ErroApi) definirErrosCampos(falha.erros)
      definirErro(mensagemFalha(falha))
    } finally {
      definirEnviando(false)
    }
  }

  return (
    <Card>
      <form className="form" onSubmit={(evento) => void enviar(evento)}>
        {profissional ? (
          <h2>{profissional.nome}</h2>
        ) : (
          <Field
            name="nome"
            label="Nome do profissional"
            maxLength={100}
            error={errosCampos.nome}
            required
          />
        )}
        <fieldset className="checkbox-group">
          <legend>Serviços</legend>
          {servicos.length ? (
            servicos.map((servico) => (
              <label key={servico.id}>
                <input
                  type="checkbox"
                  name="servicos"
                  value={servico.id}
                  defaultChecked={profissional?.idsServicos.includes(servico.id)}
                />
                {servico.nome}
              </label>
            ))
          ) : (
            <p>
              Nenhum serviço cadastrado. <Link to={caminhos.servicos}>Cadastrar serviços</Link>
            </p>
          )}
        </fieldset>
        <fieldset className="schedule">
          <legend>Horários</legend>
          {diasDaSemana.map(({ valor, rotulo, nome }) => {
            const doDia = turnos.filter((turno) => turno.diaSemana === valor)
            return (
              <div className="schedule-row" key={valor}>
                <span className="schedule-day">{rotulo}</span>
                <div className="schedule-items">
                  {doDia.length === 0 && <small className="schedule-empty">Sem atendimento</small>}
                  {doDia.map((turno, indice) => (
                    <div className="schedule-item" key={turno.chave}>
                      <input
                        type="time"
                        aria-label={`Início do turno ${indice + 1} de ${nome}`}
                        value={turno.horaInicio}
                        onChange={(evento) =>
                          alterarTurno(turno.chave, 'horaInicio', evento.target.value)
                        }
                      />
                      <span>às</span>
                      <input
                        type="time"
                        aria-label={`Fim do turno ${indice + 1} de ${nome}`}
                        value={turno.horaFim}
                        onChange={(evento) =>
                          alterarTurno(turno.chave, 'horaFim', evento.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Remover turno ${indice + 1} de ${nome}`}
                        onClick={() =>
                          definirTurnos((atuais) =>
                            atuais.filter((atual) => atual.chave !== turno.chave),
                          )
                        }
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Adicionar turno em ${nome}`}
                  onClick={() => adicionarTurno(valor)}
                >
                  + turno
                </Button>
              </div>
            )
          })}
        </fieldset>
        {erro && (
          <small className="form-error" role="alert">
            {erro}
          </small>
        )}
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={aoVoltar} disabled={enviando}>
            Voltar
          </Button>
          <Button disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Card>
  )
}

export function Profissionais() {
  const { sessao } = useAutenticacao()
  const estabelecimentoId = sessao?.estabelecimentoId
  const [profissionais, definirProfissionais] = useState<Profissional[]>([])
  const [servicos, definirServicos] = useState<Servico[]>([])
  const [carregando, definirCarregando] = useState(true)
  const [erroLista, definirErroLista] = useState('')
  const [tentativa, definirTentativa] = useState(0)
  const [emEdicao, definirEmEdicao] = useState<Profissional | 'novo' | null>(null)
  // A chave só muda ao abrir o formulário, para que ele não perca o que foi digitado quando
  // um cadastro é salvo e passa a ser editado (ver `salvar`).
  const [chaveFormulario, definirChaveFormulario] = useState(0)
  const [disponibilidade, definirDisponibilidade] = useState<Disponibilidade | null>(null)
  const [erroDisponibilidade, definirErroDisponibilidade] = useState('')
  const consultaDisponibilidade = useRef(0)
  const [mensagem, definirMensagem] = useState('')
  const [folgasDe, definirFolgasDe] = useState<Profissional | null>(null)
  const gatilhoFolgas = useRef<HTMLElement | null>(null)

  function abrirFolgas(profissional: Profissional) {
    gatilhoFolgas.current = document.activeElement as HTMLElement | null
    definirMensagem('')
    definirFolgasDe(profissional)
  }

  const fecharFolgas = useCallback(() => {
    definirFolgasDe(null)
    gatilhoFolgas.current?.focus()
  }, [])

  useEffect(() => {
    if (estabelecimentoId == null) return
    let ativo = true
    Promise.all([listarProfissionais(estabelecimentoId), listarServicos(estabelecimentoId)])
      .then(([dadosProfissionais, dadosServicos]) => {
        if (!ativo) return
        definirProfissionais(dadosProfissionais)
        definirServicos(dadosServicos)
      })
      .catch((falha) => {
        if (ativo) definirErroLista(mensagemFalha(falha))
      })
      .finally(() => {
        if (ativo) definirCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [estabelecimentoId, tentativa])

  function abrirCadastro() {
    definirMensagem('')
    definirChaveFormulario((atual) => atual + 1)
    definirDisponibilidade(disponibilidadeVazia)
    definirEmEdicao('novo')
  }

  async function abrirEdicao(profissional: Profissional) {
    if (estabelecimentoId == null) return
    const consulta = ++consultaDisponibilidade.current
    definirMensagem('')
    definirChaveFormulario((atual) => atual + 1)
    definirDisponibilidade(null)
    definirErroDisponibilidade('')
    definirEmEdicao(profissional)
    try {
      const dados = await buscarDisponibilidade(estabelecimentoId, profissional.id)
      if (consulta === consultaDisponibilidade.current) definirDisponibilidade(dados)
    } catch (falha) {
      if (consulta === consultaDisponibilidade.current)
        definirErroDisponibilidade(mensagemFalha(falha))
    }
  }

  function fecharFormulario() {
    consultaDisponibilidade.current++
    definirEmEdicao(null)
  }

  async function salvar(dados: DadosProfissional, novaDisponibilidade: Disponibilidade) {
    if (estabelecimentoId == null || !emEdicao) return
    let salvo: Profissional
    if (emEdicao !== 'novo') {
      salvo = await editarProfissional(estabelecimentoId, emEdicao.id, dados)
      definirProfissionais((atuais) =>
        atuais.map((profissional) => (profissional.id === salvo.id ? salvo : profissional)),
      )
    } else {
      salvo = await cadastrarProfissional(estabelecimentoId, dados)
      definirProfissionais((atuais) => [...atuais, salvo])
    }
    // A partir daqui o profissional existe; se a disponibilidade falhar, salvar de novo deve
    // editá-lo em vez de cadastrar outro.
    definirEmEdicao(salvo)

    try {
      await atualizarDisponibilidade(estabelecimentoId, salvo.id, novaDisponibilidade)
    } catch (falha) {
      throw new Error(
        `${salvo.nome} foi salvo(a), mas os horários não: ${mensagemFalha(falha)} Tente salvar novamente.`,
        { cause: falha },
      )
    }

    definirMensagem(
      emEdicao === 'novo'
        ? `${salvo.nome} adicionado(a) à equipe.`
        : `Alterações de ${salvo.nome} salvas.`,
    )
    fecharFormulario()
  }

  if (estabelecimentoId == null) {
    return (
      <>
        <header className="topbar">
          <h1>Profissionais</h1>
        </header>
        <p className="auth-error" role="alert">
          Esta conta não possui estabelecimento vinculado.
        </p>
      </>
    )
  }

  if (emEdicao) {
    const profissional = emEdicao === 'novo' ? undefined : emEdicao
    return (
      <>
        <header className="topbar">
          <h1>{emEdicao === 'novo' ? 'Novo profissional' : 'Profissionais'}</h1>
        </header>
        {disponibilidade ? (
          <FormularioProfissional
            key={chaveFormulario}
            profissional={profissional}
            disponibilidade={disponibilidade}
            servicos={servicos}
            aoSalvar={salvar}
            aoVoltar={fecharFormulario}
          />
        ) : erroDisponibilidade ? (
          <Card>
            <p className="auth-error" role="alert">
              {erroDisponibilidade}
            </p>
            <div className="form-actions">
              <Button type="button" variant="ghost" onClick={fecharFormulario}>
                Voltar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => profissional && void abrirEdicao(profissional)}
              >
                Tentar novamente
              </Button>
            </div>
          </Card>
        ) : (
          <p role="status">Carregando horários...</p>
        )}
      </>
    )
  }

  return (
    <>
      <header className="topbar">
        <h1>Profissionais</h1>
        {!carregando && !erroLista && <Button onClick={abrirCadastro}>Novo profissional</Button>}
      </header>
      {carregando ? (
        <p role="status">Carregando profissionais...</p>
      ) : erroLista ? (
        <Card>
          <p className="auth-error" role="alert">
            {erroLista}
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              definirErroLista('')
              definirCarregando(true)
              definirTentativa((atual) => atual + 1)
            }}
          >
            Tentar novamente
          </Button>
        </Card>
      ) : (
        <>
          {mensagem && (
            <p className="notice" role="status">
              {mensagem}
            </p>
          )}
          {profissionais.length === 0 ? (
            <Empty>Nenhum profissional cadastrado. Adicione o primeiro membro da equipe.</Empty>
          ) : (
            <div className="professional-list">
              {profissionais.map((profissional) => (
                <Card className="professional" key={profissional.id}>
                  <div>
                    <strong>{profissional.nome}</strong>
                    <p>{nomesDosServicos(profissional.idsServicos, servicos).join(', ')}</p>
                  </div>
                  <div className="professional-actions">
                    <Button
                      variant="secondary"
                      aria-haspopup="dialog"
                      aria-label={`Folgas de ${profissional.nome}`}
                      onClick={() => abrirFolgas(profissional)}
                    >
                      Folgas
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`Ver detalhes de ${profissional.nome}`}
                      onClick={() => void abrirEdicao(profissional)}
                    >
                      Ver detalhes ›
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      {folgasDe && (
        <DialogoFolgas
          estabelecimentoId={estabelecimentoId}
          profissional={folgasDe}
          aoFechar={fecharFolgas}
          aoSalvar={(folgas) =>
            definirProfissionais((atuais) =>
              atuais.map((profissional) =>
                profissional.id === folgasDe.id
                  ? { ...profissional, diasDeFolga: folgas.map((folga) => folga.data) }
                  : profissional,
              ),
            )
          }
        />
      )}
    </>
  )
}

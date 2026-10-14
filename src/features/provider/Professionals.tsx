import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { caminhos } from '../../app/paths'
import { useAutenticacao } from '../../app/useAutenticacao'
import { ErroApi } from '../../data/api'
import {
  cadastrarProfissional,
  editarProfissional,
  listarProfissionais,
} from '../../data/professionals'
import type { DadosProfissional, Profissional } from '../../data/professionals'
import { listarServicos } from '../../data/services'
import type { Servico } from '../../data/services'
import { Button, Card, Empty, Field } from '../../design-system/ui'

const diasDaSemana = [
  { valor: 1, rotulo: 'seg' },
  { valor: 2, rotulo: 'ter' },
  { valor: 3, rotulo: 'qua' },
  { valor: 4, rotulo: 'qui' },
  { valor: 5, rotulo: 'sex' },
  { valor: 6, rotulo: 'sáb' },
  { valor: 0, rotulo: 'dom' },
]

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

function FormularioProfissional({
  profissional,
  servicos,
  aoSalvar,
  aoVoltar,
}: {
  profissional?: Profissional
  servicos: Servico[]
  aoSalvar: (dados: DadosProfissional) => Promise<void>
  aoVoltar: () => void
}) {
  const [enviando, definirEnviando] = useState(false)
  const [erro, definirErro] = useState('')
  const [errosCampos, definirErrosCampos] = useState<Record<string, string>>({})

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = new FormData(evento.currentTarget)
    const idsServicos = form.getAll('servicos').map(Number)
    const diasDeAtendimento = form.getAll('dias').map(Number)
    definirErrosCampos({})
    if (!idsServicos.length) return definirErro('Selecione ao menos um serviço.')
    if (!diasDeAtendimento.length) return definirErro('Selecione ao menos um dia de atendimento.')
    definirErro('')

    definirEnviando(true)
    try {
      await aoSalvar({
        nome: profissional?.nome ?? String(form.get('nome')).trim(),
        // As especialidades são os serviços que o profissional realiza.
        especialidades: nomesDosServicos(idsServicos, servicos),
        idsServicos,
        diasDeAtendimento,
        // A edição substitui as folgas no backend; reenviar as atuais evita apagá-las.
        diasDeFolga: profissional?.diasDeFolga ?? [],
      })
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
  const [mensagem, definirMensagem] = useState('')

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

  async function salvar(dados: DadosProfissional) {
    if (estabelecimentoId == null) return
    if (emEdicao && emEdicao !== 'novo') {
      const atualizado = await editarProfissional(estabelecimentoId, emEdicao.id, dados)
      definirProfissionais((atuais) =>
        atuais.map((profissional) =>
          profissional.id === atualizado.id ? atualizado : profissional,
        ),
      )
      definirMensagem(`Alterações de ${atualizado.nome} salvas.`)
    } else {
      const criado = await cadastrarProfissional(estabelecimentoId, dados)
      definirProfissionais((atuais) => [...atuais, criado])
      definirMensagem(`${criado.nome} adicionado(a) à equipe.`)
    }
    definirEmEdicao(null)
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

  if (emEdicao)
    return (
      <>
        <header className="topbar">
          <h1>{emEdicao === 'novo' ? 'Novo profissional' : 'Profissionais'}</h1>
        </header>
        <FormularioProfissional
          key={emEdicao === 'novo' ? 'novo' : emEdicao.id}
          profissional={emEdicao === 'novo' ? undefined : emEdicao}
          servicos={servicos}
          aoSalvar={salvar}
          aoVoltar={() => definirEmEdicao(null)}
        />
      </>
    )
  return (
    <>
      <header className="topbar">
        <h1>Profissionais</h1>
        {!carregando && !erroLista && (
          <Button
            onClick={() => {
              definirMensagem('')
              definirEmEdicao('novo')
            }}
          >
            Novo profissional
          </Button>
        )}
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
                  <Button
                    variant="ghost"
                    aria-label={`Ver detalhes de ${profissional.nome}`}
                    onClick={() => {
                      definirMensagem('')
                      definirEmEdicao(profissional)
                    }}
                  >
                    Ver detalhes ›
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

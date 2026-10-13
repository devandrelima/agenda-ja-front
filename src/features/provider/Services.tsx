import { useEffect, useState, type FormEvent } from 'react'
import { useAutenticacao } from '../../app/useAutenticacao'
import { ErroApi } from '../../data/api'
import { cadastrarServico, editarServico, listarServicos } from '../../data/services'
import type { DadosServico, Servico } from '../../data/services'
import { Button, Card, Empty, Field } from '../../design-system/ui'

const formatarValor = (valor: number) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function mensagemFalha(falha: unknown) {
  if (falha instanceof ErroApi) {
    if (falha.status === 401) return 'Sua sessão expirou. Atualize a página para entrar novamente.'
    if (falha.status === 403) return 'Você não tem acesso aos serviços deste estabelecimento.'
    return falha.message
  }
  return falha instanceof Error ? falha.message : 'Não foi possível concluir a solicitação.'
}

function FormularioServico({
  servico,
  aoSalvar,
  aoCancelar,
}: {
  servico?: Servico
  aoSalvar: (dados: DadosServico) => Promise<void>
  aoCancelar: () => void
}) {
  const [enviando, definirEnviando] = useState(false)
  const [erro, definirErro] = useState('')
  const [errosCampos, definirErrosCampos] = useState<Record<string, string>>({})

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const formulario = new FormData(evento.currentTarget)
    const nome = String(formulario.get('nome') ?? '').trim()
    const duracaoTexto = String(formulario.get('duracaoMinutos') ?? '')
    const valorTexto = String(formulario.get('valor') ?? '')
    const duracaoMinutos = Number(duracaoTexto)
    const valor = Number(valorTexto)
    const erros: Record<string, string> = {}

    if (!nome) erros.nome = 'Informe o nome do serviço.'
    if (!/^[1-9]\d*$/.test(duracaoTexto) || !Number.isSafeInteger(duracaoMinutos)) {
      erros.duracaoMinutos = 'Informe uma duração válida em minutos.'
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(valorTexto) || valor > 99999999.99) {
      erros.valor = 'Informe um preço válido com até duas casas decimais.'
    }
    definirErrosCampos(erros)
    definirErro('')
    if (Object.keys(erros).length) return

    definirEnviando(true)
    try {
      await aoSalvar({ nome, duracaoMinutos, valor })
    } catch (falha) {
      if (falha instanceof ErroApi) definirErrosCampos(falha.erros)
      definirErro(mensagemFalha(falha))
    } finally {
      definirEnviando(false)
    }
  }

  return (
    <Card className="service-form-card">
      <form className="form" onSubmit={(evento) => void enviar(evento)}>
        <Field
          name="nome"
          label="Nome do serviço"
          defaultValue={servico?.nome}
          maxLength={255}
          error={errosCampos.nome}
          required
        />
        <div className="service-form-fields">
          <Field
            name="duracaoMinutos"
            label="Duração (minutos)"
            type="number"
            min={1}
            step={1}
            defaultValue={servico?.duracaoMinutos}
            error={errosCampos.duracaoMinutos}
            required
          />
          <Field
            name="valor"
            label="Preço (R$)"
            type="number"
            min={0}
            max={99999999.99}
            step="0.01"
            defaultValue={servico?.valor}
            error={errosCampos.valor}
            required
          />
        </div>
        {erro && (
          <p className="auth-error" role="alert">
            {erro}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={aoCancelar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Salvando...' : servico ? 'Salvar alterações' : 'Cadastrar serviço'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function Servicos() {
  const { sessao } = useAutenticacao()
  const estabelecimentoId = sessao?.estabelecimentoId
  const [servicos, definirServicos] = useState<Servico[]>([])
  const [carregando, definirCarregando] = useState(true)
  const [erroLista, definirErroLista] = useState('')
  const [tentativa, definirTentativa] = useState(0)
  const [emEdicao, definirEmEdicao] = useState<Servico | 'novo' | null>(null)
  const [mensagem, definirMensagem] = useState('')

  useEffect(() => {
    if (estabelecimentoId == null) return
    let ativo = true
    listarServicos(estabelecimentoId)
      .then((dados) => {
        if (ativo) definirServicos(dados)
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

  async function salvar(dados: DadosServico) {
    if (estabelecimentoId == null) return
    if (emEdicao && emEdicao !== 'novo') {
      const atualizado = await editarServico(estabelecimentoId, emEdicao.id, dados)
      definirServicos((atuais) =>
        atuais.map((servico) => (servico.id === atualizado.id ? atualizado : servico)),
      )
      definirMensagem('Serviço atualizado com sucesso.')
    } else {
      const criado = await cadastrarServico(estabelecimentoId, dados)
      definirServicos((atuais) => [...atuais, criado])
      definirMensagem('Serviço cadastrado com sucesso.')
    }
    definirEmEdicao(null)
  }

  if (estabelecimentoId == null) {
    return (
      <>
        <header className="topbar">
          <h1>Serviços</h1>
        </header>
        <p className="auth-error" role="alert">
          Esta conta não possui estabelecimento vinculado.
        </p>
      </>
    )
  }

  return (
    <>
      <header className="topbar">
        <h1>{emEdicao === 'novo' ? 'Novo serviço' : emEdicao ? 'Editar serviço' : 'Serviços'}</h1>
        {!emEdicao && !carregando && !erroLista && (
          <Button
            onClick={() => {
              definirMensagem('')
              definirEmEdicao('novo')
            }}
          >
            Novo serviço
          </Button>
        )}
      </header>
      {emEdicao ? (
        <FormularioServico
          key={emEdicao === 'novo' ? 'novo' : emEdicao.id}
          servico={emEdicao === 'novo' ? undefined : emEdicao}
          aoSalvar={salvar}
          aoCancelar={() => definirEmEdicao(null)}
        />
      ) : carregando ? (
        <p role="status">Carregando serviços...</p>
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
          {servicos.length === 0 ? (
            <Empty>
              Nenhum serviço cadastrado. Adicione o primeiro serviço do estabelecimento.
            </Empty>
          ) : (
            <div className="service-list">
              {servicos.map((servico) => (
                <Card className="service-card" key={servico.id}>
                  <div>
                    <h2>{servico.nome}</h2>
                    <p>
                      {servico.duracaoMinutos} min · {formatarValor(servico.valor)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`Editar ${servico.nome}`}
                    onClick={() => {
                      definirMensagem('')
                      definirEmEdicao(servico)
                    }}
                  >
                    Editar
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

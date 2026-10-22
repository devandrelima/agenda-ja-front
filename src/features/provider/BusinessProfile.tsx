import { useEffect, useState, type FormEvent } from 'react'
import { useAutenticacao } from '../../app/useAutenticacao'
import {
  buscarDadosNegocio,
  categoriasNegocio,
} from '../../data/businessProfile'
import { salvarConfiguracao } from '../../data/publicEstablishment'
import type { DadosNegocio } from '../../data/businessProfile'
import { Button, Card } from '../../design-system/ui'

export function DadosDoNegocio() {
  const { sessao } = useAutenticacao()
  const estabelecimentoId = sessao?.estabelecimentoId
  const [resultado, definirResultado] = useState<{
    estabelecimentoId: number
    dados?: DadosNegocio
    erro?: string
  } | null>(null)
  const [edicao, definirEdicao] = useState<DadosNegocio | null>(null)
  const [tentativa, definirTentativa] = useState(0)
  const [erro, definirErro] = useState('')
  const [mensagem, definirMensagem] = useState('')
  const dados =
    resultado && resultado.estabelecimentoId === estabelecimentoId ? resultado.dados : null
  const erroCarga =
    estabelecimentoId == null
      ? 'Não foi possível identificar o negócio desta conta.'
      : resultado && resultado.estabelecimentoId === estabelecimentoId
        ? resultado.erro
        : ''
  const carregando = estabelecimentoId != null && resultado?.estabelecimentoId !== estabelecimentoId

  useEffect(() => {
    if (estabelecimentoId == null) return
    let ativo = true
    buscarDadosNegocio(estabelecimentoId)
      .then((resposta) => {
        if (ativo) {
          definirResultado({
            estabelecimentoId,
            dados: resposta,
          })
        }
      })
      .catch(() => {
        if (ativo) {
          definirResultado({
            estabelecimentoId,
            erro: 'Não foi possível carregar os dados do negócio.',
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [estabelecimentoId, tentativa])

  function alterar(campo: keyof DadosNegocio, valor: string) {
    definirEdicao((atual) => (atual ? { ...atual, [campo]: valor } : null))
    definirErro('')
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!edicao || estabelecimentoId == null) return
    const atualizados = {
      nome: edicao.nome.trim(),
      categoria: edicao.categoria.trim(),
      localizacao: edicao.localizacao.trim(),
    }
    if (!atualizados.nome || !atualizados.categoria || !atualizados.localizacao) {
      definirErro('Preencha nome, categoria e localização do negócio.')
      return
    }
    try {
      await salvarConfiguracao(estabelecimentoId, 'dados', atualizados)
      definirResultado({ estabelecimentoId, dados: atualizados })
      definirEdicao(null)
      definirErro('')
      definirMensagem('Dados do negócio atualizados.')
    } catch {
      definirErro('Não foi possível salvar os dados do negócio.')
    }
  }

  return (
    <Card className="business-profile-card">
      <div className="business-hours-heading">
        <div>
          <h2>Dados do negócio</h2>
          <p className="muted">Nome, categoria e localização da apresentação pública.</p>
        </div>
        {dados && !edicao && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              definirEdicao({ ...dados })
              definirMensagem('')
            }}
          >
            Editar dados
          </Button>
        )}
      </div>

      {carregando && !dados && <p role="status">Carregando dados do negócio...</p>}
      {erroCarga && (
        <div className="business-profile-error">
          <p className="auth-error" role="alert">
            {erroCarga}
          </p>
          {estabelecimentoId != null && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                definirResultado(null)
                definirTentativa((atual) => atual + 1)
              }}
            >
              Tentar novamente
            </Button>
          )}
        </div>
      )}

      {edicao ? (
        <form className="business-profile-form" onSubmit={(evento) => void salvar(evento)} noValidate>
          <label className="field">
            Nome do negócio
            <input
              value={edicao.nome}
              maxLength={100}
              required
              onChange={(evento) => alterar('nome', evento.target.value)}
            />
          </label>
          <label className="field">
            Categoria
            <select
              value={edicao.categoria}
              required
              onChange={(evento) => alterar('categoria', evento.target.value)}
            >
              {!categoriasNegocio.includes(
                edicao.categoria as (typeof categoriasNegocio)[number],
              ) && <option value={edicao.categoria}>{edicao.categoria}</option>}
              {categoriasNegocio.map((categoria) => (
                <option key={categoria}>{categoria}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Localização
            <input
              value={edicao.localizacao}
              maxLength={255}
              required
              onChange={(evento) => alterar('localizacao', evento.target.value)}
            />
          </label>
          {erro && (
            <p className="auth-error" role="alert">
              {erro}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                definirEdicao(null)
                definirErro('')
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar dados</Button>
          </div>
        </form>
      ) : dados ? (
        <dl className="business-profile-list">
          <div>
            <dt>Nome do negócio</dt>
            <dd>{dados.nome}</dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{dados.categoria}</dd>
          </div>
          <div>
            <dt>Localização</dt>
            <dd>{dados.localizacao}</dd>
          </div>
        </dl>
      ) : null}
      {mensagem && (
        <p className="notice" role="status">
          {mensagem}
        </p>
      )}
    </Card>
  )
}

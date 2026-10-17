import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAutenticacao } from '../../app/useAutenticacao'
import { caminhos } from '../../app/paths'
import {
  editarAvaliacao,
  excluirAvaliacao,
  publicarAvaliacao,
  resumoAvaliacoes,
  useAvaliacoesDemo,
} from '../../data/demoReviews'
import type { Avaliacao } from '../../domain/models'
import { MarcaAgendaJa } from '../booking/Booking'

const porPagina = 10
type Ordem = 'mais-estrelas' | 'menos-estrelas'

function EstrelasEditaveis({
  valor,
  aoAlterar,
  rotulo,
  desabilitado = false,
}: {
  valor: number
  aoAlterar: (valor: number) => void
  rotulo: string
  desabilitado?: boolean
}) {
  const [previa, definirPrevia] = useState(0)
  return (
    <div
      className="reviews-stars-input"
      role="group"
      aria-label={rotulo}
      onMouseLeave={() => definirPrevia(0)}
    >
      {[1, 2, 3, 4, 5].map((estrela) => (
        <button
          key={estrela}
          type="button"
          className="reviews-star-button"
          data-filled={estrela <= (previa || valor)}
          aria-label={`${estrela} ${estrela === 1 ? 'estrela' : 'estrelas'}`}
          aria-pressed={valor === estrela}
          onMouseEnter={() => definirPrevia(estrela)}
          onClick={() => aoAlterar(estrela)}
          disabled={desabilitado}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2 3.1 6.3 7 1-5.1 5 .9 7-5.9-3.2-5.9 3.2.9-7-5.1-5 7-1L12 2Z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function useDeslocamentoDoTeclado() {
  const [deslocamento, definirDeslocamento] = useState(0)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const atualizar = () =>
      definirDeslocamento(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop))
    viewport.addEventListener('resize', atualizar)
    viewport.addEventListener('scroll', atualizar)
    return () => {
      viewport.removeEventListener('resize', atualizar)
      viewport.removeEventListener('scroll', atualizar)
    }
  }, [])
  return deslocamento
}

function ordenar(avaliacoes: Avaliacao[], ordem: Ordem) {
  return [...avaliacoes].sort((primeira, segunda) => {
    const diferenca =
      ordem === 'mais-estrelas'
        ? segunda.estrelas - primeira.estrelas
        : primeira.estrelas - segunda.estrelas
    return diferenca || (segunda.publicadoEm ?? '').localeCompare(primeira.publicadoEm ?? '')
  })
}

export function PaginaAvaliacoes() {
  const avaliacoes = useAvaliacoesDemo()
  const { sessao, carregando, encerrar } = useAutenticacao()
  const [ordem, definirOrdem] = useState<Ordem>('mais-estrelas')
  const [pagina, definirPagina] = useState(1)
  const [comentario, definirComentario] = useState('')
  const [estrelas, definirEstrelas] = useState(0)
  const [enviando, definirEnviando] = useState(false)
  const [menuAberto, definirMenuAberto] = useState<string | null>(null)
  const [editando, definirEditando] = useState<string | null>(null)
  const [textoEdicao, definirTextoEdicao] = useState('')
  const [estrelasEdicao, definirEstrelasEdicao] = useState(0)
  const [confirmandoExclusao, definirConfirmandoExclusao] = useState<string | null>(null)
  const [operacao, definirOperacao] = useState<string | null>(null)
  const [aviso, definirAviso] = useState<{ texto: string; erro: boolean } | null>(null)
  const deslocamento = useDeslocamentoDoTeclado()
  const { quantidade, media } = resumoAvaliacoes(avaliacoes)
  const minhaAvaliacao = sessao
    ? avaliacoes.find((avaliacao) => avaliacao.autorId === sessao.id)
    : undefined

  const outrasAvaliacoes = useMemo(
    () => ordenar(avaliacoes.filter((avaliacao) => avaliacao.id !== minhaAvaliacao?.id), ordem),
    [avaliacoes, minhaAvaliacao?.id, ordem],
  )
  const quantidadePorPagina = minhaAvaliacao ? porPagina - 1 : porPagina
  const totalPaginas = Math.max(1, Math.ceil(outrasAvaliacoes.length / quantidadePorPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * quantidadePorPagina
  const visiveis = [
    ...(minhaAvaliacao ? [minhaAvaliacao] : []),
    ...outrasAvaliacoes.slice(inicio, inicio + quantidadePorPagina),
  ]

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!sessao || minhaAvaliacao || !comentario.trim() || !estrelas || enviando) return
    definirEnviando(true)
    definirAviso(null)
    try {
      await publicarAvaliacao(sessao, comentario, estrelas)
      definirComentario('')
      definirEstrelas(0)
      definirPagina(1)
      definirAviso({ texto: 'Avaliação publicada nesta demonstração.', erro: false })
    } catch (falha) {
      definirAviso({
        texto:
          falha instanceof Error && falha.message.startsWith('Você já publicou')
            ? falha.message
            : 'Não foi possível publicar. Tente novamente.',
        erro: true,
      })
    } finally {
      definirEnviando(false)
    }
  }

  async function salvarEdicao(evento: FormEvent<HTMLFormElement>, id: string) {
    evento.preventDefault()
    if (!sessao || !textoEdicao.trim() || !estrelasEdicao || operacao) return
    definirOperacao(id)
    definirAviso(null)
    try {
      await editarAvaliacao(id, sessao.id, textoEdicao, estrelasEdicao)
      definirEditando(null)
      definirPagina(1)
      definirAviso({ texto: 'Comentário atualizado nesta demonstração.', erro: false })
    } catch {
      definirAviso({ texto: 'Não foi possível salvar as alterações.', erro: true })
    } finally {
      definirOperacao(null)
    }
  }

  async function confirmarExclusao(id: string) {
    if (!sessao || operacao) return
    definirOperacao(id)
    definirAviso(null)
    try {
      await excluirAvaliacao(id, sessao.id)
      definirConfirmandoExclusao(null)
      definirPagina(1)
      definirAviso({ texto: 'Comentário excluído desta demonstração.', erro: false })
    } catch {
      definirAviso({ texto: 'Não foi possível excluir o comentário.', erro: true })
    } finally {
      definirOperacao(null)
    }
  }

  return (
    <main className="availability-page reviews-page">
      <section
        className={`availability-shell reviews-shell${sessao && !minhaAvaliacao ? ' has-review-composer' : ''}`}
        aria-labelledby="reviews-title"
      >
        <header className="availability-header">
          <Link
            className="availability-back"
            to={caminhos.estabelecimento}
            aria-label="Voltar para a página do estabelecimento"
          >
            ‹
          </Link>
          <MarcaAgendaJa />
          {sessao?.role === 'CLIENTE' && (
            <button className="reviews-logout" type="button" onClick={() => void encerrar()}>
              Sair
            </button>
          )}
        </header>

        <div className="reviews-page-heading">
          <p aria-live="polite" aria-atomic="true">
            {quantidade} {quantidade === 1 ? 'avaliação' : 'avaliações'} · média{' '}
            {media.toLocaleString('pt-BR')} ★
          </p>
          <h1 id="reviews-title">Comentários de clientes</h1>
        </div>
        {aviso && (
          <p className="reviews-feedback" role={aviso.erro ? 'alert' : 'status'}>
            {aviso.texto}
          </p>
        )}

        <section className="reviews-content" aria-label="Avaliações dos clientes">
          <div className="reviews-toolbar">
            <div className="reviews-filters">
              <label className="reviews-sort">
                Ordenar por
                <select
                  value={ordem}
                  onChange={(evento) => {
                    definirOrdem(evento.target.value as Ordem)
                    definirPagina(1)
                  }}
                >
                  <option value="mais-estrelas">Mais estrelas</option>
                  <option value="menos-estrelas">Menos estrelas</option>
                </select>
              </label>
            </div>
            <p className="reviews-summary" aria-live="polite">
              {quantidade ? `Mostrando ${visiveis.length} de ${quantidade}` : 'Nenhum comentário'}
            </p>
          </div>

          {quantidade === 0 ? (
            <p className="reviews-empty">Ainda não há avaliações.</p>
          ) : (
            <>
              <div className="reviews-list">
                {visiveis.map((avaliacao) => {
                  const minha =
                    !!sessao &&
                    typeof avaliacao.autorId === 'number' &&
                    sessao.id === avaliacao.autorId
                  return (
                    <article
                      className={`review${minha ? ' review-own' : ''}`}
                      key={avaliacao.id}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Escape' && menuAberto === avaliacao.id)
                          definirMenuAberto(null)
                      }}
                    >
                      <div className="review-heading">
                        <div className="review-author">
                          <strong>{avaliacao.nomeCliente}</strong>
                          {minha && <small>Seu comentário</small>}
                        </div>
                        <div className="review-heading-actions">
                          <span aria-label={`${avaliacao.estrelas} de 5 estrelas`}>
                            <span aria-hidden="true">{'★'.repeat(avaliacao.estrelas)}</span>
                          </span>
                          {minha && (
                            <button
                              type="button"
                              className="review-manage"
                              aria-label={`Gerenciar comentário de ${avaliacao.nomeCliente}`}
                              aria-expanded={menuAberto === avaliacao.id}
                              onClick={() =>
                                definirMenuAberto(menuAberto === avaliacao.id ? null : avaliacao.id)
                              }
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m4 20 4.3-1 10.9-10.9-3.3-3.3L5 15.7 4 20Zm10.8-14.2 3.3 3.3" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {avaliacao.publicadoEm && (
                        <small className="review-date">
                          Publicado em {new Date(avaliacao.publicadoEm).toLocaleDateString('pt-BR')}
                          {avaliacao.editadoEm && ' · Editado'}
                        </small>
                      )}
                      {minha && menuAberto === avaliacao.id && (
                        <div className="review-menu">
                          <button
                            type="button"
                            onClick={() => {
                              definirEditando(avaliacao.id)
                              definirTextoEdicao(avaliacao.comentario)
                              definirEstrelasEdicao(avaliacao.estrelas)
                              definirConfirmandoExclusao(null)
                              definirMenuAberto(null)
                            }}
                          >
                            Editar comentário
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              definirConfirmandoExclusao(avaliacao.id)
                              definirEditando(null)
                              definirMenuAberto(null)
                            }}
                          >
                            Excluir comentário
                          </button>
                        </div>
                      )}
                      {minha && editando === avaliacao.id ? (
                        <form
                          className="review-edit-form"
                          onSubmit={(evento) => void salvarEdicao(evento, avaliacao.id)}
                        >
                          <label>
                            Editar comentário
                            <textarea
                              value={textoEdicao}
                              onChange={(evento) => definirTextoEdicao(evento.target.value)}
                              maxLength={1000}
                              required
                            />
                          </label>
                          <EstrelasEditaveis
                            valor={estrelasEdicao}
                            aoAlterar={definirEstrelasEdicao}
                            rotulo="Editar nota"
                            desabilitado={operacao === avaliacao.id}
                          />
                          <div className="review-inline-actions">
                            <button
                              type="submit"
                              disabled={!textoEdicao.trim() || !estrelasEdicao || !!operacao}
                            >
                              {operacao === avaliacao.id ? 'Salvando...' : 'Salvar alterações'}
                            </button>
                            <button
                              type="button"
                              onClick={() => definirEditando(null)}
                              disabled={!!operacao}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p>{avaliacao.comentario}</p>
                      )}
                      {minha && confirmandoExclusao === avaliacao.id && (
                        <div
                          className="review-delete-confirm"
                          role="group"
                          aria-label="Confirmar exclusão"
                        >
                          <p>Excluir este comentário?</p>
                          <div className="review-inline-actions">
                            <button
                              type="button"
                              onClick={() => void confirmarExclusao(avaliacao.id)}
                              disabled={!!operacao}
                            >
                              {operacao === avaliacao.id ? 'Excluindo...' : 'Confirmar exclusão'}
                            </button>
                            <button
                              type="button"
                              onClick={() => definirConfirmandoExclusao(null)}
                              disabled={!!operacao}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
              <nav className="reviews-pagination" aria-label="Paginação das avaliações">
                <button
                  type="button"
                  onClick={() => definirPagina(paginaAtual - 1)}
                  disabled={paginaAtual === 1}
                >
                  Anterior
                </button>
                <span>
                  Página {paginaAtual} de {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => definirPagina(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas}
                >
                  Próxima
                </button>
              </nav>
            </>
          )}
        </section>

        {!carregando && !sessao && (
          <p className="reviews-signin">
            Quer avaliar?{' '}
            <Link
              to={caminhos.login}
              state={{ retorno: caminhos.avaliacoes, perfil: 'CLIENTE' }}
            >
              Entre na sua conta
            </Link>
            .
          </p>
        )}
      </section>

      {sessao && !minhaAvaliacao && (
        <form
          className="reviews-composer"
          style={deslocamento ? { bottom: `${deslocamento + 12}px` } : undefined}
          onSubmit={(evento) => void enviar(evento)}
        >
          <label className="reviews-composer-label" htmlFor="new-review">
            Sua avaliação
          </label>
          <textarea
            id="new-review"
            value={comentario}
            onChange={(evento) => definirComentario(evento.target.value)}
            placeholder="Compartilhe sua experiência..."
            maxLength={1000}
            required
            disabled={enviando}
          />
          <div className="reviews-composer-footer">
            <EstrelasEditaveis
              valor={estrelas}
              aoAlterar={definirEstrelas}
              rotulo="Nota da avaliação"
              desabilitado={enviando}
            />
            <button type="submit" disabled={!comentario.trim() || !estrelas || enviando}>
              {enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
          <small>Prévia local: avaliações salvas neste navegador.</small>
        </form>
      )}
    </main>
  )
}

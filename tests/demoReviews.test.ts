import { beforeEach, expect, it, vi } from 'vitest'
import {
  editarAvaliacao,
  excluirAvaliacao,
  publicarAvaliacao,
  resumoAvaliacoes,
} from '../src/data/demoReviews'

beforeEach(() => localStorage.clear())

it('calcula quantidade e média de acordo com as estrelas', () => {
  const base = [
    { id: '1', nomeCliente: 'A', comentario: 'A', estrelas: 1 },
    { id: '2', nomeCliente: 'B', comentario: 'B', estrelas: 5 },
  ]
  expect(resumoAvaliacoes(base)).toEqual({ quantidade: 2, media: 3 })
  expect(
    resumoAvaliacoes([...base, { id: '3', nomeCliente: 'C', comentario: 'C', estrelas: 4 }]),
  ).toEqual({ quantidade: 3, media: 3.3 })
  expect(resumoAvaliacoes([])).toEqual({ quantidade: 0, media: 0 })
})

it('usa o identificador autenticado para impedir edição e exclusão por terceiros', async () => {
  const avaliacao = await publicarAvaliacao({ id: 7, nome: 'Ana' }, 'Bom atendimento', 4)
  await expect(publicarAvaliacao({ id: 7, nome: 'Ana' }, 'Outra avaliação', 5)).rejects.toThrow(
    'já publicou',
  )
  expect(resumoAvaliacoes(JSON.parse(localStorage.getItem('agendaja-demo-reviews-v1')!))).toEqual({
    quantidade: 1,
    media: 4,
  })
  await expect(editarAvaliacao(avaliacao.id, 8, 'Alteração indevida', 1)).rejects.toThrow(
    'não pode editar',
  )
  await expect(excluirAvaliacao(avaliacao.id, 8)).rejects.toThrow('não pode excluir')
  expect(await editarAvaliacao(avaliacao.id, 7, 'Atendimento ótimo', 5)).toMatchObject({
    comentario: 'Atendimento ótimo',
    estrelas: 5,
    publicadoEm: avaliacao.publicadoEm,
  })
  await excluirAvaliacao(avaliacao.id, 7)
  expect(localStorage.getItem('agendaja-demo-reviews-v1')).toBe('[]')
  await expect(
    publicarAvaliacao({ id: 7, nome: 'Ana' }, 'Depois de excluir', 3),
  ).resolves.toMatchObject({
    comentario: 'Depois de excluir',
  })
})

it('separa comentários por estabelecimento e permite uma avaliação em cada um', async () => {
  const autor = { id: 7, nome: 'Ana' }
  const primeira = await publicarAvaliacao(autor, 'Primeiro negócio', 3, 'primeiro')
  const segunda = await publicarAvaliacao(autor, 'Segundo negócio', 5, 'segundo')

  expect(JSON.parse(localStorage.getItem('agendaja-demo-reviews-v1:primeiro')!)).toMatchObject([
    { comentario: 'Primeiro negócio' },
  ])
  expect(JSON.parse(localStorage.getItem('agendaja-demo-reviews-v1:segundo')!)).toMatchObject([
    { comentario: 'Segundo negócio' },
  ])
  await expect(editarAvaliacao(primeira.id, autor.id, 'Invasão', 1, 'segundo')).rejects.toThrow(
    'não pode editar',
  )
  await excluirAvaliacao(segunda.id, autor.id, 'segundo')
  expect(JSON.parse(localStorage.getItem('agendaja-demo-reviews-v1:primeiro')!)).toHaveLength(1)
})

it('preserva a avaliação quando a gravação de uma edição ou exclusão falha', async () => {
  const avaliacao = await publicarAvaliacao({ id: 7, nome: 'Ana' }, 'Comentário inicial', 4)
  const antes = localStorage.getItem('agendaja-demo-reviews-v1')
  const gravar = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Falha de armazenamento')
  })
  try {
    await expect(editarAvaliacao(avaliacao.id, 7, 'Comentário novo', 1)).rejects.toThrow()
    await expect(excluirAvaliacao(avaliacao.id, 7)).rejects.toThrow()
    expect(localStorage.getItem('agendaja-demo-reviews-v1')).toBe(antes)
  } finally {
    gravar.mockRestore()
  }
})

it('considera só a avaliação mais recente em dados antigos duplicados', async () => {
  localStorage.setItem(
    'agendaja-demo-reviews-v1',
    JSON.stringify([
      { id: 'antiga', autorId: 7, nomeCliente: 'Ana', comentario: 'Antiga', estrelas: 2 },
      { id: 'recente', autorId: 7, nomeCliente: 'Ana', comentario: 'Recente', estrelas: 4 },
    ]),
  )
  await expect(publicarAvaliacao({ id: 7, nome: 'Ana' }, 'Terceira', 5)).rejects.toThrow(
    'já publicou',
  )
  await expect(editarAvaliacao('antiga', 7, 'Alteração', 3)).rejects.toThrow('não pode editar')
  await editarAvaliacao('recente', 7, 'Atualizada', 5)
  expect(JSON.parse(localStorage.getItem('agendaja-demo-reviews-v1')!)).toMatchObject([
    { id: 'recente', comentario: 'Atualizada' },
  ])
})

import { useReducer, useState, type KeyboardEvent } from 'react'
import type { FonteReserva } from '../../data/agendamentos'
import { criarFonteMock } from '../../data/mockReserva'
import { DetalhesDaReserva } from './ReservaDetalhes'

/**
 * Abre o modal da reserva sobre um agendamento do mock. Depois de cada alteração a tela que usa o
 * hook é renderizada de novo e relê o mock.
 */
export function useReservaMock() {
  const [fonte, definirFonte] = useState<FonteReserva | null>(null)
  const [, atualizar] = useReducer((versao: number) => versao + 1, 0)
  const modal = fonte && (
    <DetalhesDaReserva fonte={fonte} aoFechar={() => definirFonte(null)} aoAtualizar={atualizar} />
  )
  return { abrir: (id: string) => definirFonte(criarFonteMock(id)), modal }
}

/** Props para tornar um item da lista clicável e acessível pelo teclado. */
export function propsDeAbrir(aoAbrir: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: aoAbrir,
    onKeyDown: (evento: KeyboardEvent) => {
      if (evento.key !== 'Enter' && evento.key !== ' ') return
      evento.preventDefault()
      aoAbrir()
    },
  }
}

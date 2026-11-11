import type { KeyboardEvent } from 'react'

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

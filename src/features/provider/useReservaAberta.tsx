import { useState } from 'react'
import { criarFonteApi, type FonteReserva } from '../../data/agendamentos'
import { DetalhesDaReserva } from './ReservaDetalhes'

/**
 * Abre o modal de uma reserva do estabelecimento. A fonte fica guardada no estado para manter a
 * mesma referência enquanto o modal está aberto, como `DetalhesDaReserva` exige.
 */
export function useReservaAberta(
  estabelecimentoId: number | null | undefined,
  /** Chamado depois de uma alteração salva, para a tela recarregar seus dados. */
  aoAtualizar: () => void,
) {
  const [fonte, definirFonte] = useState<FonteReserva | null>(null)
  const modal = fonte && (
    <DetalhesDaReserva
      fonte={fonte}
      aoFechar={() => definirFonte(null)}
      aoAtualizar={aoAtualizar}
    />
  )
  return {
    abrir: (id: number) => {
      if (estabelecimentoId != null) definirFonte(criarFonteApi(estabelecimentoId, id))
    },
    modal,
  }
}

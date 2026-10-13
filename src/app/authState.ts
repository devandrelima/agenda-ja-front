import { createContext } from 'react'
import type { Sessao } from '../data/auth'

export type EstadoAutenticacao = {
  sessao: Sessao | null
  carregando: boolean
  autenticar: (email: string, senha: string) => Promise<void>
  encerrar: () => Promise<void>
}

export const ContextoAutenticacao = createContext<EstadoAutenticacao | null>(null)

import { createContext } from 'react'
import type { Sessao } from '../data/auth'

export type EstadoAutenticacao = {
  sessao: Sessao | null
  carregando: boolean
  autenticar: (email: string, senha: string, perfil?: 'GESTOR' | 'CLIENTE') => Promise<void>
  encerrar: () => Promise<void>
}

export const ContextoAutenticacao = createContext<EstadoAutenticacao | null>(null)

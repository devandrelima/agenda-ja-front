import { useContext } from 'react'
import { ContextoAutenticacao } from './authState'

export function useAutenticacao() {
  const contexto = useContext(ContextoAutenticacao)
  if (!contexto) throw new Error('Contexto de autenticação indisponível.')
  return contexto
}

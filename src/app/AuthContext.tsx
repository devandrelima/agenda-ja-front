import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { buscarSessao, entrar, ErroApi, sair } from '../data/auth'
import type { Sessao } from '../data/auth'
import { ContextoAutenticacao } from './authState'

export function ProvedorAutenticacao({ children }: PropsWithChildren) {
  const { pathname } = useLocation()
  const precisaSessao =
    pathname === '/login' || pathname === '/cadastro' || pathname.startsWith('/painel')
  const [sessao, definirSessao] = useState<Sessao | null>(null)
  const [consultaConcluida, definirConsultaConcluida] = useState(false)
  const carregando = precisaSessao && !consultaConcluida && !sessao

  useEffect(() => {
    if (!precisaSessao || sessao) return

    let ativo = true
    buscarSessao()
      .then((dados) => {
        if (ativo) definirSessao(dados)
      })
      .catch(() => {
        if (ativo) definirSessao(null)
      })
      .finally(() => {
        if (ativo) definirConsultaConcluida(true)
      })
    return () => {
      ativo = false
    }
  }, [precisaSessao, sessao])

  async function autenticar(email: string, senha: string) {
    const dados = await entrar(email, senha)
    if (dados.role !== 'GESTOR') throw new Error('Esta conta não tem acesso ao painel do gestor.')
    definirSessao(dados)
  }

  async function encerrar() {
    try {
      await sair()
    } catch (falha) {
      if (!(falha instanceof ErroApi) || falha.status !== 401) throw falha
    }
    definirSessao(null)
  }

  return (
    <ContextoAutenticacao.Provider value={{ sessao, carregando, autenticar, encerrar }}>
      {children}
    </ContextoAutenticacao.Provider>
  )
}

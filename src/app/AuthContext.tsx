import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { buscarSessao, entrar, ErroApi, sair } from '../data/auth'
import type { Sessao } from '../data/auth'
import { buscarSessaoClienteDemo, entrarClienteDemo, sairClienteDemo } from '../data/demoClientAuth'
import { ContextoAutenticacao } from './authState'
import { caminhoDeAvaliacoesValido } from './paths'

export function ProvedorAutenticacao({ children }: PropsWithChildren) {
  const { pathname } = useLocation()
  const precisaSessao =
    pathname === '/login' ||
    pathname === '/cadastro' ||
    pathname.startsWith('/painel') ||
    caminhoDeAvaliacoesValido(pathname)
  const [sessao, definirSessao] = useState<Sessao | null>(buscarSessaoClienteDemo)
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

  async function autenticar(email: string, senha: string, perfil: 'GESTOR' | 'CLIENTE' = 'GESTOR') {
    if (perfil === 'CLIENTE') {
      definirSessao(await entrarClienteDemo(email, senha))
      return
    }
    const dados = await entrar(email, senha)
    if (dados.role !== 'GESTOR') throw new Error('Esta conta não tem acesso ao painel do gestor.')
    definirSessao(dados)
  }

  async function encerrar() {
    if (sessao?.role === 'CLIENTE') {
      sairClienteDemo()
      definirSessao(null)
      return
    }
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

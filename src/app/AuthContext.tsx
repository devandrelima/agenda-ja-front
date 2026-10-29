import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { buscarSessao, entrar, ErroApi, sair } from '../data/auth'
import type { Sessao } from '../data/auth'
import { ContextoAutenticacao } from './authState'
import { caminhoDeAvaliacoesValido, caminhos } from './paths'

export function ProvedorAutenticacao({ children }: PropsWithChildren) {
  const { pathname } = useLocation()
  const precisaSessao =
    pathname === '/login' ||
    pathname === '/cadastro' ||
    pathname === caminhos.meusAgendamentos ||
    pathname.startsWith('/painel') ||
    caminhoDeAvaliacoesValido(pathname)
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

  async function autenticar(email: string, senha: string): Promise<Sessao> {
    const dados = await entrar(email, senha)
    definirSessao(dados)
    definirConsultaConcluida(true)
    return dados
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

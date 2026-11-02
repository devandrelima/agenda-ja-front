import { useEffect, useState } from 'react'

const chave = 'agendaja-logo-negocio-v1'
const evento = 'agendaja:logo-negocio-atualizada'

type LogosSalvas = Record<string, string>

function lerLogos(): LogosSalvas {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(chave) ?? '{}')
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as LogosSalvas : {}
  } catch {
    return {}
  }
}

export function lerLogoDoNegocio(estabelecimentoId: number) {
  return lerLogos()[estabelecimentoId] ?? null
}

export function salvarLogoDoNegocio(estabelecimentoId: number, imagemUrl: string) {
  localStorage.setItem(chave, JSON.stringify({ ...lerLogos(), [estabelecimentoId]: imagemUrl }))
  window.dispatchEvent(new Event(evento))
}

export function useLogoDoNegocio(estabelecimentoId?: number) {
  const [logo, definirLogo] = useState(() =>
    estabelecimentoId == null ? null : lerLogoDoNegocio(estabelecimentoId),
  )
  useEffect(() => {
    const atualizar = () => definirLogo(estabelecimentoId == null ? null : lerLogoDoNegocio(estabelecimentoId))
    atualizar()
    window.addEventListener(evento, atualizar)
    window.addEventListener('storage', atualizar)
    return () => {
      window.removeEventListener(evento, atualizar)
      window.removeEventListener('storage', atualizar)
    }
  }, [estabelecimentoId])
  return logo
}

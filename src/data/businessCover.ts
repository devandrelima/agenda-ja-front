import { useEffect, useState } from 'react'
import fotoDoSalao from '../assets/salao-atelie-aurora.png'

const chave = 'agendaja-demo-capa-atelie-aurora-v1'
const eventoAtualizacao = 'agendaja:capa-atualizada'

function lerCapa(): string {
  try {
    const foto = localStorage.getItem(chave)
    return foto?.startsWith('data:image/jpeg;base64,') ? foto : fotoDoSalao
  } catch {
    return fotoDoSalao
  }
}

export function useCapaNegocio() {
  const [capa, definirCapa] = useState(lerCapa)

  useEffect(() => {
    const atualizar = () => definirCapa(lerCapa())
    const atualizarOutraAba = (evento: StorageEvent) => {
      if (evento.key === chave) atualizar()
    }
    window.addEventListener(eventoAtualizacao, atualizar)
    window.addEventListener('storage', atualizarOutraAba)
    return () => {
      window.removeEventListener(eventoAtualizacao, atualizar)
      window.removeEventListener('storage', atualizarOutraAba)
    }
  }, [])

  return capa
}

export function salvarCapaNegocio(capa: string) {
  localStorage.setItem(chave, capa)
  window.dispatchEvent(new Event(eventoAtualizacao))
}

export function prepararCapa(arquivo: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.')
  }
  if (arquivo.size > 10 * 1024 * 1024) {
    throw new Error('A imagem deve ter até 10 MB.')
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const imagem = new Image()
    imagem.onload = () => {
      URL.revokeObjectURL(url)
      const escala = Math.min(1, 1200 / imagem.naturalWidth, 900 / imagem.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(imagem.naturalWidth * escala)
      canvas.height = Math.round(imagem.naturalHeight * escala)
      const contexto = canvas.getContext('2d')
      if (!contexto) return reject(new Error('Não foi possível preparar a imagem.'))
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    imagem.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível abrir a imagem.'))
    }
    imagem.src = url
  })
}

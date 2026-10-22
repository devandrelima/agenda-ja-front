import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErroApi } from '../../data/api'
import {
  buscarEstabelecimentoPublico,
  identificadorPublicoValido,
} from '../../data/publicEstablishment'
import type { EstabelecimentoPublico } from '../../data/publicEstablishment'
import { PaginaEstabelecimento } from './Booking'

function ErroLinkPublico({ mensagem }: { mensagem: string }) {
  return (
    <main className="public-state" role="alert">
      <h1>{mensagem}</h1>
      <Link to="/login">Ir para a página inicial</Link>
    </main>
  )
}

export function PaginaEstabelecimentoPublico() {
  const { estabelecimentoId: publicId } = useParams()
  const [resultado, definirResultado] = useState<{
    publicId: string
    estabelecimento?: EstabelecimentoPublico
    erro?: string
  } | null>(null)

  useEffect(() => {
    if (!publicId || !identificadorPublicoValido(publicId)) return

    let ativo = true
    buscarEstabelecimentoPublico(publicId)
      .then((dados) => {
        if (ativo) definirResultado({ publicId, estabelecimento: dados })
      })
      .catch((falha: unknown) => {
        if (ativo)
          definirResultado({
            publicId,
            erro:
              falha instanceof ErroApi && falha.status === 404
                ? 'Estabelecimento não encontrado.'
                : 'Não foi possível carregar este estabelecimento. Tente novamente.',
          })
      })
    return () => {
      ativo = false
    }
  }, [publicId])

  if (!publicId || !identificadorPublicoValido(publicId))
    return <ErroLinkPublico mensagem="Estabelecimento não encontrado." />

  if (resultado?.publicId !== publicId)
    return (
      <main className="public-state" role="status">
        Carregando estabelecimento...
      </main>
    )

  if (resultado.erro || !resultado.estabelecimento)
    return <ErroLinkPublico mensagem={resultado.erro || 'Estabelecimento não encontrado.'} />

  const estabelecimento = resultado.estabelecimento
  return (
    <PaginaEstabelecimento
      dados={{
        nome: estabelecimento.nome,
        categoria: estabelecimento.categoria,
        endereco: estabelecimento.localizacao,
        imagemUrl: estabelecimento.imagemUrl,
      }}
      rotaBase={`/estabelecimento/${publicId}`}
    />
  )
}

export function ProximaEtapaPublica({ etapa }: { etapa: 'servicos' | 'agendar' }) {
  const { estabelecimentoId } = useParams()
  return (
    <main className="public-state">
      <h1>{etapa === 'servicos' ? 'Serviços' : 'Agendamento'}</h1>
      <p>Esta etapa estará disponível em breve.</p>
      <Link to={`/estabelecimento/${estabelecimentoId}`}>Voltar ao estabelecimento</Link>
    </main>
  )
}

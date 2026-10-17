import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErroApi } from '../../data/api'
import { buscarEstabelecimentoPublico } from '../../data/publicEstablishment'
import type { EstabelecimentoPublico } from '../../data/publicEstablishment'
import { PaginaEstabelecimento } from './Booking'

export function PaginaEstabelecimentoPublico() {
  const { estabelecimentoId } = useParams()
  const [resultado, definirResultado] = useState<{
    id: string
    estabelecimento?: EstabelecimentoPublico
    erro?: string
  } | null>(null)

  useEffect(() => {
    if (!estabelecimentoId || !/^\d+$/.test(estabelecimentoId)) return

    let ativo = true
    buscarEstabelecimentoPublico(estabelecimentoId)
      .then((dados) => {
        if (ativo) definirResultado({ id: estabelecimentoId, estabelecimento: dados })
      })
      .catch((falha: unknown) => {
        if (ativo)
          definirResultado({
            id: estabelecimentoId,
            erro:
              falha instanceof ErroApi && falha.status === 404
                ? 'Estabelecimento não encontrado.'
                : 'Não foi possível carregar este estabelecimento. Tente novamente.',
          })
      })
    return () => {
      ativo = false
    }
  }, [estabelecimentoId])

  if (!estabelecimentoId || !/^\d+$/.test(estabelecimentoId))
    return (
      <main className="public-state" role="alert">
        <h1>Estabelecimento não encontrado.</h1>
      </main>
    )
  if (resultado?.id !== estabelecimentoId)
    return (
      <main className="public-state" role="status">
        Carregando estabelecimento...
      </main>
    )
  if (resultado.erro || !resultado.estabelecimento)
    return (
      <main className="public-state" role="alert">
        <h1>{resultado.erro || 'Estabelecimento não encontrado.'}</h1>
        <Link to="/login">Ir para a página inicial</Link>
      </main>
    )

  const estabelecimento = resultado.estabelecimento
  return (
    <PaginaEstabelecimento
      dados={{
        nome: estabelecimento.nome,
        categoria: estabelecimento.categoria,
        endereco: estabelecimento.localizacao,
        imagemUrl: estabelecimento.imagemUrl,
      }}
      rotaBase={`/estabelecimento/${estabelecimento.id}`}
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

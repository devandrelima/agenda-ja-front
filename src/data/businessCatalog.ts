export type NegocioDoCatalogo = {
  id: number
  nome: string
  categoria: string
  publicId: string
  mediaAvaliacoes: number
  quantidadeAvaliacoes: number
  logoUrl?: string
}

// Substituir por GET /api/estabelecimentos quando o catálogo público existir.
export const negociosDoCatalogo: NegocioDoCatalogo[] = [
  {
    id: 4,
    nome: 'Studio Marina',
    categoria: 'Salão de beleza',
    publicId: 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311',
    mediaAvaliacoes: 4.8,
    quantidadeAvaliacoes: 124,
  },
  {
    id: 8,
    nome: 'Vivian Unhas',
    categoria: 'Manicure e pedicure',
    publicId: 'a2d92b62-c7e3-42f6-91e8-ef2a706c1c31',
    mediaAvaliacoes: 4.9,
    quantidadeAvaliacoes: 86,
  },
  {
    id: 12,
    nome: 'Barbearia Central',
    categoria: 'Barbearia',
    publicId: '8e4b93c0-20d2-4baa-b5f2-c0ebf366fc24',
    mediaAvaliacoes: 4.7,
    quantidadeAvaliacoes: 53,
  },
  {
    id: 16,
    nome: 'Ateliê Aurora',
    categoria: 'Clínica de estética',
    publicId: '5cb43a0c-12b7-4f15-8fcb-50b706ebf71d',
    mediaAvaliacoes: 4.6,
    quantidadeAvaliacoes: 41,
  },
]

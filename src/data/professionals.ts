import { requisitar, tokenCsrf } from './api'

export type Profissional = {
  id: number
  nome: string
  especialidades: string[]
  idsServicos: number[]
  /** Dias da semana no padrão de `Date.getDay()` (0 = domingo). */
  diasDeAtendimento: number[]
  diasDeFolga: string[]
  estabelecimentoId: number
}

export type DadosProfissional = Omit<Profissional, 'id' | 'estabelecimentoId'>

// O backend numera os dias de 1 a 7 (domingo = 7); a interface usa o padrão de getDay().
const paraApi = (dia: number) => (dia === 0 ? 7 : dia)
const daApi = (dia: number) => (dia === 7 ? 0 : dia)

function converterResposta(profissional: Profissional): Profissional {
  return { ...profissional, diasDeAtendimento: profissional.diasDeAtendimento.map(daApi) }
}

function caminhoProfissionais(estabelecimentoId: number) {
  return `/api/admin/estabelecimentos/${estabelecimentoId}/profissionais`
}

export async function listarProfissionais(estabelecimentoId: number): Promise<Profissional[]> {
  const resposta = await requisitar(caminhoProfissionais(estabelecimentoId))
  const profissionais: Profissional[] = await resposta.json()
  return profissionais.map(converterResposta)
}

async function salvarProfissional(
  caminho: string,
  metodo: 'POST' | 'PUT',
  dados: DadosProfissional,
): Promise<Profissional> {
  const token = await tokenCsrf()
  const resposta = await requisitar(caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
    body: JSON.stringify({ ...dados, diasDeAtendimento: dados.diasDeAtendimento.map(paraApi) }),
  })
  return converterResposta(await resposta.json())
}

export function cadastrarProfissional(estabelecimentoId: number, dados: DadosProfissional) {
  return salvarProfissional(caminhoProfissionais(estabelecimentoId), 'POST', dados)
}

export function editarProfissional(
  estabelecimentoId: number,
  profissionalId: number,
  dados: DadosProfissional,
) {
  return salvarProfissional(
    `${caminhoProfissionais(estabelecimentoId)}/${profissionalId}`,
    'PUT',
    dados,
  )
}

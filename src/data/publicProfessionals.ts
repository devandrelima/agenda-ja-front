import type { Profissional } from '../domain/models'
import { requisitar } from './api'
import { daApi, type Profissional as ProfissionalApi } from './professionals'

/** Profissionais de um estabelecimento que realizam o serviço. Endpoint público. */
export async function listarProfissionaisDoServico(
  estabelecimentoId: string,
  servicoId: string,
): Promise<Profissional[]> {
  const resposta = await requisitar(
    `/api/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/servicos/${encodeURIComponent(servicoId)}/profissionais`,
  )
  const profissionais: ProfissionalApi[] = await resposta.json()
  return profissionais.map((profissional) => ({
    id: String(profissional.id),
    nome: profissional.nome,
    especialidades: profissional.especialidades,
    idsServicos: profissional.idsServicos.map(String),
    diasDeAtendimento: profissional.diasDeAtendimento.map(daApi),
    diasDeFolga: profissional.diasDeFolga,
  }))
}

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

export type Jornada = {
  /** Dia da semana no padrão de `Date.getDay()` (0 = domingo). */
  diaSemana: number
  /** `HH:mm` */
  horaInicio: string
  /** `HH:mm` */
  horaFim: string
}

export type Folga = {
  /** `YYYY-MM-DD` */
  data: string
  motivo: string
}

export type Disponibilidade = {
  jornadas: Jornada[]
  folgas: Folga[]
}

// O backend numera os dias de 1 a 7 (domingo = 7); a interface usa o padrão de getDay().
const paraApi = (dia: number) => (dia === 0 ? 7 : dia)
const daApi = (dia: number) => (dia === 7 ? 0 : dia)
// O backend serializa LocalTime como HH:mm:ss; os campos de horário usam HH:mm.
const paraHoraCurta = (hora: string) => hora.slice(0, 5)

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

function caminhoDisponibilidade(estabelecimentoId: number, profissionalId: number) {
  return `${caminhoProfissionais(estabelecimentoId)}/${profissionalId}/disponibilidade`
}

function converterDisponibilidade(disponibilidade: Disponibilidade): Disponibilidade {
  return {
    jornadas: disponibilidade.jornadas.map((jornada) => ({
      diaSemana: daApi(jornada.diaSemana),
      horaInicio: paraHoraCurta(jornada.horaInicio),
      horaFim: paraHoraCurta(jornada.horaFim),
    })),
    folgas: disponibilidade.folgas.map((folga) => ({
      data: folga.data,
      motivo: folga.motivo ?? '',
    })),
  }
}

export async function buscarDisponibilidade(
  estabelecimentoId: number,
  profissionalId: number,
): Promise<Disponibilidade> {
  const resposta = await requisitar(caminhoDisponibilidade(estabelecimentoId, profissionalId))
  return converterDisponibilidade(await resposta.json())
}

/** Substitui todas as jornadas e folgas do profissional. */
export async function atualizarDisponibilidade(
  estabelecimentoId: number,
  profissionalId: number,
  disponibilidade: Disponibilidade,
): Promise<Disponibilidade> {
  const token = await tokenCsrf()
  const resposta = await requisitar(caminhoDisponibilidade(estabelecimentoId, profissionalId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
    body: JSON.stringify({
      jornadas: disponibilidade.jornadas.map((jornada) => ({
        ...jornada,
        diaSemana: paraApi(jornada.diaSemana),
      })),
      folgas: disponibilidade.folgas.map((folga) => ({
        data: folga.data,
        motivo: folga.motivo.trim() || null,
      })),
    }),
  })
  return converterDisponibilidade(await resposta.json())
}

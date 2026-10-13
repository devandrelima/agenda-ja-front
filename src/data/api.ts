export class ErroApi extends Error {
  constructor(
    public status: number,
    mensagem: string,
    public erros: Record<string, string> = {},
  ) {
    super(mensagem)
  }
}

export async function requisitar(caminho: string, opcoes?: RequestInit): Promise<Response> {
  let resposta: Response

  try {
    resposta = await fetch(caminho, { ...opcoes, credentials: 'same-origin', cache: 'no-store' })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente em instantes.')
  }

  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => null)
    const mensagem =
      typeof dados?.mensagem === 'string'
        ? dados.mensagem
        : 'Não foi possível concluir a solicitação.'
    const erros = dados?.erros && typeof dados.erros === 'object' ? dados.erros : {}
    throw new ErroApi(resposta.status, mensagem, erros)
  }

  return resposta
}

export async function tokenCsrf(): Promise<string> {
  const resposta = await requisitar('/api/auth/csrf')
  const dados: { token: string } = await resposta.json()
  return dados.token
}

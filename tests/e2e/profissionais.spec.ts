import { expect, test } from '@playwright/test'

const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'ana@aurora.com',
  role: 'GESTOR',
  estabelecimentoId: 4,
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessao) }),
  )
  await page.route('**/api/auth/csrf', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'token-teste' }),
    }),
  )
  await page.route('**/api/admin/estabelecimentos/4/servicos', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 10, nome: 'Corte', duracaoMinutos: 30, valor: 45, estabelecimentoId: 4 },
        { id: 11, nome: 'Escova', duracaoMinutos: 45, valor: 60, estabelecimentoId: 4 },
      ]),
    }),
  )
})

test('lista, cadastra e edita profissionais com seus horários', async ({ page }) => {
  const profissionais = [
    {
      id: 1,
      nome: 'Bia Souza',
      especialidades: ['Corte'],
      idsServicos: [10],
      diasDeAtendimento: [1, 7],
      diasDeFolga: ['2026-12-25'],
      estabelecimentoId: 4,
    },
  ]
  const disponibilidades: Record<string, unknown> = {
    1: {
      profissionalId: 1,
      jornadas: [
        { diaSemana: 1, horaInicio: '08:00:00', horaFim: '12:00:00' },
        { diaSemana: 7, horaInicio: '09:00:00', horaFim: '13:00:00' },
      ],
      folgas: [{ data: '2026-12-25', motivo: 'Natal' }],
    },
  }
  const enviados: { metodo: string; caminho: string; dados: unknown }[] = []

  await page.route(
    /\/api\/admin\/estabelecimentos\/4\/profissionais(?:\/\d+(?:\/disponibilidade)?)?$/,
    async (rota) => {
      const requisicao = rota.request()
      const caminho = new URL(requisicao.url()).pathname
      const json = (dados: unknown, status = 200) =>
        rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(dados) })

      if (requisicao.method() === 'GET') {
        const disponibilidade = caminho.match(/\/profissionais\/(\d+)\/disponibilidade$/)
        await json(disponibilidade ? disponibilidades[disponibilidade[1]] : profissionais)
        return
      }

      expect(requisicao.headers()['x-csrf-token']).toBe('token-teste')
      const dados = requisicao.postDataJSON()
      enviados.push({ metodo: requisicao.method(), caminho, dados })
      if (caminho.endsWith('/disponibilidade')) {
        const id = caminho.split('/').at(-2)!
        disponibilidades[id] = { profissionalId: Number(id), ...dados }
        await json(disponibilidades[id])
        return
      }
      if (requisicao.method() === 'POST') {
        const criado = { id: 2, ...dados, estabelecimentoId: 4 }
        profissionais.push(criado)
        await json(criado, 201)
        return
      }
      const atualizado = { id: 1, ...dados, estabelecimentoId: 4 }
      profissionais[0] = atualizado
      await json(atualizado)
    },
  )

  await page.goto('/painel/profissionais')
  await expect(page.getByText('Bia Souza')).toBeVisible()

  await page.getByRole('button', { name: 'Novo profissional' }).click()
  await page.getByLabel('Nome do profissional').fill('Lucas Mendes')
  await page.getByRole('checkbox', { name: 'Escova' }).check()
  await page.getByRole('button', { name: 'Adicionar turno em sábado' }).click()
  await page.getByRole('button', { name: 'Adicionar turno em domingo' }).click()
  await page.getByLabel('Fim do turno 1 de domingo').fill('12:00')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('status')).toHaveText('Lucas Mendes adicionado(a) à equipe.')
  await expect(page.getByText('Lucas Mendes', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Ver detalhes de Bia Souza' }).click()
  await expect(page.getByLabel('Início do turno 1 de domingo')).toHaveValue('09:00')
  await expect(page.getByText(/folga/i)).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Escova' }).check()
  await page.getByRole('button', { name: 'Adicionar turno em segunda' }).click()
  await page.getByLabel('Início do turno 2 de segunda').fill('14:00')
  await page.getByLabel('Fim do turno 2 de segunda').fill('18:00')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('status')).toHaveText('Alterações de Bia Souza salvas.')

  await page.getByRole('button', { name: 'Folgas de Bia Souza' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Folgas de Bia Souza' })
  await expect(dialogo.getByText('Natal')).toBeVisible()
  await dialogo.getByLabel('Data da folga').fill('2026-11-20')
  await dialogo.getByLabel('Motivo (opcional)').fill('Consulta médica')
  await dialogo.getByRole('button', { name: 'Adicionar folga' }).click()
  await expect(dialogo.getByRole('status')).toHaveText('Folga de 20/11/2026 adicionada.')
  await expect(dialogo.getByText('Consulta médica')).toBeVisible()
  await dialogo.getByRole('button', { name: 'Fechar' }).click()
  await expect(dialogo).toBeHidden()

  const base = '/api/admin/estabelecimentos/4/profissionais'
  expect(enviados).toEqual([
    {
      metodo: 'POST',
      caminho: base,
      dados: {
        nome: 'Lucas Mendes',
        especialidades: ['Escova'],
        idsServicos: [11],
        diasDeAtendimento: [6, 7],
        diasDeFolga: [],
      },
    },
    {
      metodo: 'PUT',
      caminho: `${base}/2/disponibilidade`,
      dados: {
        jornadas: [
          { diaSemana: 6, horaInicio: '08:00', horaFim: '18:00' },
          { diaSemana: 7, horaInicio: '08:00', horaFim: '12:00' },
        ],
        folgas: [],
      },
    },
    {
      metodo: 'PUT',
      caminho: `${base}/1`,
      dados: {
        nome: 'Bia Souza',
        especialidades: ['Corte', 'Escova'],
        idsServicos: [10, 11],
        diasDeAtendimento: [1, 7],
        diasDeFolga: ['2026-12-25'],
      },
    },
    {
      metodo: 'PUT',
      caminho: `${base}/1/disponibilidade`,
      dados: {
        jornadas: [
          { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
          { diaSemana: 7, horaInicio: '09:00', horaFim: '13:00' },
          { diaSemana: 1, horaInicio: '14:00', horaFim: '18:00' },
        ],
        folgas: [{ data: '2026-12-25', motivo: 'Natal' }],
      },
    },
    {
      metodo: 'PUT',
      caminho: `${base}/1/disponibilidade`,
      dados: {
        jornadas: [
          { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
          { diaSemana: 7, horaInicio: '09:00', horaFim: '13:00' },
          { diaSemana: 1, horaInicio: '14:00', horaFim: '18:00' },
        ],
        folgas: [
          { data: '2026-12-25', motivo: 'Natal' },
          { data: '2026-11-20', motivo: 'Consulta médica' },
        ],
      },
    },
  ])
})

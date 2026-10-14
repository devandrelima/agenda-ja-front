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

test('lista, cadastra e edita profissionais do estabelecimento da sessão', async ({ page }) => {
  const profissionais = [
    {
      id: 1,
      nome: 'Bia Souza',
      especialidades: ['Corte'],
      idsServicos: [10],
      diasDeAtendimento: [1, 2, 3],
      diasDeFolga: ['2026-12-25'],
      estabelecimentoId: 4,
    },
  ]
  await page.route(/\/api\/admin\/estabelecimentos\/4\/profissionais(?:\/\d+)?$/, async (rota) => {
    const requisicao = rota.request()
    if (requisicao.method() === 'GET') {
      await rota.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profissionais),
      })
      return
    }

    expect(requisicao.headers()['x-csrf-token']).toBe('token-teste')
    const dados = requisicao.postDataJSON()
    if (requisicao.method() === 'POST') {
      expect(dados).toEqual({
        nome: 'Lucas Mendes',
        especialidades: ['Escova'],
        idsServicos: [11],
        diasDeAtendimento: [6, 7],
        diasDeFolga: [],
      })
      const criado = { id: 2, ...dados, estabelecimentoId: 4 }
      profissionais.push(criado)
      await rota.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(criado),
      })
      return
    }

    expect(requisicao.method()).toBe('PUT')
    expect(requisicao.url()).toMatch(/\/profissionais\/1$/)
    expect(dados).toEqual({
      nome: 'Bia Souza',
      especialidades: ['Corte', 'Escova'],
      idsServicos: [10, 11],
      diasDeAtendimento: [1, 2, 3],
      diasDeFolga: ['2026-12-25'],
    })
    const atualizado = { id: 1, ...dados, estabelecimentoId: 4 }
    profissionais[0] = atualizado
    await rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(atualizado),
    })
  })

  await page.goto('/painel/profissionais')
  await expect(page.getByText('Bia Souza')).toBeVisible()

  await page.getByRole('button', { name: 'Novo profissional' }).click()
  await page.getByLabel('Nome do profissional').fill('Lucas Mendes')
  await page.getByRole('checkbox', { name: 'Escova' }).check()
  await page.getByRole('checkbox', { name: 'sáb' }).check()
  await page.getByRole('checkbox', { name: 'dom' }).check()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('status')).toHaveText('Lucas Mendes adicionado(a) à equipe.')
  await expect(page.getByText('Lucas Mendes', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Ver detalhes de Bia Souza' }).click()
  await page.getByRole('checkbox', { name: 'Escova' }).check()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('status')).toHaveText('Alterações de Bia Souza salvas.')
})

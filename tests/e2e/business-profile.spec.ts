import { expect, test } from '@playwright/test'

const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'ana@aurora.com',
  role: 'GESTOR',
  estabelecimentoId: 4,
}

const negocio = {
  id: 4,
  nome: 'Ateliê Aurora',
  categoria: 'Salão de beleza',
  localizacao: 'Rua das Flores, 120',
  imagemUrl: null,
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessao) }),
  )
})

test('edita os dados cadastrados do negócio e mostra a alteração na apresentação', async ({
  page,
}) => {
  await page.route('**/api/admin/estabelecimentos/4', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(negocio) }),
  )
  await page.goto('/painel/configuracoes')
  const titulos = await page.locator('.main h2').allTextContents()
  expect(titulos).toEqual(['Foto de capa', 'Dados do negócio', 'Horários de funcionamento'])

  const card = page.locator('.business-profile-card')
  await expect(card).toContainText('Ateliê Aurora')
  await expect(card).toContainText('Rua das Flores, 120')
  await card.getByRole('button', { name: 'Editar dados' }).click()
  await card.getByRole('textbox', { name: 'Nome do negócio' }).fill('   ')
  await card.getByRole('button', { name: 'Salvar dados' }).click()
  await expect(card.getByRole('alert')).toHaveText(
    'Preencha nome, categoria e localização do negócio.',
  )

  await card.getByRole('textbox', { name: 'Nome do negócio' }).fill('  Estúdio Brisa  ')
  await card.getByRole('combobox', { name: 'Categoria' }).selectOption('Barbearia')
  await card.getByRole('textbox', { name: 'Localização' }).fill('Av. Central, 25')
  await card.getByRole('button', { name: 'Salvar dados' }).click()
  await expect(card.getByRole('status')).toHaveText('Dados do negócio atualizados.')
  await expect(card).toContainText('Estúdio Brisa')

  await page.goto('/estabelecimento/atelie-aurora')
  await expect(page.getByRole('heading', { name: 'Estúdio Brisa' })).toBeVisible()
  await expect(page.getByText('Barbearia').first()).toBeVisible()
  await expect(page.getByText('Av. Central, 25')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Estúdio Brisa' })).toBeVisible()

  await page.goto('/painel/configuracoes')
  await expect(card).toContainText('Estúdio Brisa')
})

test('permite tentar novamente quando a consulta do negócio falha', async ({ page }) => {
  let recuperar = false
  await page.route('**/api/admin/estabelecimentos/4', (rota) => {
    return rota.fulfill(
      recuperar
        ? { status: 200, contentType: 'application/json', body: JSON.stringify(negocio) }
        : { status: 500 },
    )
  })
  await page.goto('/painel/configuracoes')
  const card = page.locator('.business-profile-card')
  await expect(card.getByRole('alert')).toHaveText('Não foi possível carregar os dados do negócio.')
  recuperar = true
  await card.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(card).toContainText('Ateliê Aurora')
  await expect(card.getByRole('button', { name: 'Editar dados' })).toBeVisible()
})

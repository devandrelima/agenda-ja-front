import { test, expect } from '@playwright/test'

test('habilita o login após preencher e-mail e senha', async ({ page }) => {
  await page.goto('/login')

  const entrar = page.getByRole('button', { name: 'Entrar', exact: true })
  await expect(entrar).toBeDisabled()

  await page.getByLabel('E-mail').fill('equipe@aurora.com')
  await page.getByLabel('Senha').fill('senha-segura')

  await expect(entrar).toBeEnabled()
})

test('conclui a jornada pública como demonstração', async ({ page }) => {
  await page.goto('/estabelecimento/atelie-aurora')
  await page.getByRole('link', { name: /fazer primeiro agendamento/i }).click()
  await page.getByRole('button', { name: /corte feminino/i }).click()
  await page.getByRole('button', { name: /ana martins/i }).click()
  await page.locator('.filters .button').nth(1).click()
  await page.getByRole('button', { name: '09:00' }).click()
  await page.getByRole('button', { name: /continuar/i }).click()
  await page.getByLabel('Nome completo').fill('Joana da Silva')
  await page.getByLabel(/telefone/i).fill('(85) 99999-9999')
  await page.getByLabel('E-mail').fill('joana@exemplo.com')
  await page.getByRole('button', { name: /revisar/i }).click()
  await expect(page.getByText('Agendamento de demonstração')).toBeVisible()

  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveValue('joana@exemplo.com')
})

test('redireciona a raiz para o login', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible()
})

test('inicia um agendamento pelo painel', async ({ page }) => {
  await page.goto('/painel')
  await page.getByRole('button', { name: 'Novo agendamento' }).click()

  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora\/agendar$/)
  await expect(page.getByRole('heading', { name: 'Fazer agendamento' })).toBeVisible()

  await page.getByRole('link', { name: '← Voltar ao painel' }).click()
  await expect(page).toHaveURL(/\/painel$/)
})

test('volta para a apresentação ao iniciar o agendamento por ela', async ({ page }) => {
  await page.goto('/estabelecimento/atelie-aurora')
  await page.getByRole('link', { name: /fazer primeiro agendamento/i }).click()

  await page.getByRole('link', { name: '← Ateliê Aurora' }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora$/)
})

test('permite voltar entre as etapas do agendamento', async ({ page }) => {
  await page.goto('/estabelecimento/atelie-aurora/agendar')
  await page.getByRole('button', { name: /corte feminino/i }).click()
  await expect(page.getByRole('heading', { name: 'Escolha o profissional' })).toBeVisible()

  await page.getByRole('button', { name: 'Voltar' }).click()
  await expect(page.getByRole('heading', { name: 'Escolha o serviço' })).toBeVisible()
})

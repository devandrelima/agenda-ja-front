import { expect, test } from '@playwright/test'

test('mantém a página pública de demonstração no link existente', async ({ page }) => {
  await page.goto('/estabelecimento/atelie-aurora')
  await expect(page.getByRole('heading', { name: 'Ateliê Aurora' })).toBeVisible()
  await expect(page.getByText('Salão de beleza').first()).toBeVisible()
  await expect(page.getByText('Endereço ilustrativo · Centro')).toBeVisible()
  await page.getByRole('link', { name: 'Ver serviços e disponibilidade' }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora\/disponibilidade$/)
})

test('abre avaliações em página própria e volta pela seta', async ({ page }) => {
  await page.goto('/estabelecimento/atelie-aurora')
  await page.getByRole('link', { name: '126 avaliações' }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora\/avaliacoes$/)
  await expect(page.getByRole('heading', { name: 'Comentários de clientes' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByLabel('Ordenar por').selectOption('menos-estrelas')
  await expect(page.locator('.review').first()).toContainText('Aline Freitas')
  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page.getByText('Página 2 de 13')).toBeVisible()

  await page.getByRole('link', { name: 'Voltar para a página do estabelecimento' }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora$/)
})

test('abre o link público e mostra somente dados do estabelecimento', async ({ page }) => {
  await page.route('**/api/estabelecimentos/4', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 4,
        nome: 'Estúdio Brisa',
        categoria: 'Barbearia',
        localizacao: 'Rua das Flores, 120',
        imagemUrl: null,
      }),
    }),
  )

  await page.goto('/estabelecimento/4')
  await expect(page.getByRole('heading', { name: 'Estúdio Brisa' })).toBeVisible()
  await expect(page.getByText('Rua das Flores, 120')).toBeVisible()
  await expect(page.getByText('Barbearia').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver serviços' })).toBeVisible()
  await page.getByRole('link', { name: 'Fazer primeiro agendamento' }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/4\/agendar$/)
})

test('mostra mensagem quando o link não existe', async ({ page }) => {
  await page.route('**/api/estabelecimentos/999', (rota) => rota.fulfill({ status: 404 }))
  await page.goto('/estabelecimento/999')
  await expect(page.getByRole('heading', { name: 'Estabelecimento não encontrado.' })).toBeVisible()
})

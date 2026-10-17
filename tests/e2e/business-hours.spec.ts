import { expect, test } from '@playwright/test'

const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'ana@aurora.com',
  role: 'GESTOR',
  estabelecimentoId: 4,
}

test('gestor edita horários do negócio e a página pública mostra a prévia salva', async ({
  page,
}) => {
  await page.route('**/api/auth/me', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessao) }),
  )
  await page.goto('/painel')
  await expect(page.getByRole('heading', { name: 'Horários de funcionamento' })).toBeVisible()
  await page.getByRole('button', { name: 'Editar horários' }).click()

  const segunda = page.getByRole('group', { name: 'Segunda' })
  await segunda.getByLabel('Abertura de Segunda').fill('18:00')
  await segunda.getByLabel('Fechamento de Segunda').fill('08:00')
  await page.getByRole('button', { name: 'Salvar horários' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'O fechamento de Segunda deve ser depois da abertura.',
  )

  await segunda.getByLabel('Abertura de Segunda').fill('09:00')
  await segunda.getByLabel('Fechamento de Segunda').fill('18:00')
  await page
    .getByRole('group', { name: 'Terça' })
    .getByRole('checkbox', { name: 'Fechado' })
    .check()
  await page.getByRole('button', { name: 'Salvar horários' }).click()
  await expect(page.getByRole('status')).toHaveText('Horários atualizados nesta prévia.')
  await expect(page.getByRole('listitem').filter({ hasText: 'Segunda' })).toContainText(
    '09:00 às 18:00',
  )
  await expect(page.getByRole('listitem').filter({ hasText: 'Terça' })).toContainText('Fechado')

  await page.getByRole('link', { name: 'Ver página de horários' }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora\/disponibilidade$/)
  await expect(page.getByRole('listitem').filter({ hasText: 'Segunda' })).toContainText(
    '09:00 às 18:00',
  )
  await expect(page.getByRole('listitem').filter({ hasText: 'Terça' })).toContainText('Fechado')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Segunda' })).toContainText(
    '09:00 às 18:00',
  )
})

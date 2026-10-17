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
  await page.route('**/api/admin/estabelecimentos/4', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 4,
        nome: 'Ateliê Aurora',
        categoria: 'Salão de beleza',
        localizacao: 'Endereço ilustrativo · Centro',
        imagemUrl: null,
      }),
    }),
  )
})

test('gestor edita os turnos do negócio e a página pública mostra os períodos salvos', async ({
  page,
}) => {
  await page.goto('/painel')
  await expect(page.getByRole('heading', { name: 'Horários de funcionamento' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Configurações' }).click()
  await expect(page).toHaveURL(/\/painel\/configuracoes$/)
  await expect(page.getByRole('heading', { name: 'Horários de funcionamento' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver página de horários' })).toHaveCount(0)
  await expect(page.getByText('Prévia local:')).toHaveCount(0)
  await page.getByRole('button', { name: 'Editar horários' }).click()

  await page.getByLabel('Fim do turno 1 de Segunda').fill('07:00')
  await page.getByRole('button', { name: 'Salvar horários' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Os turnos de Segunda devem começar antes de terminar.',
  )

  await page.getByLabel('Fim do turno 1 de Segunda').fill('12:00')
  await page.getByRole('button', { name: 'Adicionar turno em Segunda' }).click()
  await page.getByLabel('Início do turno 2 de Segunda').fill('11:00')
  await page.getByLabel('Fim do turno 2 de Segunda').fill('18:00')
  await page.getByRole('button', { name: 'Salvar horários' }).click()
  await expect(page.getByRole('alert')).toHaveText('Há turnos sobrepostos em Segunda.')

  await page.getByLabel('Início do turno 2 de Segunda').fill('14:00')
  await page.getByRole('button', { name: 'Remover turno 1 de Terça' }).click()
  await page.getByRole('button', { name: 'Salvar horários' }).click()
  await expect(page.getByRole('status')).toHaveText('Horários atualizados.')
  await expect(
    page.locator('.business-hours-list li').filter({ hasText: 'Segunda' }),
  ).toContainText('08:00 às 12:00 · 14:00 às 18:00')
  await expect(page.locator('.business-hours-list li').filter({ hasText: 'Terça' })).toContainText(
    'Fechado',
  )

  await page.goto('/estabelecimento/atelie-aurora/disponibilidade')
  await expect(page.locator('.availability-list li').filter({ hasText: 'Segunda' })).toContainText(
    '08:00 às 12:00 · 14:00 às 18:00',
  )
  await expect(page.locator('.availability-list li').filter({ hasText: 'Terça' })).toContainText(
    'Fechado',
  )
  await page.reload()
  await expect(page.locator('.availability-list li').filter({ hasText: 'Segunda' })).toContainText(
    '08:00 às 12:00 · 14:00 às 18:00',
  )
})

test('foto escolhida no painel aparece na apresentação pública', async ({ page }) => {
  await page.goto('/painel')
  await expect(page.getByRole('img', { name: 'Foto de capa do negócio' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Configurações' }).click()
  const imagem = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 24
    const contexto = canvas.getContext('2d')!
    contexto.fillStyle = '#0f766e'
    contexto.fillRect(0, 0, 32, 24)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.getByLabel('Escolher foto de capa').setInputFiles({
    name: 'capa.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imagem, 'base64'),
  })
  const fotoPainel = page.getByRole('img', { name: 'Foto de capa do negócio' })
  await expect(fotoPainel).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  const origem = await fotoPainel.getAttribute('src')
  const alturaPainel = await fotoPainel.evaluate((imagem) => imagem.getBoundingClientRect().height)

  await page.goto('/estabelecimento/atelie-aurora')
  const fotoPublica = page.getByRole('img', { name: 'Foto do Ateliê Aurora' })
  await expect(fotoPublica).toHaveAttribute('src', origem!)
  const alturaPublica = await fotoPublica.evaluate(
    (imagem) => imagem.getBoundingClientRect().height,
  )
  expect(alturaPainel).toBe(alturaPublica)
})

test('configurações retorna ao início pela seta', async ({ page }) => {
  await page.goto('/painel')
  await page.getByRole('button', { name: 'Configurações' }).click()
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()
  await expect(page.locator('.sidebar')).toHaveCount(0)
  const sair = page.locator('.settings-footer').getByRole('button', { name: 'Sair', exact: true })
  await expect(sair).toBeVisible()
  const horarios = await page.locator('.business-hours-card').boundingBox()
  const botaoSair = await sair.boundingBox()
  expect(botaoSair!.y).toBeGreaterThan(horarios!.y + horarios!.height)
  await page.getByRole('link', { name: 'Voltar ao início do painel' }).click()
  await expect(page).toHaveURL(/\/painel$/)
  await expect(page.getByRole('heading', { name: 'Olá, Ana Gestora' })).toBeVisible()
  await expect(page.locator('.sidebar')).toBeVisible()
})

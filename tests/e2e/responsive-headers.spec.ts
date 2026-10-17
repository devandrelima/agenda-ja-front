import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        nome: 'Ana Gestora',
        email: 'ana@aurora.com',
        role: 'GESTOR',
        estabelecimentoId: 4,
      }),
    }),
  )
  await page.route(/\/api\/admin\/estabelecimentos\/4\/(profissionais|servicos)$/, (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
})

for (const { caminho, titulo, acao } of [
  { caminho: '/painel/profissionais', titulo: 'Profissionais', acao: 'Novo profissional' },
  { caminho: '/painel/servicos', titulo: 'Serviços', acao: 'Novo serviço' },
]) {
  test(`mantém ${acao} ao lado do título em telas pequenas`, async ({ page }) => {
    const cabecalho = page.locator('.topbar-with-create')
    const heading = cabecalho.getByRole('heading', { name: titulo })
    const button = cabecalho.getByRole('button', { name: acao })

    for (const largura of [320, 390, 700, 701, 850, 851, 1000]) {
      await page.setViewportSize({ width: largura, height: 800 })
      await page.goto(caminho)
      await expect(button).toBeVisible()
      const tituloBox = await heading.boundingBox()
      const botaoBox = await button.boundingBox()
      const cabecalhoBox = await cabecalho.boundingBox()

      expect(tituloBox).not.toBeNull()
      expect(botaoBox).not.toBeNull()
      expect(cabecalhoBox).not.toBeNull()
      expect(botaoBox!.x).toBeGreaterThanOrEqual(tituloBox!.x + tituloBox!.width)
      expect(botaoBox!.y).toBeLessThan(tituloBox!.y + tituloBox!.height)
      expect(botaoBox!.y + botaoBox!.height).toBeGreaterThan(tituloBox!.y)
      expect(botaoBox!.x + botaoBox!.width).toBeLessThanOrEqual(cabecalhoBox!.x + cabecalhoBox!.width + 1)
      expect(await heading.evaluate((elemento) => elemento.scrollWidth)).toBeLessThanOrEqual(
        Math.ceil(tituloBox!.width),
      )
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        largura,
      )
    }
  })
}

test('alinha os atalhos ao nome do gestor e o novo agendamento abaixo no início', async ({ page }) => {
  const cabecalho = page.locator('.topbar-dashboard')
  const nome = cabecalho.getByRole('heading', { name: 'Olá, Ana Gestora' })
  const configuracoes = cabecalho.getByRole('button', { name: 'Configurações' })
  const link = cabecalho.getByRole('button', { name: 'Copiar link da página do negócio' })
  const novo = cabecalho.getByRole('button', { name: 'Novo agendamento' })

  for (const largura of [320, 390, 700, 701, 850]) {
    await page.setViewportSize({ width: largura, height: 800 })
    await page.goto('/painel')
    await expect(novo).toBeVisible()

    const nomeBox = (await nome.boundingBox())!
    const configuracoesBox = (await configuracoes.boundingBox())!
    const linkBox = (await link.boundingBox())!
    const novoBox = (await novo.boundingBox())!

    expect(configuracoesBox.x).toBeGreaterThanOrEqual(nomeBox.x + nomeBox.width)
    expect(linkBox.x).toBeGreaterThan(configuracoesBox.x + configuracoesBox.width)
    for (const icone of [configuracoesBox, linkBox]) {
      expect(icone.y).toBeLessThan(nomeBox.y + nomeBox.height)
      expect(icone.y + icone.height).toBeGreaterThan(nomeBox.y)
    }
    expect(novoBox.y).toBeGreaterThanOrEqual(nomeBox.y + nomeBox.height)
    expect(novoBox.x).toBe(nomeBox.x)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      largura,
    )
  }
})

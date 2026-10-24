import { expect, test, type Page } from '@playwright/test'

const publicId = 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311'
const json = (dados: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(dados),
})

async function prepararApi(page: Page) {
  await page.route(`**/api/estabelecimentos/publico/${publicId}`, (rota) =>
    rota.fulfill(
      json({ id: 4, publicId, nome: 'Estúdio Brisa com um nome comprido', categoria: '' }),
    ),
  )
  await page.route('**/api/estabelecimentos/4/servicos', (rota) =>
    rota.fulfill(
      json([{ id: 7, nome: 'Escova progressiva com hidratação', duracaoMinutos: 45, valor: 160 }]),
    ),
  )
  await page.route('**/api/estabelecimentos/4/servicos/7/profissionais', (rota) =>
    rota.fulfill(
      json([
        {
          id: 1,
          nome: 'Lucas Mendes',
          especialidades: ['Escova'],
          idsServicos: [7],
          diasDeAtendimento: [1, 2, 3, 4, 5, 6, 7],
          diasDeFolga: [],
        },
      ]),
    ),
  )
  await page.route('**/api/estabelecimentos/4/servicos/7/disponibilidade*', (rota) =>
    rota.fulfill(json(['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30'])),
  )
}

/** Nada pode passar da largura da tela nem criar rolagem horizontal. */
async function semTransbordo(page: Page) {
  const transbordo = await page.evaluate(() => {
    const largura = document.documentElement.clientWidth
    const fora = [...document.querySelectorAll('body *')].filter((elemento) => {
      const caixa = elemento.getBoundingClientRect()
      return caixa.width > 0 && (caixa.right > largura + 1 || caixa.left < -1)
    })
    return { rolagem: document.documentElement.scrollWidth - largura, fora: fora.length }
  })
  expect(transbordo).toEqual({ rolagem: 0, fora: 0 })
}

for (const [largura, altura] of [
  [320, 640],
  [390, 844],
  [768, 380],
  [1024, 768],
  [1440, 900],
]) {
  test(`agendamento público cabe na tela em ${largura}x${altura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura })
    await prepararApi(page)
    await page.goto(`/estabelecimento/${publicId}/agendar`)
    await expect(page.getByRole('heading', { name: 'Fazer agendamento' })).toBeVisible()
    await page.getByRole('button', { name: /escova/i }).click()
    await semTransbordo(page)

    await page.getByRole('button', { name: /lucas mendes/i }).click()
    await page.locator('.filters .button').first().click()
    await page.getByRole('button', { name: '10:00' }).click()
    await semTransbordo(page)

    await semTransbordo(page)
  })
}

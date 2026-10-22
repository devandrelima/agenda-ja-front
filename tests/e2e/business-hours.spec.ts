import { expect, test } from '@playwright/test'

const publicId = 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311'
const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'ana@aurora.com',
  role: 'GESTOR',
  estabelecimentoId: 4,
}

test('configurações salvam dados, capa e horários na API e atualizam a vitrine', async ({
  page,
}) => {
  test.setTimeout(30000)
  let negocio = {
    id: 4,
    publicId,
    nome: 'Ateliê Aurora',
    categoria: 'Salão de beleza',
    localizacao: 'Centro',
    imagemUrl: null as string | null,
    horariosFuncionamento: Array.from({ length: 7 }, (_, indice) => ({
      turnos: indice === 0 ? [{ inicio: '08:00', fim: '12:00' }] : [],
    })),
  }
  await page.route('**/api/auth/me', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessao) }),
  )
  await page.route('**/api/auth/csrf', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: '{"token":"teste"}' }),
  )
  await page.route('**/api/admin/estabelecimentos/4', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(negocio) }),
  )
  await page.route('**/api/admin/estabelecimentos/4/*', async (rota) => {
    expect(rota.request().headers()['x-csrf-token']).toBe('teste')
    const tipo = rota.request().url().split('/').at(-1)
    negocio = {
      ...negocio,
      ...(tipo === 'horarios'
        ? { horariosFuncionamento: rota.request().postDataJSON() }
        : rota.request().postDataJSON()),
    }
    await rota.fulfill({ status: 200 })
  })
  await page.route(`**/api/estabelecimentos/publico/${publicId}`, (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(negocio) }),
  )
  await page.route('**/api/estabelecimentos/4/servicos', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )

  await page.goto('/painel/configuracoes')
  await page.getByRole('button', { name: 'Editar dados' }).click()
  await page.getByLabel('Nome do negócio').fill('Ateliê Renovado')
  await page.getByRole('button', { name: 'Salvar dados' }).click()
  await expect(page.getByText('Dados do negócio atualizados.')).toBeVisible()

  await page.getByRole('button', { name: 'Editar horários' }).click()
  await page.getByRole('button', { name: 'Adicionar turno em Segunda' }).click()
  await page.getByLabel('Início do turno 2 de Segunda').fill('14:00')
  await page.getByLabel('Fim do turno 2 de Segunda').fill('18:00')
  await page.getByRole('button', { name: 'Salvar horários' }).click()
  await expect(page.getByText('Horários atualizados.')).toBeVisible()

  const imagem = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 24
    canvas.getContext('2d')!.fillRect(0, 0, 32, 24)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page
    .getByLabel('Escolher foto de capa')
    .setInputFiles({
      name: 'capa.png',
      mimeType: 'image/png',
      buffer: Buffer.from(imagem, 'base64'),
    })
  await expect(page.getByRole('img', { name: 'Foto de capa do negócio' })).toHaveAttribute(
    'src',
    /^data:image\/jpeg;base64,/,
  )

  await page.goto(`/estabelecimento/${publicId}`)
  await expect(page.getByRole('heading', { name: 'Ateliê Renovado' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Foto do Ateliê Renovado' })).toHaveAttribute(
    'src',
    negocio.imagemUrl!,
  )
  await expect(page.getByRole('heading', { name: 'Horários de funcionamento' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Ver horários e serviços' }).click()
  await expect(
    page.getByRole('region', { name: 'Horários da semana' }).getByText('08:00 às 12:00 · 14:00 às 18:00'),
  ).toBeVisible()
})

test('configurações retorna ao início pela seta', async ({ page }) => {
  await page.route('**/api/auth/me', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessao) }),
  )
  await page.route('**/api/admin/estabelecimentos/4', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 4,
        publicId,
        nome: 'Ateliê Aurora',
        categoria: 'Salão de beleza',
        localizacao: 'Centro',
        imagemUrl: null,
        horariosFuncionamento: Array.from({ length: 7 }, () => ({ turnos: [] })),
      }),
    }),
  )
  await page.goto('/painel/configuracoes')
  await expect(page.locator('.sidebar')).toHaveCount(0)
  await expect(page.locator('.settings-footer').getByRole('button', { name: 'Sair' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início do painel' }).click()
  await expect(page).toHaveURL(/\/painel$/)
})

import { expect, test } from '@playwright/test'

const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'ana@aurora.com',
  role: 'GESTOR',
  estabelecimentoId: 4,
}

test('mostra e oculta a senha sem enviar o formulário e valida e-mail no login', async ({
  page,
}) => {
  await page.route('**/api/auth/me', (rota) => rota.fulfill({ status: 401 }))
  let tentativasDeLogin = 0
  await page.route('**/api/auth/login', (rota) => {
    tentativasDeLogin += 1
    return rota.fulfill({ status: 401 })
  })
  await page.goto('/login')

  await page.getByLabel('E-mail').fill('ana@invalido')
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura')
  await page.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text')
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('senha-segura')
  await page.getByRole('button', { name: 'Ocultar senha' }).click()
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'password')

  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  expect(tentativasDeLogin).toBe(0)
})

test('aplica máscara e valida celular e e-mail no cadastro do cliente', async ({ page }) => {
  await page.route('**/api/auth/me', (rota) => rota.fulfill({ status: 401 }))
  await page.goto('/cadastro')
  await page.getByRole('button', { name: 'Cliente' }).click()
  await page.getByLabel('Nome completo').fill('Marina Silva')
  await page.getByLabel('Telefone/WhatsApp').fill('8499429168')
  await page.getByLabel('E-mail').fill('marina@invalido')
  await page.getByLabel('Senha', { exact: true }).fill('senha-teste')
  await expect(page.getByRole('button', { name: 'Mostrar senha' })).toBeVisible()
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText('Informe um celular válido com DDD.')).toBeVisible()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  await expect(page).toHaveURL(/\/cadastro$/)

  await page.getByLabel('Telefone/WhatsApp').fill('84994291683')
  await expect(page.getByLabel('Telefone/WhatsApp')).toHaveValue('(84) 9 9429-1683')
  await page.getByLabel('E-mail').fill('marina@exemplo.com')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('gestor entra, copia o link, mantém a sessão após recarregar e sai', async ({ page }) => {
  let autenticado = false
  await page.route('**/api/auth/me', (rota) =>
    rota.fulfill(
      autenticado
        ? { status: 200, contentType: 'application/json', body: JSON.stringify(sessao) }
        : { status: 401 },
    ),
  )
  await page.route('**/api/auth/csrf', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'token-teste' }),
    }),
  )
  await page.route('**/api/auth/login', async (rota) => {
    expect(rota.request().headers()['x-csrf-token']).toBe('token-teste')
    autenticado = true
    await rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessao),
    })
  })
  await page.route('**/api/auth/logout', async (rota) => {
    expect(rota.request().headers()['x-csrf-token']).toBe('token-teste')
    autenticado = false
    await rota.fulfill({ status: 204 })
  })
  await page.route('**/api/admin/estabelecimentos/**', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )

  await page.goto('/login')
  await page.getByLabel('E-mail').fill(sessao.email)
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Ana Gestora' })).toBeVisible()

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  const linkDaPagina = new URL('/estabelecimento/atelie-aurora', page.url()).toString()
  await page.getByRole('button', { name: 'Copiar link da página do negócio' }).click()
  await expect(page.getByRole('status')).toHaveText('Link copiado!')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(linkDaPagina)

  await page.evaluate(async () => {
    await navigator.clipboard.writeText('')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
  })
  await page.getByRole('button', { name: 'Copiar link da página do negócio' }).click()
  expect(
    await page.evaluate(async () => {
      Reflect.deleteProperty(navigator, 'clipboard')
      return navigator.clipboard.readText()
    }),
  ).toBe(linkDaPagina)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Olá, Ana Gestora' })).toBeVisible()
  await page.getByRole('link', { name: 'Profissionais' }).click()
  await expect(page).toHaveURL(/\/painel\/profissionais$/)
  await expect(page.getByRole('heading', { name: 'Profissionais' })).toBeVisible()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/painel/profissionais')
  await expect(page).toHaveURL(/\/login$/)
})

test('cadastro envia os dados exigidos e encaminha ao login', async ({ page }) => {
  await page.route('**/api/auth/me', (rota) => rota.fulfill({ status: 401 }))
  await page.route('**/api/auth/csrf', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'token-teste' }),
    }),
  )
  await page.route('**/api/estabelecimentos', async (rota) => {
    expect(rota.request().postDataJSON()).toMatchObject({
      nomeNegocio: 'Ateliê Aurora',
      categoria: 'Salão de beleza',
      localizacao: 'Centro, Fortaleza',
      nomeGestor: 'Ana Gestora',
      email: sessao.email,
      senha: 'senha-segura',
    })
    await rota.fulfill({ status: 201 })
  })

  await page.goto('/cadastro')
  await page.getByLabel('Nome do negócio').fill('Ateliê Aurora')
  await page.getByLabel('Categoria').selectOption('Salão de beleza')
  await page.getByLabel('Localização').fill('Centro, Fortaleza')
  await page.getByLabel('Nome do gestor').fill('Ana Gestora')
  await page.getByLabel('E-mail').fill(sessao.email)
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura')
  await page.getByRole('button', { name: 'Criar conta' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('status')).toContainText('Conta criada.')
})

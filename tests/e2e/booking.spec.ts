import { test, expect } from '@playwright/test'

test('habilita o login após preencher e-mail e senha', async ({ page }) => {
  await page.route('**/api/auth/me', (rota) => rota.fulfill({ status: 401 }))
  await page.goto('/login')

  const entrar = page.getByRole('button', { name: 'Entrar', exact: true })
  await expect(entrar).toBeDisabled()

  await page.getByLabel('E-mail').fill('equipe@aurora.com')
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura')

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
  await page.getByLabel(/telefone/i).fill('8599999999')
  await page.getByLabel('E-mail').fill('joana@invalido')
  await page.getByRole('button', { name: /revisar/i }).click()
  await expect(page.getByText('Informe um celular válido com DDD.')).toBeVisible()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  await page.getByLabel(/telefone/i).fill('85999999999')
  await expect(page.getByLabel(/telefone/i)).toHaveValue('(85) 9 9999-9999')
  await page.getByLabel('E-mail').fill('joana@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('curta')
  await page.getByRole('button', { name: /revisar/i }).click()
  await expect(page.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeVisible()
  await page.getByLabel('Senha', { exact: true }).fill('SenhaTeste123')
  await page.getByRole('button', { name: /revisar/i }).click()
  await expect(page.getByText('Agendamento de demonstração')).toBeVisible()

  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveValue('joana@exemplo.com')
})

test('redireciona a raiz para o login', async ({ page }) => {
  await page.route('**/api/auth/me', (rota) => rota.fulfill({ status: 401 }))
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible()
})

test('inicia um agendamento pelo painel', async ({ page }) => {
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
  const publicId = 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311'
  const json = (dados: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(dados),
  })
  await page.route('**/api/admin/estabelecimentos/4', (rota) => rota.fulfill(json({ publicId })))
  await page.route(`**/api/estabelecimentos/publico/${publicId}`, (rota) =>
    rota.fulfill(json({ id: 4, publicId, nome: 'Estúdio Brisa', categoria: '', localizacao: '' })),
  )
  await page.route('**/api/estabelecimentos/4/servicos', (rota) =>
    rota.fulfill(json([{ id: 7, nome: 'Escova', duracaoMinutos: 45, valor: 60 }])),
  )
  await page.route('**/api/estabelecimentos/4/servicos/7/profissionais', (rota) =>
    rota.fulfill(json([])),
  )
  await page.goto('/painel')
  await page.getByRole('button', { name: 'Novo agendamento' }).click()

  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar`)
  await expect(page.getByRole('heading', { name: 'Escolha o serviço' })).toBeVisible()
  await expect(page.getByRole('button', { name: /corte feminino/i })).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Etapas do agendamento' })).toBeVisible()
  await page.getByRole('button', { name: /escova/i }).click()
  await page.getByRole('link', { name: 'Continuar' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar/profissional?servico=7`)
  await expect(page.getByRole('heading', { name: 'Escolha o profissional' })).toBeVisible()

  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar?servico=7`)

  await page.getByRole('link', { name: 'Voltar ao painel' }).click()
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

test('navega pelas bolinhas sem perder as escolhas ao voltar ao serviço', async ({ page }) => {
  const publicId = 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311'
  let consultasEstabelecimento = 0
  let consultasServicos = 0
  const json = (dados: unknown) => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(dados),
  })
  await page.route(`**/api/estabelecimentos/publico/${publicId}`, (rota) => {
    consultasEstabelecimento++
    return rota.fulfill(json({ id: 4, publicId, nome: 'Estúdio Brisa' }))
  })
  await page.route('**/api/estabelecimentos/4/servicos', (rota) => {
    consultasServicos++
    return rota.fulfill(json([{ id: 7, nome: 'Escova', duracaoMinutos: 45, valor: 60 }]))
  })
  await page.route('**/api/estabelecimentos/4/servicos/7/profissionais', (rota) =>
    rota.fulfill(
      json([
        {
          id: 3,
          nome: 'Ana Martins',
          especialidades: ['Escova'],
          idsServicos: [7],
          diasDeAtendimento: [1, 2, 3, 4, 5, 6, 7],
          diasDeFolga: [],
        },
      ]),
    ),
  )
  await page.route('**/api/estabelecimentos/4/servicos/7/disponibilidade*', (rota) =>
    rota.fulfill(json(['09:00'])),
  )

  await page.goto(`/estabelecimento/${publicId}/agendar`)
  await expect(page.getByRole('button', { name: 'Ir para Profissional' })).toBeDisabled()
  const consultasIniciais = {
    estabelecimento: consultasEstabelecimento,
    servicos: consultasServicos,
  }
  await page.getByRole('button', { name: /Escova.*45 min.*R\$ 60,00/ }).click()
  await page.getByRole('button', { name: 'Ir para Profissional' }).click()
  await expect(page.getByRole('button', { name: 'Ir para Data e horário' })).toBeDisabled()
  await page.getByRole('button', { name: /Ana Martins/ }).click()
  await page.locator('.filters .button').first().click()
  await page.getByRole('button', { name: '09:00' }).click()
  await page.getByRole('button', { name: 'Ir para Seus dados' }).click()
  await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir para Serviço' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar?servico=7`)
  await page.getByRole('button', { name: /Escova.*45 min.*R\$ 60,00/ }).click()
  await page.getByRole('button', { name: 'Ir para Seus dados' }).click()
  await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir para Data e horário' }).click()
  await expect(page.getByRole('button', { name: '09:00' })).toHaveClass(/selected/)
  expect(consultasEstabelecimento).toBe(consultasIniciais.estabelecimento)
  expect(consultasServicos).toBe(consultasIniciais.servicos)
})

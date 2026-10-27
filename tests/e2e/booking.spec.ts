import { test, expect } from '@playwright/test'

async function mockAutenticacaoCliente(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/csrf', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'teste' }) }),
  )
  await page.route('**/api/clientes', (rota) => rota.fulfill({ status: 201 }))
  await page.route('**/api/auth/login', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 2,
        nome: 'Joana da Silva',
        email: 'joana@exemplo.com',
        role: 'CLIENTE',
        estabelecimentoId: null,
      }),
    }),
  )
}

test('habilita o login após preencher e-mail e senha', async ({ page }) => {
  await page.route('**/api/auth/me', (rota) => rota.fulfill({ status: 401 }))
  await page.goto('/login')

  const entrar = page.getByRole('button', { name: 'Entrar', exact: true })
  await expect(entrar).toBeDisabled()

  await page.getByLabel('E-mail').fill('equipe@aurora.com')
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura')

  await expect(entrar).toBeEnabled()
})

test('conclui a jornada pública com cadastro de cliente', async ({ page }) => {
  await mockAutenticacaoCliente(page)
  await page.goto('/estabelecimento/atelie-aurora')
  await page.getByRole('link', { name: /fazer primeiro agendamento/i }).click()
  await page.getByRole('button', { name: /corte feminino/i }).click()
  await page.getByRole('button', { name: /ana martins/i }).click()
  await page.locator('.filters .button').nth(1).click()
  await page.getByRole('button', { name: '09:00' }).click()
  const resumoAntes = await page.getByRole('region', { name: 'Resumo das escolhas' }).innerText()
  await page.getByRole('button', { name: 'Já tenho conta no AgendaJá' }).click()
  await expect(page.getByLabel('Nome completo')).toHaveCount(0)
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
  expect(await page.getByRole('region', { name: 'Resumo das escolhas' }).innerText()).toBe(
    resumoAntes,
  )
  await page.getByRole('button', { name: 'Ainda não tenho conta no AgendaJá' }).click()
  await expect(page.getByLabel('Criar senha')).toBeVisible()
  await page.getByLabel('Nome completo').fill('Joana da Silva')
  await page.getByLabel(/telefone/i).fill('8599999999')
  await page.getByLabel('E-mail').fill('joana@invalido')
  await page.getByRole('button', { name: /revisar/i }).click()
  await expect(page.getByText('Informe um celular válido com DDD.')).toBeVisible()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  await page.getByLabel(/telefone/i).fill('85999999999')
  await expect(page.getByLabel(/telefone/i)).toHaveValue('(85) 9 9999-9999')
  await page.getByLabel('E-mail').fill('joana@exemplo.com')
  await page.getByLabel('Criar senha').fill('curta')
  await page.getByRole('button', { name: /revisar/i }).click()
  await expect(page.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeVisible()
  await page.getByLabel('Criar senha').fill('SenhaTeste123')
  await page.getByRole('button', { name: /revisar/i }).click()
  await expect(page.getByText('Agendamento de demonstração')).toBeVisible()

  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toHaveValue('joana@exemplo.com')
})

test('cliente existente entra com e-mail e senha durante o agendamento', async ({ page }) => {
  await mockAutenticacaoCliente(page)
  await page.goto('/estabelecimento/atelie-aurora')
  await page.getByRole('link', { name: 'Já sou cliente' }).click()
  await page.getByRole('button', { name: /corte feminino/i }).click()
  await page.getByRole('button', { name: /ana martins/i }).click()
  await page.locator('.filters .button').first().click()
  await page.getByRole('button', { name: '09:00' }).click()

  await expect(page.getByLabel('Nome completo')).toHaveCount(0)
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Criar senha')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Ainda não tenho conta no AgendaJá' }),
  ).toBeVisible()
  await page.getByLabel('Telefone / WhatsApp').fill('84994291683')
  await page.getByLabel('E-mail').fill('joana@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('SenhaTeste123')
  await page.getByRole('button', { name: 'Entrar e revisar agendamento' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido preparado!' })).toBeVisible()
})

test('troca o acesso de cliente por cadastro sem perder serviço e horário', async ({ page }) => {
  await mockAutenticacaoCliente(page)
  await page.goto('/estabelecimento/atelie-aurora')
  await page.getByRole('link', { name: 'Já sou cliente' }).click()
  await page.getByRole('button', { name: /corte feminino/i }).click()
  await page.getByRole('button', { name: /ana martins/i }).click()
  await page.locator('.filters .button').first().click()
  await page.getByRole('button', { name: '09:00' }).click()

  const resumoAntes = await page.getByRole('region', { name: 'Resumo das escolhas' }).innerText()
  await page.getByRole('button', { name: 'Ainda não tenho conta no AgendaJá' }).click()
  await expect(page.getByLabel('Nome completo')).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Criar senha')).toBeVisible()
  await expect(page.getByLabel('Senha', { exact: true })).toHaveCount(0)
  expect(await page.getByRole('region', { name: 'Resumo das escolhas' }).innerText()).toBe(
    resumoAntes,
  )

  await page.getByRole('button', { name: 'Ir para Data e horário' }).click()
  await page.getByRole('button', { name: 'Ir para Seus dados' }).click()
  await expect(page.getByLabel('Criar senha')).toBeVisible()
  await page.getByLabel('Nome completo').fill('Paula Reis')
  await page.getByLabel('Telefone / WhatsApp').fill('84994291683')
  await page.getByLabel('E-mail').fill('paula@exemplo.com')
  await page.getByLabel('Criar senha').fill('SenhaTeste123')
  await page.getByRole('button', { name: 'Revisar agendamento' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido preparado!' })).toBeVisible()
  await expect(page.locator('.confirmation .summary')).toContainText('Corte feminino')
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
  await expect(page.getByRole('button', { name: 'Ir para Data e horário' })).toBeDisabled()
  await page.getByRole('button', { name: /Ana Martins/ }).click()
  await page.locator('.filters .button').first().click()
  await page.getByRole('button', { name: '09:00' }).click()
  await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir para Serviço' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar?servico=7`)
  await page.getByRole('button', { name: /Escova.*45 min.*R\$ 60,00/ }).click()
  await expect(page.getByRole('heading', { name: 'Escolha o profissional' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir para Seus dados' }).click()
  await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir para Data e horário' }).click()
  await expect(page.getByRole('button', { name: '09:00' })).toHaveClass(/selected/)
  expect(consultasEstabelecimento).toBe(consultasIniciais.estabelecimento)
  expect(consultasServicos).toBe(consultasIniciais.servicos)
})

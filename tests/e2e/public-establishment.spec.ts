import { expect, test } from '@playwright/test'

const publicId = 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311'
const estabelecimento = {
  id: 4,
  publicId,
  nome: 'Estúdio Brisa',
  categoria: 'Barbearia',
  localizacao: 'Rua das Flores, 120',
  imagemUrl: null,
  horariosFuncionamento: Array.from({ length: 7 }, (_, indice) => ({
    turnos: indice === 0 ? [{ inicio: '09:00', fim: '18:00' }] : [],
  })),
}
const servicos = [
  { id: 12, nome: 'Corte masculino', duracaoMinutos: 40, valor: 55, estabelecimentoId: 4 },
  { id: 13, nome: 'Barba', duracaoMinutos: 30, valor: 35.5, estabelecimentoId: 4 },
]

async function prepararPortal(page: import('@playwright/test').Page) {
  await page.route(`**/api/estabelecimentos/publico/${publicId}`, (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(estabelecimento),
    }),
  )
  await page.route('**/api/estabelecimentos/4/servicos', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(servicos) }),
  )
}

test('mantém a página pública de demonstração no link existente', async ({ page }) => {
  await page.goto('/estabelecimento/atelie-aurora')
  await expect(page.getByRole('heading', { name: 'Ateliê Aurora' })).toBeVisible()
  await expect(page.getByText('Salão de beleza').first()).toBeVisible()
  await expect(page.getByText('Endereço ilustrativo · Centro')).toBeVisible()
  await page.getByRole('link', { name: 'Ver horários e serviços' }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora\/disponibilidade$/)
  await expect(page.getByRole('heading', { name: 'Horários de funcionamento' })).toBeVisible()
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
  await prepararPortal(page)
  await page.route('**/api/auth/me', (rota) => rota.fulfill({ status: 401 }))

  await page.goto(`/estabelecimento/${publicId}`)
  await expect(page.getByRole('heading', { name: 'Estúdio Brisa' })).toBeVisible()
  await expect(page.getByText('Rua das Flores, 120')).toBeVisible()
  await expect(page.getByText('Barbearia').first()).toBeVisible()
  const imagemPlaceholder = page.getByRole('img', { name: 'Foto indisponível' })
  await expect(imagemPlaceholder).toBeVisible()
  await expect
    .poll(() => imagemPlaceholder.evaluate((imagem) => (imagem as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
  await page.getByRole('link', { name: 'Ver avaliações, média 0 de 5 estrelas' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/avaliacoes`)
  await expect(page.getByText('Ainda não há avaliações.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Entre na sua conta' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar para a página do estabelecimento' }).click()
  await page.getByRole('link', { name: '0 avaliações' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/avaliacoes`)
  await page.getByRole('link', { name: 'Voltar para a página do estabelecimento' }).click()
  await expect(page.getByRole('link', { name: 'Ver horários e serviços' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Horários de funcionamento' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Fazer primeiro agendamento' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar`)
  await expect(page.getByRole('heading', { name: 'Escolha o serviço' })).toBeVisible()
})

test('mostra mensagem quando o link não existe', async ({ page }) => {
  await page.route(`**/api/estabelecimentos/publico/${publicId}`, (rota) =>
    rota.fulfill({ status: 404 }),
  )
  await page.goto(`/estabelecimento/${publicId}`)
  await expect(page.getByRole('heading', { name: 'Estabelecimento não encontrado.' })).toBeVisible()
})

test('lista os serviços sem ação de escolha e mantém a seleção no agendamento', async ({
  page,
}) => {
  await prepararPortal(page)
  await page.goto(`/estabelecimento/${publicId}`)
  await page.getByRole('link', { name: 'Ver horários e serviços' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/servicos`)
  await expect(page.getByRole('heading', { name: 'Horários de funcionamento' })).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Horários da semana' }).getByText('09:00 às 18:00'),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Serviços' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Corte masculino' })).toBeVisible()
  await expect(page.getByText('40 min')).toBeVisible()
  await expect(page.getByText('R$ 55,00')).toBeVisible()
  await expect(page.getByText('R$ 35,50')).toBeVisible()
  await expect(page.getByRole('link', { name: /Escolher/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Voltar para a página do estabelecimento' }).click()
  await page.getByRole('link', { name: 'Fazer primeiro agendamento' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar`)
  await expect(page.getByRole('button', { name: 'Ir para Profissional' })).toBeDisabled()
  await page.getByRole('button', { name: /Corte masculino.*40 min.*R\$ 55,00/ }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar?servico=12`)
  await expect(page.getByText('Serviço selecionado:')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ir para Profissional' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar/profissional?servico=12`)
  await page.getByRole('button', { name: 'Ir para Serviço' }).click()
  await expect(page).toHaveURL(`/estabelecimento/${publicId}/agendar?servico=12`)
  await expect(
    page.getByRole('button', { name: /Corte masculino.*40 min.*R\$ 55,00/ }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('mostra estado vazio quando não há serviços ativos', async ({ page }) => {
  await prepararPortal(page)
  await page.route('**/api/estabelecimentos/4/servicos', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await page.goto(`/estabelecimento/${publicId}/servicos`)
  await expect(page.getByText('Nenhum serviço disponível no momento.')).toBeVisible()
})

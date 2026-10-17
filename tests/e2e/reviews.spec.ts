import { expect, test } from '@playwright/test'

const sessao = {
  id: 42,
  nome: 'Ana Gestora',
  email: 'ana@exemplo.com',
  role: 'GESTOR',
  estabelecimentoId: 1,
}

async function autenticar(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/me', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessao),
    }),
  )
}

test('publica, fixa no topo, edita e exclui a própria avaliação', async ({ page }) => {
  test.setTimeout(30000)
  await autenticar(page)
  await page.goto('/estabelecimento/atelie-aurora/avaliacoes')

  const enviar = page.getByRole('button', { name: 'Enviar' })
  const texto = page.getByPlaceholder('Compartilhe sua experiência...')
  const estrelas = page.getByRole('group', { name: 'Nota da avaliação' })
  await expect(estrelas.locator('[data-filled="true"]')).toHaveCount(0)
  await expect(enviar).toBeDisabled()
  await texto.fill('Atendimento muito bom!')
  await expect(enviar).toBeDisabled()
  await estrelas.getByRole('button', { name: '3 estrelas' }).hover()
  await expect(estrelas.locator('[data-filled="true"]')).toHaveCount(3)
  await page.getByRole('heading', { name: 'Comentários de clientes' }).hover()
  await expect(estrelas.locator('[data-filled="true"]')).toHaveCount(0)
  await estrelas.getByRole('button', { name: '3 estrelas' }).click()
  await expect(estrelas.locator('[data-filled="true"]')).toHaveCount(3)
  await estrelas.getByRole('button', { name: '1 estrela' }).click()
  await expect(estrelas.locator('[data-filled="true"]')).toHaveCount(1)
  await expect(enviar).toBeEnabled()
  await enviar.click()

  await expect(page.getByRole('status')).toContainText('Avaliação publicada')
  await expect(texto).toHaveCount(0)
  await expect(enviar).toHaveCount(0)
  await expect(page.locator('.reviews-page-heading')).toContainText('127 avaliações')
  await expect(page.getByLabel('Mostrar')).toHaveCount(0)
  await expect(page.locator('.review')).toHaveCount(10)
  await expect(page.locator('.review').first()).toContainText('Atendimento muito bom!')
  await expect(page.locator('.review').first()).toContainText('Seu comentário')
  await expect(page.locator('.review-manage')).toHaveCount(1)
  await page.getByLabel('Ordenar por').selectOption('menos-estrelas')
  await expect(page.locator('.review').first()).toContainText('Atendimento muito bom!')
  await page.getByRole('button', { name: 'Próxima' }).click()
  await expect(page.locator('.review').first()).toContainText('Atendimento muito bom!')

  await page.getByRole('link', { name: 'Voltar para a página do estabelecimento' }).click()
  await expect(page.getByRole('link', { name: '127 avaliações' })).toBeVisible()
  await page.getByRole('link', { name: 'Ver avaliações, média 4,2 de 5 estrelas' }).click()
  await expect(page.locator('.review').first()).toContainText('Atendimento muito bom!')

  await page.getByRole('button', { name: 'Gerenciar comentário de Ana Gestora' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Editar comentário' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Gerenciar comentário de Ana Gestora' }).click()
  await page.getByRole('button', { name: 'Editar comentário' }).click()
  await expect(page.getByLabel('Editar comentário')).toHaveValue('Atendimento muito bom!')
  await expect(
    page.getByRole('group', { name: 'Editar nota' }).locator('[data-filled="true"]'),
  ).toHaveCount(1)
  await page.getByLabel('Editar comentário').fill('Atendimento excelente!')
  await page
    .getByRole('group', { name: 'Editar nota' })
    .getByRole('button', { name: '5 estrelas' })
    .click()
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.locator('.review').first()).toContainText('Atendimento excelente!')
  await expect(page.locator('.review').first()).toContainText('Editado')
  await expect(page.locator('.reviews-page-heading')).toContainText('127 avaliações')
  await page.getByRole('link', { name: 'Voltar para a página do estabelecimento' }).click()
  await expect(
    page.getByRole('link', { name: 'Ver avaliações, média 4,3 de 5 estrelas' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Ver avaliações, média 4,3 de 5 estrelas' }).click()

  await page.reload()
  await expect(page.locator('.reviews-page-heading')).toContainText('127 avaliações')
  await expect(page.locator('.review').first()).toContainText('Atendimento excelente!')

  await page.getByRole('button', { name: 'Gerenciar comentário de Ana Gestora' }).click()
  await page.getByRole('button', { name: 'Excluir comentário' }).click()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.locator('.review-manage')).toHaveCount(1)
  await page.getByRole('button', { name: 'Gerenciar comentário de Ana Gestora' }).click()
  await page.getByRole('button', { name: 'Excluir comentário' }).click()
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click()
  await expect(page.locator('.reviews-page-heading')).toContainText('126 avaliações')
  await expect(page.locator('.review-manage')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible()
  await expect(page.locator('.review')).toHaveCount(10)
  await page.getByRole('link', { name: 'Voltar para a página do estabelecimento' }).click()
  await expect(
    page.getByRole('link', { name: 'Ver avaliações, média 4,3 de 5 estrelas' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: '126 avaliações' })).toBeVisible()
})

test('não mostra controles dos comentários de outros usuários', async ({ page }) => {
  await autenticar(page)
  await page.goto('/estabelecimento/atelie-aurora/avaliacoes')
  await expect(page.locator('.review-manage')).toHaveCount(0)
  await expect(page.getByLabel('Mostrar')).toHaveCount(0)
  await expect(page.locator('.review')).toHaveCount(10)
})

test('cliente de demonstração cadastra, entra e só gerencia o próprio comentário', async ({
  page,
}) => {
  test.setTimeout(30000)
  await page.route('**/api/auth/me', (rota) => rota.fulfill({ status: 401 }))
  await page.goto('/estabelecimento/atelie-aurora/avaliacoes')
  await expect(page.locator('.review-manage')).toHaveCount(0)
  await page.getByRole('link', { name: 'Entre na sua conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('link', { name: 'Criar conta' }).click()
  await expect(page.getByRole('button', { name: 'Cliente' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByLabel('Nome do negócio')).toHaveCount(0)
  await page.getByLabel('Nome completo').fill('Marina Silva')
  await page.getByLabel('Telefone/WhatsApp').fill('85999990000')
  await page.getByLabel('E-mail').fill('marina@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('senha-teste')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tipo de conta' })).toHaveCount(0)

  await page.getByLabel('E-mail').fill('marina@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos')
  await page.getByLabel('Senha', { exact: true }).fill('senha-teste')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora\/avaliacoes$/)
  await expect(page.locator('.review-manage')).toHaveCount(0)

  await page.getByPlaceholder('Compartilhe sua experiência...').fill('Gostei do atendimento')
  await page
    .getByRole('group', { name: 'Nota da avaliação' })
    .getByRole('button', { name: '5 estrelas' })
    .click()
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.locator('.review-manage')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.review-manage')).toHaveCount(1)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.locator('.review-manage')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Enviar' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Entre na sua conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('E-mail').fill('marina@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('senha-teste')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora\/avaliacoes$/)
  await expect(page.locator('.review-manage')).toHaveCount(1)
  await page.getByRole('button', { name: 'Sair' }).click()

  await page.getByRole('link', { name: 'Entre na sua conta' }).click()
  await page.getByRole('link', { name: 'Criar conta' }).click()
  await expect(page.getByRole('button', { name: 'Cliente' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByLabel('Nome completo').fill('Outro Cliente')
  await page.getByLabel('Telefone/WhatsApp').fill('85988880000')
  await page.getByLabel('E-mail').fill('outro@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('outra-senha')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible()
  await page.getByLabel('E-mail').fill('outro@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('outra-senha')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.locator('.review-manage')).toHaveCount(0)
  await expect(page.getByLabel('Mostrar')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible()
})

test('abre o login e retorna às avaliações após autenticar', async ({ page }) => {
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
  await page.route('**/api/auth/login', (rota) => {
    autenticado = true
    return rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessao),
    })
  })
  await page.goto('/estabelecimento/atelie-aurora/avaliacoes')
  await expect(page.getByRole('button', { name: 'Enviar' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Entre na sua conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('group', { name: 'Tipo de conta' })).toHaveCount(0)
  await page.getByLabel('E-mail').fill(sessao.email)
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/estabelecimento\/atelie-aurora\/avaliacoes$/)
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible()
})

test('mantém o texto quando a gravação local falha', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Falha simulada de armazenamento')
    }
  })
  await autenticar(page)
  await page.goto('/estabelecimento/atelie-aurora/avaliacoes')
  await page
    .getByPlaceholder('Compartilhe sua experiência...')
    .fill('Comentário para tentar salvar')
  await page
    .getByRole('group', { name: 'Nota da avaliação' })
    .getByRole('button', { name: '4 estrelas' })
    .click()
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível publicar')
  await expect(page.getByPlaceholder('Compartilhe sua experiência...')).toHaveValue(
    'Comentário para tentar salvar',
  )
  await expect(page.locator('.reviews-page-heading')).toContainText('126 avaliações')
})

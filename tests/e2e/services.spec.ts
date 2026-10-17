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
  await page.route('**/api/auth/csrf', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'token-teste' }),
    }),
  )
})

test('lista, cadastra, edita e apaga serviços do estabelecimento da sessão', async ({ page }) => {
  const servicos = [{ id: 10, nome: 'Corte', duracaoMinutos: 30, valor: 45, estabelecimentoId: 4 }]
  await page.route(/\/api\/admin\/estabelecimentos\/4\/servicos(?:\/\d+)?$/, async (rota) => {
    const requisicao = rota.request()
    if (requisicao.method() === 'GET') {
      await rota.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(servicos),
      })
      return
    }

    expect(requisicao.headers()['x-csrf-token']).toBe('token-teste')
    if (requisicao.method() === 'DELETE') {
      expect(requisicao.url()).toMatch(/\/servicos\/11$/)
      servicos.splice(1, 1)
      await rota.fulfill({ status: 204 })
      return
    }
    const dados = requisicao.postDataJSON()
    if (requisicao.method() === 'POST') {
      expect(dados).toEqual({ nome: 'Escova', duracaoMinutos: 45, valor: 60.5 })
      const criado = { id: 11, ...dados, estabelecimentoId: 4 }
      servicos.push(criado)
      await rota.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(criado),
      })
      return
    }

    expect(requisicao.method()).toBe('PUT')
    expect(requisicao.url()).toMatch(/\/servicos\/11$/)
    expect(dados).toEqual({ nome: 'Escova modeladora', duracaoMinutos: 50, valor: 75 })
    const atualizado = { id: 11, ...dados, estabelecimentoId: 4 }
    servicos[1] = atualizado
    await rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(atualizado),
    })
  })

  await page.goto('/painel/servicos')
  await expect(page.getByRole('heading', { name: 'Corte' })).toBeVisible()
  await expect(page.getByText('30 min · R$ 45,00')).toBeVisible()

  await page.getByRole('button', { name: 'Novo serviço' }).click()
  await page.getByLabel('Nome do serviço').fill('  Escova  ')
  await page.getByLabel('Duração (minutos)').fill('45')
  await page.getByLabel('Preço (R$)').fill('60.50')
  await page.getByRole('button', { name: 'Cadastrar serviço' }).click()
  await expect(page.getByRole('status')).toHaveText('Serviço cadastrado com sucesso.')
  await expect(page.getByRole('heading', { name: 'Escova' })).toBeVisible()

  await page.getByRole('button', { name: 'Editar Escova' }).click()
  await expect(page.getByLabel('Nome do serviço')).toHaveValue('Escova')
  await page.getByLabel('Nome do serviço').fill('Escova modeladora')
  await page.getByLabel('Duração (minutos)').fill('50')
  await page.getByLabel('Preço (R$)').fill('75')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status')).toHaveText('Serviço atualizado com sucesso.')
  await expect(page.getByRole('heading', { name: 'Escova modeladora' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Escova', exact: true })).toHaveCount(0)

  await expect(page.getByRole('button', { name: /Desativar/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Editar Escova modeladora' }).click()
  await page.getByRole('button', { name: 'Apagar', exact: true }).click()
  const dialogo = page.getByRole('dialog', { name: 'Apagar serviço?' })
  await expect(
    dialogo.getByText(
      'Tem certeza de que deseja apagar “Escova modeladora”? O serviço deixará de aparecer na lista de serviços.',
    ),
  ).toBeVisible()
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialogo).toHaveCount(0)
  await expect(page.getByLabel('Nome do serviço')).toHaveValue('Escova modeladora')

  await page.getByRole('button', { name: 'Apagar', exact: true }).click()
  await dialogo.getByRole('button', { name: 'Apagar serviço' }).click()
  await expect(page.getByRole('status')).toHaveText('Serviço apagado com sucesso.')
  await expect(page.getByRole('heading', { name: 'Escova modeladora' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Corte' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Escova modeladora' })).toHaveCount(0)
})

test('mantém o serviço na edição quando a exclusão falha', async ({ page }) => {
  await page.route('**/api/admin/estabelecimentos/4/servicos', (rota) =>
    rota.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 10, nome: 'Corte', duracaoMinutos: 30, valor: 45, estabelecimentoId: 4 },
      ]),
    }),
  )
  await page.route('**/api/admin/estabelecimentos/4/servicos/10', (rota) => {
    expect(rota.request().method()).toBe('DELETE')
    expect(rota.request().headers()['x-csrf-token']).toBe('token-teste')
    return rota.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ mensagem: 'Serviço não encontrado.' }),
    })
  })

  await page.goto('/painel/servicos')
  await page.getByRole('button', { name: 'Editar Corte' }).click()
  await page.getByRole('button', { name: 'Apagar', exact: true }).click()
  const dialogo = page.getByRole('dialog', { name: 'Apagar serviço?' })
  await dialogo.getByRole('button', { name: 'Apagar serviço' }).click()
  await expect(dialogo.getByRole('alert')).toHaveText('Serviço não encontrado.')
  await expect(dialogo.getByRole('button', { name: 'Apagar serviço' })).toBeEnabled()
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByLabel('Nome do serviço')).toHaveValue('Corte')
})

test('exibe validação da API e permite tentar novamente após falha na listagem', async ({
  page,
}) => {
  let indisponivel = true
  await page.route('**/api/admin/estabelecimentos/4/servicos', async (rota) => {
    if (rota.request().method() === 'GET') {
      await rota.fulfill(
        indisponivel
          ? { status: 500 }
          : { status: 200, contentType: 'application/json', body: '[]' },
      )
      return
    }
    await rota.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        mensagem: 'Dados inválidos.',
        erros: { nome: 'O nome é obrigatório' },
      }),
    })
  })

  await page.goto('/painel/servicos')
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  indisponivel = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByText('Nenhum serviço cadastrado.')).toBeVisible()

  await page.getByRole('button', { name: 'Novo serviço' }).click()
  await page.getByLabel('Nome do serviço').fill('Corte')
  await page.getByLabel('Duração (minutos)').fill('30')
  await page.getByLabel('Preço (R$)').fill('45')
  await page.getByRole('button', { name: 'Cadastrar serviço' }).click()
  await expect(page.getByText('O nome é obrigatório')).toBeVisible()
  await expect(page.getByText('Dados inválidos.')).toBeVisible()
})

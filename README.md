# AgendaJá — base do frontend

Portal público e painel do prestador. Cadastro, autenticação e gestão administrativa de serviços usam o backend Spring Boot; catálogo público, agendamento, agenda e indicadores ainda usam dados de demonstração.

## Requisitos e execução

- Node.js `20.19+` e npm.
- Para cadastro, login e gestão de serviços locais, execute a `main` do backend em `../../backend/agenda-ja-back/` com PostgreSQL. O Vite encaminha `/api` para `http://localhost:8080` por padrão; configure `API_PROXY_TARGET` se a API usar outro endereço.
- Para E2E local: `npx playwright install chromium`.

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run e2e
```

A raiz redireciona para `/login`. O cadastro de estabelecimento e gestor fica em `/cadastro`; após cadastrar, o usuário entra com as credenciais criadas. `/painel` e suas páginas exigem sessão de gestor. O portal público demonstrativo do Ateliê Aurora fica em `/estabelecimento/atelie-aurora`, com agendamento em `/estabelecimento/atelie-aurora/agendar`. Os testes geram `reports/unit/junit.xml`, `reports/e2e/junit.xml`, `coverage/cobertura-coverage.xml`, `coverage/index.html` e `playwright-report/index.html`.

## Arquitetura

`domain` contém tipos e disponibilidade; `data/api.ts` centraliza requisições, erros e CSRF; `data/auth.ts` implementa cadastro e sessão; `data/services.ts` integra a gestão de serviços; `data/repository.ts` define o contrato de agenda ainda implementado por `data/mockRepository.ts`; `features` reúne portal e painel; `design-system` centraliza tokens e componentes.

## Sessão e implantação

As chamadas de escrita obtêm um token em `GET /api/auth/csrf` e enviam `X-CSRF-TOKEN` com o cookie de sessão. O login usa `POST /api/auth/login`, a restauração usa `GET /api/auth/me` e o botão Sair usa `POST /api/auth/logout`. Erros de credenciais, validação e e-mail duplicado são exibidos no formulário.

Em `/painel/servicos`, o gestor lista, cadastra, edita e desativa serviços em `/api/admin/estabelecimentos/{estabelecimentoId}/servicos`. O ID vem da sessão; nome, duração em minutos e preço são validados no formulário e no backend. A desativação exige confirmação, usa `DELETE /{servicoId}` e retira o serviço da lista após a resposta 204; o backend preserva o registro como inativo. Erros da API são exibidos nos campos ou junto à ação correspondente.

Em produção, o Nginx encaminha `/api` ao contêiner `agenda-ja-back:8080` na rede Docker `agendaja-net`. O pipeline Jenkins conecta o contêiner frontend a essa rede. O backend precisa estar implantado com esse nome na mesma rede.

## Jenkins

O `Jenkinsfile` constrói a imagem Docker, que executa `npm ci`, lint, tipos, testes unitários com cobertura e build; depois publica o frontend. Os testes E2E rodam separadamente com `npm run e2e` e exigem os navegadores do Playwright. Configure um job **Pipeline** ou **Multibranch Pipeline** apontando ao GitHub e ao `Jenkinsfile`; webhook e credenciais ficam fora deste repositório.

O pipeline publica JUnit, artefatos de build, cobertura Cobertura e relatório HTML. Os passos `recordCoverage` e `publishHTML` exigem os plugins **Coverage** e **HTML Publisher** no Jenkins.

## Limites e próxima integração

O cadastro do gestor e o hash de sua senha são persistidos pelo backend, e o acesso ao painel usa sessão real. Nenhum horário é reservado e nenhuma notificação é enviada. A gestão administrativa de serviços usa a `main` do backend; o catálogo público e a tela de profissionais continuam demonstrativos. Ainda não há relatórios operacionais, autenticação de clientes, sincronização, cancelamento ou reagendamento. O fluxo público de agendamento confirma explicitamente uma demonstração.

Para a próxima integração, alinhar endpoints públicos de estabelecimento e serviço, além de profissional e agenda, fuso horário e serialização de datas, prevenção transacional de reservas simultâneas, regras de cancelamento, ciclo de estados do agendamento e contratos de notificação. Estes ainda não são contratos de API definitivos.

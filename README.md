# AgendaJá — base do frontend

Primeira base funcional do portal público e painel do prestador. A aplicação usa dados brasileiros de demonstração, calculados com datas futuras, e não possui backend nesta etapa.

## Requisitos e execução

- Node.js `20.19+` e npm.
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

O portal fica em `/`, o login demonstrativo em `/login`, o cadastro preparado em `/cadastro`, o dashboard em `/painel` e a agenda em `/painel/agenda`. Os testes geram `reports/unit/junit.xml`, `reports/e2e/junit.xml`, `coverage/cobertura-coverage.xml`, `coverage/index.html` e `playwright-report/index.html`.

## Arquitetura

`domain` contém tipos e disponibilidade; `data` define o contrato `AgendaRepository` e sua implementação mock; `features` reúne portal e painel; `design-system` centraliza tokens e componentes. Uma implementação HTTP poderá substituir o repositório mock sem levar arrays aos componentes.

## Jenkins

O `Jenkinsfile` executa checkout/ambiente, `npm ci`, lint, tipos, cobertura, build e E2E. Configure um job **Pipeline** ou **Multibranch Pipeline** apontando ao GitHub e ao `Jenkinsfile`; webhook e credenciais ficam fora deste repositório. O agente precisa de Node 20.19+, navegador Chromium do Playwright e as dependências de sistema correspondentes (em Linux, prepare com `npx playwright install --with-deps chromium`).

JUnit e artefatos são publicados sem plugins extras. Para gráficos, instale **Coverage** e **HTML Publisher** e habilite `PUBLISH_OPTIONAL_REPORTS=true` no job; então a cobertura Cobertura e as páginas HTML aparecerão no Jenkins. Sem esses plugins a opção fica desativada e o pipeline continua usando apenas recursos padrão.

## Limites e próxima integração

Nenhum horário é reservado, conta criada, senha persistida ou notificação enviada. Também não há CRUD, relatórios operacionais, autenticação real, sincronização, cancelamento ou reagendamento. O fluxo confirma explicitamente uma demonstração.

Com o backend Spring Boot, alinhar antes do código: endpoints e versões dos recursos de estabelecimento/serviço/profissional/agenda, autenticação e papéis, fuso horário e serialização de datas, prevenção transacional de reservas simultâneas, regras de cancelamento, ciclo de estados do agendamento e contratos de notificação. Estes não são contratos de API definitivos.

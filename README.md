# AgendaJá — base do frontend

Portal público e painel do prestador. Cadastro, autenticação, gestão administrativa de serviços e profissionais, apresentação pública e catálogo público de serviços usam o backend Spring Boot; o agendamento após a escolha do serviço, a agenda e os indicadores ainda usam dados de demonstração.

## Requisitos e execução

- Node.js `20.19+` e npm.
- Para cadastro, login e gestão de serviços e profissionais locais, execute a `main` do backend em `../../backend/agenda-ja-back/` com PostgreSQL. O Vite encaminha `/api` para `http://localhost:8080` por padrão; configure `API_PROXY_TARGET` se a API usar outro endereço.
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

A raiz redireciona para `/login`. O cadastro de estabelecimento e gestor fica em `/cadastro`; após cadastrar, o usuário entra com as credenciais criadas. `/painel` e suas páginas exigem sessão de gestor. O botão de copiar no início do painel obtém o `publicId` do negócio e gera `/estabelecimento/{publicId}`. O portal público demonstrativo do Ateliê Aurora continua em `/estabelecimento/atelie-aurora`, com agendamento em `/estabelecimento/atelie-aurora/agendar`. Os testes geram `reports/unit/junit.xml`, `reports/e2e/junit.xml`, `coverage/cobertura-coverage.xml`, `coverage/index.html` e `playwright-report/index.html`.

## Execução local com Docker

Na pasta raiz `AgendaJa/`, com Docker ativo, inicie o PostgreSQL e conecte-o à rede usada pelo frontend e backend:

```bash
cd backend/agenda-ja-back
docker compose up -d postgres
docker network create agendaja-net 2>/dev/null || true
docker network connect agendaja-net agendaja-postgres 2>/dev/null || true
docker build -t agendaja-back:local .
docker run -d --name agenda-ja-back --network agendaja-net \
  -e DB_URL=jdbc:postgresql://agendaja-postgres:5432/agendaja \
  -e DB_USERNAME=agendaja -e DB_PASSWORD=agendaja \
  agendaja-back:local
```

Depois, na pasta do frontend:

```bash
cd ../../frontend/codigo_front
docker build -t agendaja-front:local .
docker run -d --name agenda-ja-front --network agendaja-net \
  -p 127.0.0.1:8092:80 agendaja-front:local
```

Acesse `http://localhost:8092/login` e, após entrar, `http://localhost:8092/painel/servicos`. Se os contêineres `agenda-ja-front` ou `agenda-ja-back` já existirem, remova-os antes de repetir `docker run`.

## Arquitetura

`domain` contém tipos e disponibilidade; `data/api.ts` centraliza requisições, erros e CSRF; `data/auth.ts` implementa cadastro e sessão; `data/services.ts` e `data/professionals.ts` integram a gestão de serviços e profissionais; `data/repository.ts` define o contrato de agenda ainda implementado por `data/mockRepository.ts`; `features` reúne portal e painel; `design-system` centraliza tokens e componentes.

## Sessão e implantação

As chamadas de escrita obtêm um token em `GET /api/auth/csrf` e enviam `X-CSRF-TOKEN` com o cookie de sessão. O login usa `POST /api/auth/login`, a restauração usa `GET /api/auth/me` e o botão Sair usa `POST /api/auth/logout`. Erros de credenciais, validação e e-mail duplicado são exibidos no formulário.

Os campos de senha permitem mostrar ou ocultar o texto. Os formulários verificam o formato do e-mail antes do envio; cadastro de cliente e agendamento de demonstração também aplicam a máscara `(84) 9 9429-1683` e exigem um celular com DDD. O backend valida e-mail no login e no cadastro de gestor; ainda não recebe telefone nesses contratos.

A engrenagem no início do painel abre `/painel/configuracoes`, onde o gestor edita a foto de capa, os dados do negócio (nome, categoria e localização) e os turnos de funcionamento, separados das jornadas dos profissionais. Os dados do negócio são carregados de `GET /api/admin/estabelecimentos/{id}`; como ainda não há endpoint de atualização, as edições são salvas no navegador e aparecem na apresentação pública de demonstração local. É possível cadastrar vários turnos por dia, remover todos para marcar o dia como fechado e corrigir conflitos de horário antes de salvar. A página pública de demonstração mostra a mesma foto e os mesmos horários; os horários salvos no formato anterior são preservados. Foto e horários também usam `localStorage` e só sincronizam abas do mesmo navegador; o backend ainda precisa oferecer leitura pública e gravação desses dados do estabelecimento para que outros visitantes vejam as alterações. A saída da conta pede confirmação antes de encerrar a sessão.

Em `/painel/servicos`, o gestor lista, cadastra, edita e apaga serviços em `/api/admin/estabelecimentos/{estabelecimentoId}/servicos`. O ID vem da sessão; nome, duração em minutos e preço são validados no formulário e no backend. A ação Apagar fica na edição, exige confirmação em um popup e usa `DELETE /{servicoId}`. Após a resposta 204, o serviço sai da lista; o backend preserva o registro como inativo. Erros da API são exibidos nos campos ou no popup correspondente.

Em `/painel/profissionais`, o gestor consulta, cadastra e edita profissionais em `/api/admin/estabelecimentos/{estabelecimentoId}/profissionais`, informando nome, serviços e turnos de atendimento por dia da semana. Salvar envia duas requisições: primeiro o profissional (com os dias derivados dos turnos), depois `PUT .../profissionais/{id}/disponibilidade` com os horários exatos. Como esse endpoint substitui turnos e folgas juntos, o formulário reenvia as folgas carregadas sem alterá-las. Turnos sobrepostos ou invertidos são bloqueados antes do envio. As folgas ficam no botão "Folgas" de cada profissional na lista: um popup lista, adiciona e remove folgas, salvando cada alteração na hora com os turnos atuais reenviados sem mudança. Se só a segunda requisição falhar, o formulário continua aberto em modo de edição, para que tentar de novo não duplique o cadastro. As especialidades enviadas ao backend são os nomes dos serviços selecionados. A interface usa a numeração de `Date.getDay()` (domingo = 0) e `data/professionals.ts` converte domingo para 7, como exige o backend.

Em produção, o Nginx encaminha `/api` ao contêiner `agenda-ja-back:8080` na rede Docker `agendaja-net`. O pipeline Jenkins conecta o contêiner frontend a essa rede. O backend precisa estar implantado com esse nome na mesma rede.

## Jenkins

O `Jenkinsfile` constrói a imagem Docker, que executa `npm ci`, lint, tipos, testes unitários com cobertura e build; depois publica o frontend. Os testes E2E rodam separadamente com `npm run e2e` e exigem os navegadores do Playwright. Configure um job **Pipeline** ou **Multibranch Pipeline** apontando ao GitHub e ao `Jenkinsfile`; webhook e credenciais ficam fora deste repositório.

O pipeline publica JUnit, artefatos de build, cobertura Cobertura e relatório HTML. Os passos `recordCoverage` e `publishHTML` exigem os plugins **Coverage** e **HTML Publisher** no Jenkins.

## Portal público e limites

O painel consulta `GET /api/admin/estabelecimentos/{id}` para obter o `publicId` do negócio. O link gerado abre `GET /api/estabelecimentos/publico/{publicId}` sem autenticação, que retorna `id`, `publicId`, nome, categoria, localização e imagem. A lista em `/estabelecimento/{publicId}/servicos` e o primeiro passo de `/estabelecimento/{publicId}/agendar` usam `GET /api/estabelecimentos/{id}/servicos`, que retorna somente serviços ativos com nome, duração e preço. A escolha fica identificada por `?servico={id}` na URL. O fluxo de agendamento real após a escolha do serviço depende das histórias seguintes.

### Avaliações de demonstração

O cadastro apresenta as opções **Gestor** e **Cliente**; o login reconhece o tipo de conta
pelo e-mail informado. Gestor continua usando o backend; Cliente é uma conta de demonstração
salva no `localStorage`, com nome completo,
telefone/WhatsApp, e-mail e senha. Use somente uma senha de teste: a conta local não oferece
segurança de produção e não é compartilhada entre navegadores.

Em `/estabelecimento/atelie-aurora/avaliacoes`, usuários com sessão ativa podem publicar,
editar e excluir sua própria avaliação. Cada ID pode ter uma avaliação; o comentário do
usuário conectado fica no topo em todas as páginas, e o campo de publicação desaparece
enquanto ele já tiver uma avaliação. A identificação usa o ID da sessão.
As alterações desta página são salvas apenas no `localStorage` do navegador e a interface
as identifica como prévia local. Total e média são calculados a partir da lista completa.
O backend atual não possui
autenticação de clientes nem endpoints de avaliações; autorização no servidor e sincronização
entre usuários dependem dessa integração.

O cadastro do gestor e o hash de sua senha são persistidos pelo backend, e o acesso ao painel usa sessão real. Nenhum horário é reservado e nenhuma notificação é enviada. A gestão administrativa de serviços e profissionais e o catálogo público real usam a `main` do backend. Ainda não há relatórios operacionais, autenticação de clientes, sincronização, cancelamento ou reagendamento. O fluxo demonstrativo do Ateliê Aurora confirma explicitamente que não cria reservas.

Para a próxima integração, alinhar o uso dos endpoints públicos de profissional e disponibilidade, além de agenda, fuso horário e serialização de datas, prevenção transacional de reservas simultâneas, regras de cancelamento, ciclo de estados do agendamento e contratos de notificação.

## Convenção de commits

Para funcionalidades de uma história de usuário, use
`feat(HU<número>): <descrição em português>`. A mensagem depois dos dois-pontos
deve estar em português, por exemplo:
`feat(HU07): adiciona acesso às avaliações pela nota média`.

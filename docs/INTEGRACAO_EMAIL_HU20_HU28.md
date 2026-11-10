# HU20 e HU28 — contrato de e-mail e integração com o front-end

Este documento descreve a integração que o back-end deve implementar para as histórias:

- **HU20 — confirmação automática de reserva:** após gravar uma reserva, o cliente recebe um e-mail com os dados do agendamento.
- **HU28 — recuperação de senha:** o usuário solicita um link temporário para definir uma nova senha.

O front-end **não envia e-mails diretamente** e nunca recebe chave de API, senha SMTP ou token secreto. Essas credenciais ficam somente no ambiente do back-end.

## Escolha do provedor

### Opção recomendada para apresentação acadêmica: Gmail SMTP

É a alternativa mais simples para e-mails reais sem comprar domínio. Crie uma conta exclusiva, por exemplo `agendaja.projeto@gmail.com`, ative a verificação em duas etapas e gere uma **senha de app**. Não usar a senha normal da conta.

Variáveis de ambiente do back-end:

```bash
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=agendaja.projeto@gmail.com
MAIL_PASSWORD=senha_de_app_gerada_pelo_google
MAIL_FROM='AgendaJá <agendaja.projeto@gmail.com>'
FRONTEND_RESET_PASSWORD_URL=http://localhost:5173/redefinir-senha
```

Configuração Spring Boot (`application.properties`):

```properties
spring.mail.host=${MAIL_HOST}
spring.mail.port=${MAIL_PORT:587}
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
app.frontend.password-reset-url=${FRONTEND_RESET_PASSWORD_URL:http://localhost:5173/redefinir-senha}
```

Adicionar ao `pom.xml`:

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

### Opção para produção: Resend

Resend exige um domínio verificado para enviar a qualquer destinatário. Depois de verificar o domínio no painel do Resend, configurar:

```bash
RESEND_API_KEY=re_...
RESEND_FROM='AgendaJá <noreply@seu-dominio.dev>'
FRONTEND_RESET_PASSWORD_URL=https://app.seu-dominio.dev/redefinir-senha
```

O back-end deve chamar `POST https://api.resend.com/emails`, usando o header `Authorization: Bearer <RESEND_API_KEY>` e o corpo:

```json
{
  "from": "AgendaJá <noreply@seu-dominio.dev>",
  "to": ["cliente@exemplo.com"],
  "subject": "Confirmação da sua reserva",
  "html": "<h1>Reserva confirmada</h1>"
}
```

Nunca versionar esses valores em `application.properties`, `.env` ou no front-end. Criar uma chave de API com permissão apenas de envio e revogá-la caso seja exposta.

## Proposta de implementação no back-end

Criar uma interface, por exemplo `EmailService`, para que a regra de negócio não dependa do provedor:

```java
public interface EmailService {
    void enviarConfirmacaoReserva(Agendamento agendamento);
    void enviarLinkRedefinicaoSenha(Usuario usuario, String link);
}
```

Implementar a interface com `JavaMailSender` (SMTP) ou um cliente HTTP para o Resend. As duas implementações devem produzir os mesmos e-mails.

### HU20: confirmação após reserva

O fluxo atual já publica `AgendamentoCriadoEvent` após persistir a reserva. O listener deve executar o envio apenas após a transação ser confirmada:

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onAgendamentoCriado(AgendamentoCriadoEvent event) {
    try {
        emailService.enviarConfirmacaoReserva(event.agendamento());
    } catch (Exception exception) {
        log.error("Falha ao enviar e-mail do agendamento {}", event.agendamento().getId(), exception);
    }
}
```

O e-mail deve incluir estabelecimento, serviço, profissional, data/hora e observações quando houver. A falha de entrega **não pode** desfazer nem retornar erro para uma reserva já salva.

### HU28: tokens de recuperação

Criar uma migration para a tabela `tokens_redefinicao_senha`:

```sql
CREATE TABLE tokens_redefinicao_senha (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
  usado_em TIMESTAMP WITH TIME ZONE
);
```

Regras obrigatórias:

1. Gerar um token aleatório criptograficamente seguro com pelo menos 32 bytes.
2. Gravar somente SHA-256 do token; enviar o valor original apenas no link do e-mail.
3. Expirar em 30 minutos e permitir uso único.
4. Ao pedir novo link, invalidar tokens anteriores do mesmo usuário.
5. Salvar a nova senha usando o `PasswordEncoder` BCrypt já existente.
6. A solicitação deve sempre responder sucesso, mesmo que o e-mail não exista, evitando enumeração de contas.

Link sugerido no e-mail:

```text
{FRONTEND_RESET_PASSWORD_URL}?token={token-url-encoded}
```

## Contrato HTTP a ser consumido pelo front-end

Os dois endpoints são públicos, mas continuam protegidos por CSRF como os demais `POST` da aplicação. O front deve chamar primeiro `GET /api/auth/csrf`, manter o cookie da sessão e enviar o header `X-CSRF-TOKEN`.

### `POST /api/auth/senha/solicitar-recuperacao`

Solicita o e-mail de recuperação. Não exige usuário autenticado.

Requisição:

```json
{
  "email": "cliente@exemplo.com"
}
```

Resposta de sucesso: `200 OK`, tanto para e-mail existente quanto inexistente.

```json
{
  "mensagem": "Se houver uma conta ativa com esse e-mail, você receberá instruções de recuperação."
}
```

Erros de validação: `400 Bad Request`.

```json
{
  "mensagem": "Dados inválidos.",
  "erros": {
    "email": "Formato de e-mail inválido"
  }
}
```

### `POST /api/auth/senha/redefinir`

Consome o token e troca a senha. Não exige usuário autenticado.

Requisição:

```json
{
  "token": "token-recebido-no-link",
  "novaSenha": "NovaSenhaSegura123"
}
```

Resposta de sucesso: `204 No Content`.

Erros:

- `400 Bad Request`: token inválido, expirado, já utilizado ou senha inválida.
- `403 Forbidden`: CSRF ausente ou inválido.

Corpo sugerido para token inválido/expirado:

```json
{
  "mensagem": "Link inválido ou expirado."
}
```

## Mudanças futuras no front-end

Quando os endpoints estiverem disponíveis, adicionar:

1. Link **“Esqueci minha senha”** na tela de login para a rota `/esqueci-senha`.
2. Formulário de e-mail que chama `POST /api/auth/senha/solicitar-recuperacao` e exibe a mensagem retornada pelo back-end.
3. Rota `/redefinir-senha?token=...` com nova senha e confirmação, mínimo de 8 caracteres.
4. Após `204` em `POST /api/auth/senha/redefinir`, redirecionamento ao login com a mensagem “Senha redefinida. Entre com sua nova senha.”

O módulo `src/data/auth.ts` deve centralizar essas requisições e reutilizar a função atual que busca e envia o token CSRF.

## Critérios de aceite e testes

- Criar uma reserva e confirmar que ela continua criada mesmo se o provedor de e-mail falhar.
- Conferir no e-mail os dados corretos da reserva.
- Pedir recuperação para conta existente e inexistente: ambas devem retornar `200` e a mesma mensagem genérica.
- Trocar a senha com token válido e autenticar com a nova senha.
- Confirmar que token expirado, já usado e token anterior invalidado são recusados.
- Mockar `EmailService` nos testes de controller/service: os testes não devem chamar Gmail nem Resend.

# Avisos de prazo — preparação de 29/10/2026

Ainda não publicado nem agendado. A fila existente deadline_notifications será reutilizada, sem novas tabelas do aplicativo. A entrega oficial usa a conta Resend já verificada, por chamada do servidor à API do provedor. Não depende de outro serviço de webhook nem modifica o SMTP do login.

## Avanço após autorização

Responsável autorizou publicação/agendamento a cada dez minutos durante todo o dia e o teste temporário de 15 dias na 1505 A, enviando ao Gmail controlado e removendo o prazo depois. Função publicada e verificação antiga do gateway desativada; o token exclusivo continua obrigatório no handler. Chamadas reais sem autenticação e com token errado retornaram 401, sem acessar a fila ou enviar mensagens.

Responsável salvou os quatro segredos nas Edge Functions. Conferida somente a presença/digest, sem ler os valores. Formulário Vault preparado para citypark_deadline_reminder_token; aguardando o responsável salvar exatamente o mesmo token. Extensões pg_cron 1.6.4 e pg_net 0.20.4 instaladas no projeto, sem agendamento criado ainda. Nenhum prazo de cliente foi alterado nesta etapa. Evidência: outputs/qa/deadline-reminders-published-20261029.png. Suíte completa: 40 testes passaram.

## Regras

Atualização da conferência: Vault salvo pelo responsável. Comparação por digest confirmou igualdade com a função, mas o token tinha menos de 32 caracteres. Nenhum prazo foi alterado e nenhum aviso foi enviado. Handler reforçado para recusar tokens curtos, publicado após testes (dez testes do worker passaram). Um token aleatório de 64 caracteres foi preparado em supabase/.env.reminder-token.official.local, ignorado pelo Git e sem impressão do valor. Responsável pediu orientação para atualizar ambos os locais; formulário Edge Secrets preparado com nome DEADLINE_REMINDER_TOKEN e valor vazio. Próximo passo humano: colar só o valor do arquivo e salvar; depois atualizar o segredo existente do Vault, sem criar duplicata. Publicação/agendamento e teste real seguem autorizados; não pedir novamente.

- Avisos aos 15, 10, 5 e 1 dias, calculados pela data de São Paulo; texto inclui horário e data nesse fuso.
- Aviso geral identifica a unidade; aviso de módulo identifica também seu nome.
- Sem prazo, unidade inativa/concluída ou sem proprietário vinculado: nenhum novo aviso elegível.
- Prazos removidos/alterados não têm seus avisos antigos reclamados para envio.
- Identificação única por unidade/cliente/escopo/data/marco no banco e Idempotency-Key no Resend. Tentativas no mesmo dia mantêm a mesma mensagem e chave; Resend conserva as chaves por 24 horas.
- Falhas não são marcadas como enviadas. Até cinco tentativas diárias, intervalo mínimo de dez minutos e reserva para evitar execução concorrente.
- Sent significa aceito pelo provedor, não confirmação de leitura ou entrega final. Entrega pode ser consultada no Resend.
- Cada execução processa até dez avisos, com limite de tempo de oito segundos por chamada e espaçamento entre pedidos.

## Configuração privada necessária nas Edge Functions

- DEADLINE_EMAIL_PROVIDER: resend
- RESEND_API_KEY: chave de envio da conta oficial, limitada ao subdomínio acesso.cityparkmcz.com.br; pode ser a mesma usada no SMTP, se guardada pela equipe.
- DEADLINE_EMAIL_FROM: City Park Exclusive <nao-responda@acesso.cityparkmcz.com.br>
- DEADLINE_REMINDER_TOKEN: segredo aleatório de pelo menos 32 caracteres, criado pela equipe e exclusivo desse agendamento.

A equipe insere e salva as credenciais diretamente no painel; nunca na conversa, no frontend ou no Git. O mesmo DEADLINE_REMINDER_TOKEN deve ser armazenado no Vault com nome citypark_deadline_reminder_token. Nenhuma chave administrativa do Supabase precisa ser copiada: a função usa a credencial interna do próprio ambiente de servidor.

## Implantação proposta para autorização

1. Publicar deadline-reminders e manter verify_jwt=false: a função exige o segredo exclusivo do agendador antes de acessar a fila. Não aceitar a chave pública do site como autenticação.
2. Configurar os quatro valores acima e o segredo do Vault. Não abrir nem imprimir segredos já existentes.
3. Testar rejeição de chamada sem autenticação e executar com fila vazia.
4. Somente mediante autorização, colocar um prazo de teste na unidade 1505 A para daqui a 15 dias e disparar um único aviso para o Gmail controlado. Confirmar entrega e deduplicação; remover o prazo do teste e preservar o registro do envio. Não cadastrar datas fictícias em outras unidades.
5. Ativar scripts/enable-official-deadline-schedule.sql após aprovação. Verifica a fila a cada dez minutos, ao longo do dia inteiro; cada marco é enviado uma vez. O script recusa agendamento duplicado e token ausente/curto. Não executa automaticamente em migrations nem na instalação inicial.
6. Conferir cron.job, execução e resposta HTTP do pg_net; cron executado não prova sozinho que a função enviou as mensagens. Desativar reversivelmente com cron.alter_job(job_id,active:=false), após identificar o único job pelo nome.

## Validações

Nove testes isolados do worker passaram: autenticação obrigatória, configuração ausente, URL insegura, Resend/identificação e fuso, quatro marcos e módulo, falhas HTTP/rede/recibo, falha no registro com repetição idêntica, fila vazia e transporte local legado. São testes sem rede ou destinatários reais.

As regras da fila já possuem testes SQL locais; validação adicional do banco e teste oficial de entrega ficam registrados conforme forem realizados. Nenhuma mensagem real de prazo foi enviada nesta preparação.

Referências: https://resend.com/docs/dashboard/emails/idempotency-keys e https://supabase.com/docs/guides/functions/schedule-functions.

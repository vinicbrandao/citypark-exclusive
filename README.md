# City Park Exclusive

## Comece por aqui

Plano vigente: [Roteiro para Vinícius e Allef](docs/inicio-vinicius.md). Instalação, login, cadastros, calendários preliminares e homologação. Substitui a ordem de prioridades da passagem inicial.

## Login e progresso por unidade

- Cada apartamento mantém suas próprias escolhas de planta e materiais.
- Trocar de unidade ou voltar ao início preserva as escolhas em memória enquanto a página estiver aberta.
- “Salvar progresso” grava somente a unidade aberta no Supabase. Alterações não salvas são perdidas ao atualizar ou fechar a página.
- Ao reabrir, selecione a unidade ou use o botão para continuar o último apartamento salvo.
- Login por e-mail e senha. Em “Primeiro acesso / Esqueci minha senha”, um código confirma o e-mail e abre a definição de senha. Cadastro público desabilitado.
- O banco restringe leitura por vínculo cliente–usuário–unidade. O cliente não pode alterar vínculos ou cadastrar unidades.
- O salvamento exige uma revisão atual para impedir que duas sessões sobrescrevam silenciosamente as escolhas.
- Os dados antigos do protótipo permanecem no navegador, mas não são importados para contas autenticadas: não existe vínculo verificado entre aqueles dados e um comprador.

O backend roda localmente durante o desenvolvimento. A confirmação contratual, os prazos e o cálculo oficial ainda não foram implementados; preços e quantitativos continuam fictícios.

## Executar localmente

Requisitos: Node.js 22.12+ e Docker Desktop com contêineres Linux em execução.

```powershell
npm ci
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 citypark-exclusive-local
npm run db:start
node scripts/seed-local.mjs
node scripts/seed-staff-local.mjs
npm run dev
```

Crie a rede apenas uma vez. O vínculo com 127.0.0.1 mantém os serviços locais fora da rede externa.

- Aplicação: http://127.0.0.1:5173/exclusive/
- Caixa de e-mails de teste: http://127.0.0.1:54324
- Supabase Studio: http://127.0.0.1:54323
- Contas fictícias: `cliente.a@example.test` (1209A) e `cliente.b@example.test` (1210A).

O script de carga aceita apenas o Supabase local, cria as contas sem senha e grava somente URL e chave pública em `.env.local`. Os códigos ficam na caixa local; não são enviados a pessoas reais. Não executar o ambiente da CLI como servidor público de produção.

As tabelas são criadas pelas migrations em `supabase/migrations`. O seed SQL automático é vazio; os dados fictícios entram somente pelo script explícito.

## Trabalho em equipe

Cada pessoa mantém seu próprio Docker e banco local com dados fictícios. Compartilhamos código e migrations pelo Git; bancos e senhas não são sincronizados. Após receber novas migrations, execute `npx supabase migration up --local`.

- Guia de passagem e plano de cinco dias: [docs/passagem-equipe-2026-09-18.md](docs/passagem-equipe-2026-09-18.md).
- Laboratório genérico: `/exclusive/laboratorio-imagens.html`; projetos são compartilhados por exportação e importação JSON.
- Contas de equipe fictícias: `admin.1@example.test` a `admin.3@example.test`, `architect.1@example.test` e `architect.2@example.test`.
- As arquitetas fictícias ativas ainda acessam todas as unidades. A autorização por unidade permanece pendente; a prioridade atual é login, cadastros e calendários; não ativar esse perfil para atendimento real antes dessa restrição.
- Não incluir no Git `.env.local`, credenciais, compradores, backups ou arquivos brutos de Revit/renders. Os arquivos em `assets/` são os recursos necessários para executar o protótipo.
- Usar branches por tarefa e revisão antes de integrar alterações na `main`. Não alterar migrations já compartilhadas.

## Futuro ambiente de produção

Aplicar as migrations em um projeto dedicado do Exclusive. Configurar o domínio `/exclusive/`, o modelo de e-mail com código, o SMTP e desabilitar cadastro público também no ambiente remoto. Configurações locais não se transferem automaticamente para um projeto na nuvem.

Provisionamento inicial pela equipe: criar o usuário pelo serviço administrativo de Auth; cadastrar cliente e unidade; relacioná-los em `customer_users` e `customer_units`. Nunca colocar chave administrativa no frontend. A interface administrativa de cadastro será uma próxima entrega.

O build (`npm run build`) gera `dist/`, incluindo imagens, para publicação em `/exclusive/`. A hospedagem deve encaminhar as rotas dessa aplicação ao seu `index.html`.

### Verificação

Execute `npm test` e `npm run build`. Os testes cobrem isolamento entre unidades, recuperação, limpeza ao sair, dados inválidos, falhas e respostas atrasadas de salvamento.

Com o Supabase local iniciado e as contas fictícias criadas, `npm run test:access-local` verifica o login por código e as permissões pela API real, incluindo tentativa de ler/salvar outra unidade, alteração de vínculos, conflito de revisão e bloqueio do cadastro público. Esse teste salva um rascunho na unidade fictícia 1209A.

## Principal mudança desta versão

A precificação de **Bancadas** deixou de usar valores fixos independentes e passou a usar:

- quantidade de bancada em **m²**;
- comprimento do rodamão em **m**;
- altura do rodamão em **m**;
- quantidade da bancada de serviço em **m²**;
- preço unitário do granito em **R$/m²**.

Os quantitativos desta versão são **fictícios**, apenas para validar a lógica. Devem ser substituídos pelos quantitativos do Revit.

### Fórmula usada

```text
Área de bancada = área bancada principal + área bancada de serviço
Área de rodamão = (comprimento principal + comprimento de serviço) × altura escolhida
Área total de granito = área de bancada + área de rodamão

Custo da configuração escolhida = área total de granito × preço/m² do granito escolhido
Custo padrão = área padrão × preço/m² do São Marco

Valor adicional bancadas = custo escolhido - custo padrão
```

Assim, aumentar a bancada ou o rodamão aumenta automaticamente a quantidade de granito. Ao trocar São Marco por Bellagio, o preço unitário escolhido passa a valer sobre toda a área resultante.

## Dados fictícios atuais

- São Marco: R$ 900/m²
- Bellagio: R$ 1.450/m²
- bancada padrão: 1,20 m²; comprimento de rodamão 2,40 m
- bancada estendida: 1,90 m²; comprimento de rodamão 3,80 m
- rodamão padrão: 10 cm
- rodamão ampliado: 60 cm
- bancada adicional de serviço: 0,55 m²; comprimento de rodamão 1,10 m

## Novo asset

Foi incluída a imagem:

`assets/cozinha/bancada-padrao-sao-marco-rodamao-60.png`

para representar corretamente a combinação bancada padrão + São Marco + rodamão de 60 cm.

## Observação visual

A prévia passou a usar `object-fit: contain` para privilegiar a visualização completa do ambiente, inclusive piso e forro.


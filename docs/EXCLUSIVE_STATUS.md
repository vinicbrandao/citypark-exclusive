# CityPark Exclusive — Checkpoint Técnico

> **Arquivo de continuidade do projeto**
>
> Este documento deve ser utilizado como fonte de contexto ao iniciar um novo Chat, Work, Codex ou outra sessão de IA relacionada ao **CityPark Exclusive**.
>
> **Regra principal para qualquer IA que leia este arquivo:** não assumir que algo foi implementado apenas porque está descrito como arquitetura, proposta ou próximo passo. Sempre distinguir entre:
>
> - **IMPLEMENTADO / TESTADO**
> - **DECIDIDO / DEFINIDO**
> - **PLANEJADO / PENDENTE**

---

## 1. Identificação do checkpoint

- **Projeto:** CityPark Exclusive
- **Checkpoint criado em:** 05/10/2026
- **Último ciclo de desenvolvimento registrado:** 05/10/2026
- **Responsável técnico principal:** Vini
- **Supervisor:** Allef

Este arquivo deve ser atualizado ao final de blocos relevantes de desenvolvimento, principalmente após:
- criação ou alteração de migrations;
- mudanças de modelo de dados;
- novas políticas RLS;
- novas RPCs;
- mudanças importantes no frontend;
- testes de autenticação;
- testes de integração;
- importações;
- definição de novas regras de negócio;
- correção de bugs relevantes.

---

# 2. Objetivo do CityPark Exclusive

O **CityPark Exclusive** é uma plataforma destinada aos proprietários de unidades do empreendimento CityPark.

O objetivo é permitir que cada proprietário acesse uma área restrita e personalize sua unidade a partir de opções disponibilizadas pela construtora.

A plataforma deverá evoluir para permitir, entre outras funcionalidades:

- autenticação do proprietário;
- vínculo entre cliente e unidade adquirida;
- suporte a proprietário e coproprietário;
- visualização das unidades vinculadas ao usuário;
- visualização da planta correspondente à unidade;
- catálogo de personalizações;
- seleção de opções;
- regras de compatibilidade entre escolhas;
- salvamento das escolhas;
- histórico das alterações;
- resumo/carrinho de personalizações;
- envio da configuração para aprovação;
- controle de estado da configuração da unidade;
- operação administrativa e/ou técnica por usuários autorizados.

---

# 3. Separação entre o CityPark atual e o Exclusive

## DECIDIDO

O **CityPark Exclusive não utilizará o Firebase como backend principal**.

O site CityPark atual continua utilizando Firebase para as funcionalidades existentes, enquanto o Exclusive utiliza um projeto separado baseado em Supabase.

A separação conceitual é:

```text
CITYPARK ATUAL
├── Firebase Auth
├── Firestore
└── Fluxos atuais de unidades, propostas, corretores e administração

CITYPARK EXCLUSIVE
├── Supabase Auth
├── PostgreSQL
├── Row Level Security (RLS)
├── Migrations
├── Funções / RPCs quando necessário
└── Fluxos próprios de proprietários, unidades e customizações
```

Qualquer integração entre os dois ambientes deve ocorrer de forma **controlada**, por importação, sincronização ou processo explicitamente definido.

Não criar acoplamento direto com as coleções Firebase do sistema atual sem uma decisão arquitetural específica.

---

# 4. Arquitetura e stack

## DECIDIDO

### Frontend

- Vite
- JavaScript
- HTML
- CSS

O frontend do Exclusive está sendo desenvolvido separadamente e é destinado a ser disponibilizado dentro do site CityPark, no caminho:

```text
/exclusive/
```

O site principal do CityPark é hospedado via GitHub Pages.

### Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security
- Migrations SQL
- RPCs / funções PostgreSQL quando necessárias

### Desenvolvimento local

O ambiente local utiliza:

- Supabase CLI
- Docker
- serviços locais do Supabase
- Mailpit nos testes de e-mail/autenticação

---

# 5. Responsabilidades

## Vini

Responsável principalmente por:

- arquitetura técnica;
- implementação do frontend;
- Supabase;
- modelagem relacional;
- migrations;
- políticas RLS;
- funções e RPCs;
- integração frontend ↔ banco;
- autenticação;
- validações;
- testes;
- scripts auxiliares;
- importação/sincronização de dados;
- validação do banco;
- segurança de acesso;
- integração final do Exclusive ao site CityPark.

## Allef

Responsável principalmente por:

- definição/modelagem das opções de personalização;
- Revit;
- renders;
- quantitativos;
- combinações possíveis;
- regras técnicas das customizações;
- conteúdo técnico das opções oferecidas ao proprietário.

---

# 6. Estado do ambiente local

## IMPLEMENTADO / TESTADO

O Supabase local foi iniciado e utilizado com sucesso através do Docker.

Últimas versões registradas durante o desenvolvimento:

```text
Supabase CLI:          2.118.0
PostgreSQL:            17.6.1.171
PostgREST:             v16.3
GoTrue/Auth:           v2.197
Realtime:              v2.135.3
Storage API:           v1.77
Supabase Studio:       2026.09.14
```

Essas versões representam o último ambiente registrado e não devem ser tratadas como requisito permanente do projeto.

---

# 7. Correção do ambiente Supabase / PostgREST

## IMPLEMENTADO / TESTADO

Durante os testes locais ocorreu um problema relacionado ao token JWT, apresentando comportamento compatível com:

```text
JWT issued at future
```

Foi realizada atualização/correção do ambiente local, incluindo o PostgREST para:

```text
v16.3
```

Após a alteração:

- o login voltou a funcionar;
- o erro não voltou a aparecer no teste realizado;
- a unidade de teste `1209A` foi carregada corretamente.

---

# 8. Autenticação

## IMPLEMENTADO / TESTADO

O projeto já possui fluxo de autenticação utilizando Supabase Auth.

Foram trabalhados/testados fluxos de:

- login com e-mail e senha;
- primeiro acesso;
- redefinição/recuperação de senha;
- troca de senha;
- logout;
- acesso ao ambiente após autenticação.

### Teste de troca de senha

Foi validado manualmente que:

1. a senha incorreta é rejeitada;
2. a senha antiga deixa de funcionar após a alteração;
3. a nova senha é aceita;
4. o usuário consegue realizar novo login utilizando a senha atualizada.

Esse fluxo foi considerado aprovado no último teste manual registrado.

---

# 9. Tela “Defina sua senha”

## IMPLEMENTADO / CORRIGIDO

Foi identificado um problema de experiência de uso:

> Ao digitar uma senha na tela **“Defina sua senha”** e trocar temporariamente de aba do navegador, os campos eram apagados quando o usuário retornava.

Esse comportamento foi corrigido.

Após a alteração, os dados digitados nos campos da etapa de definição de senha passaram a permanecer durante a troca de aba, dentro do comportamento esperado para o fluxo atual.

Esta correção deve ser preservada em futuras refatorações da autenticação.

---

# 10. Base já existente antes da fase atual

## IMPLEMENTADO / TESTADO

O projeto já possuía uma base funcional contendo:

- aplicação Vite/JavaScript;
- Supabase local;
- migrations;
- autenticação;
- vínculos entre cliente e unidade;
- estrutura de rascunhos;
- histórico/revisão de salvamentos;
- políticas de acesso;
- seeds fictícios;
- scripts de validação;
- testes automatizados.

Em uma revisão anterior foram registrados:

```text
13 testes automatizados aprovados
build aprovado
```

Também existem scripts locais utilizados durante validações, incluindo:

```bash
npm run db:start
node scripts/seed-local.mjs
node scripts/seed-staff-local.mjs
npm test
npm run build
node scripts/test-access-local.mjs
node scripts/test-staff-local.mjs
```

Os nomes acima representam scripts existentes no estado anteriormente revisado do projeto. Antes de usá-los em uma sessão futura, confirmar que continuam presentes no repositório atual.

---

# 11. Isolamento entre clientes

## IMPLEMENTADO / TESTADO

Foram utilizados usuários/clientes fictícios para verificar isolamento de acesso.

Referências principais do ambiente de teste:

```text
Cliente A → unidade 1209A
Cliente B → unidade 1210A
```

O objetivo desses testes é garantir que um cliente não tenha acesso às unidades pertencentes a outro cliente.

Os testes locais já abordaram aspectos de:

- isolamento entre clientes;
- perfis;
- auditoria;
- revogação de acesso.

A política final de autorização deve continuar sendo protegida pelo banco através de RLS, e não apenas pelo frontend.

---

# 12. Importação fictícia e cadastros

## IMPLEMENTADO / TESTADO NO AMBIENTE DE DESENVOLVIMENTO

Foi executado um fluxo de importação fictícia para validar o processo de entrada de clientes, unidades e vínculos.

Lote de teste registrado:

```text
4bd2c7dc-a993-4b9a-87c6-a95f397cf2b9
```

No preview do lote foram registrados:

```text
6 linhas recebidas
5 linhas aceitas
1 linha repetida
0 linhas pendentes
```

Após aplicação:

```text
5 clientes
4 unidades
5 vínculos cliente ↔ unidade
```

O cenário incluiu:

- uso de `external_ref`;
- unidade compartilhada;
- relacionamento com proprietário e coproprietário;
- múltiplos vínculos;
- validação de reaplicação do mesmo lote.

A segunda aplicação do lote retornou comportamento idempotente, com registro equivalente a:

```text
already_applied: true
```

Portanto, o processo testado não deveria duplicar os dados quando o mesmo lote fosse reaplicado.

### Atenção

Esses dados são **fictícios e de desenvolvimento**.

Não confundir esse teste com a importação dos compradores reais do CityPark.

---

# 13. Proprietário e coproprietário

## IMPLEMENTADO EM PARTE / REGRA FINAL PENDENTE

customer_units aceita owner e co_owner. Ambos podem salvar a configuração da unidade e conceder/revogar autorização à arquiteta pelos RPCs atuais. A revisão otimista impede sobrescrita silenciosa.

Em 06/10/2026, Vini decidiu que owner e co_owner poderão enviar e editar a mesma proposta da unidade. O envio e o versionamento já existem no banco local; faltam a interface e a regra de confirmação/aprovação final após o parecer técnico.

---

# 14. Relação entre personalização e unidade

## DECIDIDO

As personalizações não devem existir isoladamente apenas no cliente.

Elas devem estar relacionadas ao vínculo/registro da unidade do cliente, conceitualmente associado a:

```text
customer_units
```

Isso é importante porque:

- um cliente pode possuir mais de uma unidade;
- uma unidade pode possuir mais de um proprietário;
- cada unidade possui sua própria configuração;
- histórico e estado da personalização pertencem à unidade;
- diferentes unidades podem utilizar a mesma planta.

---

# 15. Modelo de plantas

## PROTÓTIPO IMPLEMENTADO / MODELO DEFINITIVO DECIDIDO EM PARTE

No protótipo, plans contém combinações de escolhas social e suíte; unit_plans oferece várias combinações por unidade e plan_features guarda as duas partes da escolha. **DECIDIDO por Vini:** essas combinações são opções sobre uma planta base reutilizável. No modelo definitivo, a equipe CityPark atribuirá explicitamente uma planta base a cada unidade e social/suíte serão escolhas da configuração, não linhas distintas de plantas. A planta pode variar conforme a terminação.

As migrations correspondentes foram restauradas nesta pasta a partir do histórico do banco local. Consultar docs/catalogo-personalizacao-modelo.md.

---

# 16. Catálogo de personalização

## PROTÓTIPO NO BANCO LOCAL / MODELO DEFINITIVO PENDENTE

Allef modificou esta pasta antes da entrada de Vini e usou o Supabase local para explorar o Exclusive. As tabelas e dados de outubro são referências de teste para Vini modelar o banco definitivo. O Supabase local já possui customization_groups, customization_options e option_compatibilities. Também possui unit_configuration_state, customer_customizations, customization_history e customization_windows. O banco local contém 12 combinações de escolhas social/suíte tratadas como plantas no protótipo e 8 opções de materiais da interface atual, além de 2 plantas e 2 opções de teste. Não foi encontrado seed do catálogo nesta pasta; esses registros são dados de teste, não um catálogo aprovado.

Os RPCs novos validam disponibilidade da planta, opções ativas, uma escolha por grupo, janela de personalização e revisão. option_compatibilities é uma lista de opções permitidas por planta; não representa dependências ou exclusões entre pares de opções.

Área social e Suíte Master pertencem ao módulo Planta. Esse módulo terá um prazo próprio por unidade; vencido o prazo, o cliente poderá consultar as escolhas, mas não alterá-las. O prazo de Planta não bloqueia outros módulos. No protótipo, customization_windows vale para a unidade inteira, então o modelo e os RPCs precisarão ser ajustados.

A interface ainda usa unit_drafts e save_unit_draft. Não tratar o schema de teste como modelo definitivo nem o catálogo como integrado ao frontend.

---

# 17. Estrutura funcional planejada para o proprietário

## IMPLEMENTADO NO BANCO LOCAL / INTERFACE PENDENTE

A experiência do proprietário deverá evoluir para algo equivalente a:

```text
Login
  ↓
Meus apartamentos
  ↓
Selecionar unidade
  ↓
Detalhes da unidade
  ↓
Planta
  ↓
Grupos de personalização
  ↓
Escolhas
  ↓
Resumo / carrinho
  ↓
Revisão
  ↓
Envio para aprovação
```

Também deverá existir histórico das alterações.

---

# 18. “Meus apartamentos”

## PLANEJADO

O proprietário deverá conseguir visualizar todas as unidades às quais possui acesso.

Isso precisa suportar:

- um usuário com uma unidade;
- um usuário com várias unidades;
- uma unidade com proprietário e coproprietário.

O acesso deve ser garantido pelo banco através de RLS.

---

# 19. Detalhes da unidade

## PLANEJADO

A tela de detalhes deverá reunir progressivamente informações como:

- identificação da unidade;
- planta;
- proprietário(s);
- estado da personalização;
- progresso das escolhas;
- grupos disponíveis;
- opções selecionadas;
- histórico;
- prazos quando aplicáveis.

---

# 20. Histórico de customizações

## IMPLEMENTADO NO BANCO / INTERFACE PENDENTE

customization_history armazena um instantâneo por revisão da configuração nova, tanto para rascunhos parciais quanto para escolhas normalizadas. O histórico legado draft_history continua existindo para unit_drafts. A interface atual ainda usa o fluxo legado.

---

# 21. Carrinho / resumo

## PLANEJADO

Antes do envio final, o proprietário deverá visualizar um resumo das escolhas feitas.

Esse resumo deverá funcionar como uma etapa de conferência da configuração da unidade.

O termo “carrinho” é conceitual; a implementação final pode utilizar outro nome na interface.

---

# 22. Envio para aprovação

## PLANEJADO

Owner ou co_owner podem enviar pelo RPC `submit_unit_proposal` depois de concluir as escolhas. Alterações posteriores permanecem na mesma proposta; a arquiteta consulta a revisão mais recente, com histórico preservado. O banco local implementa essa regra; botão, mensagem de confirmação e fila da equipe ainda não estão na interface.

O sistema precisará controlar estados da configuração, por exemplo:

```text
rascunho
em preenchimento
enviado
em análise
aprovado
requer alteração
```

Os nomes e estados definitivos ainda precisam ser formalizados.

Não criar enum ou regra final baseada apenas nessa lista sem revisar as regras de negócio.

---

# 23. Usuários administrativos / técnicos

## IMPLEMENTADO EM PARTE

staff_users distingue admin e architect. staff_unit_assignments limita o escopo da arquiteta por unidade. O acesso efetivo da arquiteta também exige autorização vigente de proprietário ativo, registrada em architect_authorizations e seu histórico de eventos. Admin acessa unidades ativas.

Há RPC para a equipe salvar configuração e RPC para a arquiteta registrar revisão técnica por revisão salva. A revisão técnica não equivale à aprovação final nem altera o status da configuração.

---

# 24. Segurança

## REGRA ARQUITETURAL

A segurança do Exclusive deve ser garantida principalmente no banco.

Princípios:

- nunca confiar apenas em bloqueios do frontend;
- proteger dados através de RLS;
- validar usuário autenticado;
- restringir acesso às unidades vinculadas ao usuário;
- restringir operações administrativas;
- validar alterações sensíveis no servidor/banco;
- manter histórico quando necessário;
- evitar operações de atualização genéricas sem validação;
- usar migrations para alterações estruturais.

---

# 25. Dados reais

## NÃO IMPLEMENTADO

Até o checkpoint atual:

- os compradores reais não devem ser considerados oficialmente importados;
- os dados utilizados nos testes são fictícios;
- o catálogo definitivo de customizações ainda depende das definições de Allef;
- imagens/renders finais ainda não devem ser assumidos como disponíveis;
- preços e dados comerciais definitivos não devem ser inventados.

Toda IA que continuar o projeto deve respeitar isso.

---

# 26. Supabase online / homologação

## PENDENTE

O desenvolvimento e os testes principais registrados ocorreram utilizando o ambiente local.

A configuração definitiva de um ambiente online de homologação/produção deve ser tratada separadamente.

Antes de publicação:

- revisar migrations;
- revisar variáveis de ambiente;
- revisar Auth;
- revisar URLs de redirect;
- revisar RLS;
- revisar e-mail/SMTP;
- revisar dados de seed;
- garantir que dados fictícios não sejam enviados para produção;
- executar testes de acesso.

---

# 27. E-mail

## DESENVOLVIMENTO LOCAL

Durante o desenvolvimento local, o fluxo de e-mail pode utilizar Mailpit.

Referências anteriores do ambiente local:

```text
Supabase Studio → porta 54323
Mailpit         → porta 54324
```

SMTP e envio real deverão ser tratados na etapa de homologação/produção.

---

# 28. Pontos que NÃO devem ser assumidos

Uma IA retomando este projeto **não deve assumir** que:

- toda modelagem proposta já virou migration;
- todas as tabelas conceituais já existem;
- o catálogo de customização está pronto;
- compradores reais foram importados;
- SMTP real está configurado;
- o sistema já está publicado para clientes;
- owner/co_owner já possuem regras finais de edição;
- todas as regras administrativas estão finalizadas;
- imagens/renders definitivos estão disponíveis;
- os nomes conceituais das futuras tabelas são definitivos.

Sempre verificar o repositório antes de alterar o banco.

---

# 29. Próximo passo recomendado

## PONTO DE RETOMADA

Plano detalhado para o fluxo solicitado em 06/10/2026: `docs/plano-fluxo-propostas.md`. Ele ordena catálogo/prazos, salvamento por módulo, fechamento dos caminhos legados, pedido de ajuda, envio versionado, edição após envio, revisão/avisos e testes.

1. Receber da equipe CityPark a lista das plantas base reais, a atribuição por unidade e os prazos do módulo Planta. As tabelas estruturais já existem no banco local, mas permanecem sem esses dados.
2. Validar com Allef os grupos Área social/Suíte Master, opções reais, disponibilidade por planta, renders, quantitativos e eventuais regras de compatibilidade. Os registros atuais do protótipo não são catálogo oficial.
3. Integrar `save_unit_module_choices` à interface após obter planta, opções e prazos reais. Migrar a configuração corrente somente com mapeamento confiável; preservar o histórico legado e revogar/substituir os RPCs antigos que contornam a regra de prazo.
4. Ampliar os testes pela API real, inclusive mudanças concorrentes. Integrar à interface o pedido de ajuda, o envio da proposta, a visualização da versão mais recente e a revisão da arquiteta. Definir confirmação final, avisos externos e preços oficiais em etapas próprias.

---

# 30. Último ponto de parada

### Concluído em 06/10/2026

- migration 20261005000100_unit_base_plans_and_modules.sql aplicada ao Supabase local;
- agora as 13 versões locais e aplicadas coincidem;
- as nove unidades fictícias receberam tower_code e termination_code coerentes com o código e andar já cadastrados;
- criadas base_plans, unit_base_plan_assignments, customization_modules e unit_module_windows, com RLS. Planta é o único módulo cadastrado; ainda não há plantas base, atribuições ou prazos reais;
- teste RLS em transação revertida: proprietário da unidade viu planta atribuída, prazo e módulo; usuário de outra unidade não viu nenhum desses registros. Nenhum dado de teste permaneceu;
- authenticated não possui INSERT nas novas tabelas. Nenhuma RPC ou tela foi alterada neste dia.

### Estado atual

O schema estrutural para planta base e prazo por módulo está ativo apenas no Supabase local. O bloqueio de edição de Planta ainda não está funcional: os RPCs e a interface continuam no fluxo legado, e as plantas e datas reais não foram cadastradas.

Atualização posterior em 06/10/2026: o novo RPC `save_unit_module_choices` já valida prazo e revisão no banco local, mas a interface ainda chama `save_unit_draft`; portanto o bloqueio de Planta ainda não é efetivo na jornada do cliente. Detalhes e testes na seção 37.

Outra continuação no mesmo dia criou pedidos de ajuda à arquiteta no banco local, com estados e histórico; a interface ainda não usa esse fluxo. Detalhes na seção 38.

A continuação seguinte criou a proposta única por unidade, versões após edições e parecer técnico da arquiteta no banco local. A interface ainda não usa esse fluxo. Detalhes na seção 39.

Em 06/10/2026, o fluxo de proposta foi comparado com o código e registrado em `docs/plano-fluxo-propostas.md`. Login e unidades estão operacionais no ambiente de desenvolvimento; pedido de ajuda na interface, envio formal, mensagem de recebimento, edição versionada após envio e bloqueio por módulo seguem pendentes. A existência do valor `submitted` em um check de tabela não representa um fluxo de envio implementado.

Decisão de Vini no mesmo dia: owner e co_owner podem enviar e editar; alterações depois do envio atualizam a mesma proposta, e a arquiteta consulta a revisão mais recente. Preservar revisões anteriores no histórico e impedir parecer técnico sobre revisão ultrapassada. Esta é uma regra decidida, ainda não implementada.

---

# 31. Procedimento para retomar o projeto em uma nova conversa

Ao iniciar um novo Chat, Work ou Codex, utilizar uma instrução semelhante a:

```text
Leia primeiro o arquivo EXCLUSIVE_STATUS.md.

Ele é o checkpoint técnico do CityPark Exclusive e deve ser utilizado como
fonte de contexto do desenvolvimento.

Antes de alterar qualquer código ou banco:
1. identifique o que está marcado como IMPLEMENTADO/TESTADO;
2. identifique o que está apenas DECIDIDO;
3. identifique o que ainda está PLANEJADO/PENDENTE;
4. analise o estado atual do repositório;
5. compare o repositório com o checkpoint;
6. informe qualquer divergência encontrada;
7. continue a partir da seção "Último ponto de parada".

Não trate propostas de modelagem como estruturas já implementadas.
```

---

# 32. Procedimento de atualização deste checkpoint

Ao terminar uma sessão relevante de desenvolvimento, atualizar:

```text
Data do checkpoint
Concluído
Alterações realizadas
Migrations adicionadas
Tabelas alteradas
RPCs adicionadas/alteradas
RLS alteradas
Arquivos principais alterados
Testes executados
Bugs corrigidos
Decisões tomadas
Pendências
Próximo passo
Último ponto de parada
```

Quando possível, incluir também:

```text
commit
branch
migration
resultado dos testes
```

Isso permite que Chat, Work e Codex retomem o projeto com o mínimo de perda de contexto.

---

# 33. Regra de fonte da verdade

A ordem de confiança deve ser:

```text
1. Estado atual do repositório / banco
2. EXCLUSIVE_STATUS.md atualizado
3. Documentação técnica versionada
4. Conversas anteriores do Project
5. Memória da IA
```

Se existir divergência entre este documento e o código atual, o repositório e o banco devem ser inspecionados antes de qualquer decisão.

Depois da inspeção, este checkpoint deve ser atualizado.

---

# 34. Resumo executivo para IA

```text
Projeto:
CityPark Exclusive.

Objetivo:
Área restrita para proprietários personalizarem unidades compradas no CityPark.

Frontend:
Vite + JavaScript, destinado a /exclusive/ no site CityPark.

Backend:
Supabase separado do Firebase atual.

Banco:
PostgreSQL + RLS + migrations + RPCs quando necessário.

Responsáveis:
Vini = modelagem do banco, implementação, arquitetura técnica, Supabase, integrações e testes.
Allef = modelagem técnica das customizações, Revit, renders e regras.

Estado:
Ambiente local funcionando.
Autenticação validada.
Troca de senha validada.
Problema dos campos de senha ao alternar abas corrigido.
Dezesseis migrations aplicadas localmente; a estrutura de plantas base, prazos, escolhas por módulo, pedidos de ajuda e proposta versionada já está no banco.
Isolamento de clientes trabalhado.
Importação fictícia e idempotência testadas.
Owner/co_owner fazem parte do modelo.
Planta base será atribuída pela equipe a cada unidade; Área social e Suíte Master são escolhas do módulo Planta, com prazo próprio. Catálogo e RPCs de teste existem no banco local.
Configuração pertence à unidade e registra o vínculo customer_units de cada edição.

Ainda não assumir:
que o protótipo de Allef seja o catálogo ou schema definitivo, nem que os
preços, quantitativos ou dados locais sejam oficiais.

Próximo passo:
Obter plantas base, atribuições e prazos da equipe; validar opções com Allef;
depois cadastrar o catálogo aprovado, integrar a interface ao novo salvamento e retirar os caminhos legados de gravação.
```

---

# 35. Registro do dia — 05/10/2026

## Concluído

- Revisado o schema do repositório e do Supabase local. O banco tinha seis migrations de outubro aplicadas cujos arquivos não estavam nesta pasta; os seis SQL foram restaurados a partir do histórico do próprio banco. Antes da nova migration, as 12 versões locais e aplicadas coincidiam.
- Confirmado que o catálogo local veio de testes anteriores de Allef. As 12 combinações de Área social × Suíte Master e as opções de materiais são referência para modelagem, não dados oficiais.
- Documentados o [estado do protótipo](catalogo-personalizacao-modelo.md) e o [modelo alvo do banco](modelo-alvo-banco.md).
- Preparada a migration 20261005000100_unit_base_plans_and_modules.sql. Ela adiciona campos separados para torre/terminação, plantas base e sua atribuição por unidade, o módulo Planta e janelas por unidade/módulo. Mantém as estruturas antigas para a transição.

## Decisões de modelagem

- 1208A significa andar 12, terminação 08, torre A. O protótipo ainda guarda valores como termination = 09A e tower = Torre Liberty; não associar esse rótulo de teste à torre A automaticamente.
- Cada unidade receberá uma planta base pré-selecionada pela equipe CityPark. A mesma planta pode atender várias unidades; a terminação pode influenciar a escolha, mas o banco não deve atribuir a planta sozinho pelo código.
- Área social e Suíte Master são grupos de opções do módulo Planta, não novas plantas. As escolhas alteram estrutura e/ou mobiliário.
- O módulo Planta terá prazo próprio por unidade. Após o vencimento, as escolhas ficam visíveis para o cliente, porém sem edição. Outros módulos permanecem independentes.
- A configuração é compartilhada por owner e co_owner; o histórico registra o autor de cada revisão. Regras de envio final ainda não foram definidas.

## Estado técnico e validação

- **Migration nova:** arquivo preparado, não aplicado. A tentativa de aplicação no Supabase local foi rejeitada pela revisão automática por alterar o banco de forma persistente e instalar políticas de leitura consideradas amplas. A política de leitura dos módulos foi então restringida no arquivo; não houve nova tentativa de aplicação.
- **Tabelas e RLS novos:** existem somente no SQL pendente; não estão ativos no banco. Nenhuma RPC foi criada ou alterada hoje.
- **Testes:** os 13 testes existentes passaram e o build foi concluído antes da preparação dessa migration. O novo SQL ainda não foi executado nem validado no banco.
- **Git:** branch main; nenhum commit criado nesta sessão. Há alterações locais anteriores e os arquivos deste checkpoint ainda não foram commitados.

## Pendências e próximo passo

1. Revisar a migration preparada e obter autorização explícita para aplicá-la ao Supabase local; depois validar schema, RLS e preenchimento dos campos de unidade.
2. Receber da equipe CityPark as plantas base reais, a atribuição por unidade e os prazos do módulo Planta. Não preencher esses dados por inferência do código.
3. Validar com Allef opções, disponibilidade por planta, renders, quantitativos e regras de compatibilidade.
4. Criar migrations e RPCs para escolhas por módulo, bloqueio de Planta no servidor, configuração compartilhada e histórico. Revogar ou substituir caminhos antigos de gravação que possam contornar o prazo.
5. Definir fluxo de envio/aprovação, permissões finais de owner/co_owner e preços oficiais em etapas próprias.

---

# 36. Registro do dia — 06/10/2026

## Concluído

- Lido o checkpoint e revisada a migration estrutural preparada no dia anterior.
- Supabase local iniciado e migration 20261005000100_unit_base_plans_and_modules.sql aplicada. Nenhuma migration anterior foi modificada.
- Conferidas as 13 versões de migration: arquivos locais e banco local coincidem.
- Conferido o preenchimento de torre e terminação nas nove unidades fictícias; nenhuma planta base nem prazo real foi atribuído por inferência.
- RLS validada com registros temporários em transação revertida: proprietário com acesso à unidade viu os novos registros; outro cliente não viu. Não restaram registros do teste, e authenticated não tem permissão de INSERT nessas tabelas.

## Arquivos, banco e testes

- Tabelas adicionadas no banco local: base_plans, unit_base_plan_assignments, customization_modules e unit_module_windows; customization_groups recebeu module_code; units recebeu tower_code e termination_code.
- Políticas RLS das quatro novas tabelas estão ativas. A leitura depende do acesso à unidade; o módulo só aparece quando há janela de uma unidade acessível.
- Nenhuma RPC, frontend ou dado oficial de catálogo foi alterado. Os testes de interface/build de 05/10 não foram repetidos, pois este trabalho foi exclusivamente de banco; a validação desta migration foi feita no Supabase local.
- Branch main, sem commit criado nesta sessão. As alterações locais anteriores permanecem.

## Pendente

- A equipe CityPark ainda preparará plantas base reais, associação unidade → planta e prazo do módulo Planta.
- Allef ainda validará opções e regras técnicas. Falta implementar escolhas e salvamento por módulo, bloquear Planta após o prazo no servidor e encerrar caminhos legados de escrita.
- Permanecem abertas a aprovação final, o limite da edição após envio e os preços oficiais; owner e co_owner já foram definidos como aptos a enviar e editar a mesma proposta.

## Continuação do planejamento em 06/10/2026

- Criado `docs/plano-fluxo-propostas.md`, com ordem das mudanças de banco, interface e testes para pedido de ajuda, envio, revisão e edição posterior.
- Vini decidiu que owner e co_owner enviam/editam a mesma proposta; a arquiteta vê a revisão mais recente. Esta decisão ainda não foi implementada no banco nem na interface.
- Permanecem pendentes a regra de aprovação final, o ponto em que a proposta deixa de ser editável e o canal de aviso à equipe. Nenhuma migration adicional foi aplicada nesta continuação.

---

---

# 37. Continuação técnica — 06/10/2026

## Concluído

- Aplicada ao Supabase local a migration `20261006000100_module_choices.sql`; as 14 versões locais e aplicadas coincidem.
- Criadas disponibilidade de opções por planta base, exclusões entre pares de opções, estado/revisão por unidade e módulo, escolhas correntes e histórico por módulo.
- Criado `save_unit_module_choices`: valida vínculo owner/co_owner ou acesso da equipe, planta atribuída, módulo/grupo/opção ativos, disponibilidade e incompatibilidades, revisão esperada e janela do módulo pelo horário do servidor. Altera somente o módulo solicitado. Escrita direta das tabelas novas não foi concedida a `authenticated`.
- Teste transacional em `scripts/test-module-choices-local.sql`: owner, co_owner, arquiteta autorizada e revogada, usuário de outra unidade, revisão desatualizada, incompatibilidade entre módulos, prazo de Planta vencido e edição de outro módulo ainda aberta. Todas as fixtures foram revertidas; nenhuma planta, opção ou prazo oficial foi cadastrado.

## Limite atual e próximo passo

- O frontend ainda usa `save_unit_draft`. Os RPCs antigos continuam disponíveis, então o prazo de Planta **ainda pode ser contornado no fluxo atual**. Não apresentar esse bloqueio como pronto para clientes.
- Validar catálogo, atribuições e prazos reais; mapear as escolhas correntes; integrar a interface ao novo RPC e retirar os caminhos antigos de escrita na mesma entrega. Testar a API real e depois implementar ajuda e proposta enviada com revisão mais recente.
- Nenhuma regra de envio, comunicação ou aprovação final foi implementada nesta migration. Branch `main`, sem commit criado.

---

# 38. Pedidos de ajuda à arquiteta — 06/10/2026

## Concluído no banco local

- Confirmadas nove unidades fictícias em `units`: 1209A, 1210A, 1301A, 1302A, 1401A, 1501A, 1502A, 1503A e 1505A. Nenhuma planta base oficial está cadastrada.
- Aplicada `20261006000200_architect_assistance_requests.sql`; as 15 migrations locais e aplicadas coincidem.
- Criadas `architect_assistance_requests` e `architect_assistance_events`, com RLS, um pedido aberto por unidade e histórico de abertura, aceite, cancelamento e conclusão.
- RPCs: `request_architect_assistance`, `accept_architect_assistance`, `cancel_architect_assistance` e `resolve_architect_assistance`. O pedido exige vínculo owner/co_owner, arquiteta designada e autorização vigente. Aceite e conclusão ficam com a arquiteta escolhida; owner/co_owner podem cancelar.
- Teste transacional `scripts/test-architect-assistance-local.sql` passou para pedido repetido, RLS de outra unidade, aceite, cancelamento pelo coproprietário, revogação de autorização e conclusão com eventos. O teste terminou com ROLLBACK; pedidos/eventos de teste = 0, plantas base = 0 e unidades = 9.

## Limite e próximo passo

- O cliente ainda não possui botão para solicitar ajuda; a equipe ainda não possui fila/tela de atendimento. O pedido no banco não envia mensagem externa. A autorização à arquiteta continua sendo uma ação separada e explícita; cancelar um pedido não revoga automaticamente essa autorização.
- Prosseguir com o fluxo de proposta enviada e suas revisões, depois integrar a interface. Dados oficiais serão cadastrados posteriormente, sem inferir planta ou opção pelo código da unidade.
- Branch `main`; nenhuma alteração desta sessão foi commitada.

---

# 39. Proposta enviada e versões — 06/10/2026

## Concluído no banco local

- Aplicada `20261006000300_unit_proposals.sql`; as 16 migrations locais e aplicadas coincidem.
- Criadas `unit_proposals` (uma por unidade), `unit_proposal_versions` (instantâneos imutáveis das escolhas e revisões por módulo) e `unit_proposal_reviews` (parecer técnico para uma versão específica), com RLS e leitura restrita à unidade acessível.
- `submit_unit_proposal` exige owner/co_owner, planta base ativa, ao menos uma escolha, grupos obrigatórios preenchidos, opções disponíveis/compatíveis e revisões por módulo iguais às vistas pelo cliente. O envio repetido da mesma configuração devolve a mesma proposta.
- Cada salvamento por módulo após o envio acrescenta uma versão à mesma proposta. `review_unit_proposal` exige arquiteta com acesso vigente e rejeita parecer sobre versão anterior. Trocar/remover a planta base de uma unidade com proposta enviada foi bloqueado até existir um fluxo administrativo explícito para isso.
- `scripts/test-unit-proposals-local.sql` passou: envio, grupo obrigatório, revisão desatualizada, proposta única, edição por co_owner após envio, parecer sobre versão corrente, rejeição de parecer antigo ou de arquiteta revogada, RLS e proteção da planta base. O teste anterior de módulos também passou novamente. As fixtures foram revertidas; propostas/revisões/plantas de teste = 0.
- Para repetir os três testes SQL locais com um comando, usar `npm run test:db-local` na raiz do projeto, com Docker Desktop e Supabase local iniciados. O comando foi executado e mostrou OK para escolhas por módulo, pedido de ajuda e proposta/revisões; ele não testa a interface.

## Limite e próximo passo

- O frontend ainda grava no rascunho legado e não mostra botão de enviar nem fila para arquiteta. Nenhuma mensagem externa ou confirmação final foi implementada; `unit_proposal_reviews` é parecer técnico, não aprovação comercial/final.
- Precisam ser definidos o carregamento administrativo dos dados oficiais, versionamento de catálogo e preços, integração dos RPCs novos à interface, retirada dos caminhos legados e testes pela API real. Até essa troca, o prazo de Planta não protege o fluxo atual do cliente.
- As nove unidades fictícias continuam no Supabase local; nenhuma planta base, opção ou prazo oficial foi cadastrado. Branch `main`, sem commit criado.

---

# 40. Interface local de personalização — 06/10/2026

> Estado histórico: o layout desta etapa foi substituído pela interface aprovada descrita na seção 41; as funções de banco foram mantidas.

## Entregue

- A interface autenticada agora lê as unidades, plantas base atribuídas, opções permitidas por planta, módulos, prazos, escolhas e proposta diretamente do Supabase. O cliente escolhe e salva cada módulo; o servidor valida prazo, vínculo e revisão.
- Proprietário e coproprietário compartilham a mesma proposta. O primeiro envio cria a versão 1; cada salvamento posterior acrescenta uma versão à **mesma** proposta. O cliente abre a edição com “Alterar proposta”. A arquiteta vê a versão mais recente e pode registrar um parecer técnico específico daquela versão. Um novo salvamento deixa o novo parecer pendente.
- O cliente pode pedir ajuda à arquiteta designada, acompanhar o pedido e cancelá-lo. A arquiteta pode aceitar e concluir o atendimento. Autorização de acesso e pedido de ajuda continuam ações separadas.
- Criada `20261006000400_readable_module_catalog.sql` para leitura do catálogo novo pelas unidades acessíveis e `20261006000500_close_legacy_configuration_writes.sql` para revogar de `authenticated` os quatro RPCs legados de gravação. São **18 migrations locais aplicadas**. O caminho ativo de salvamento da interface é `save_unit_module_choices`.
- Criado `npm run db:demo-local`: cadastra três plantas `DEMO-*`, opções e prazos fictícios nas nove unidades de teste e configura senha local para quatro contas de teste. Não há plantas, preços ou catálogo oficiais.
- Os três testes SQL agora criam unidade temporária e revertem tudo no fim; continuam passando mesmo após existir proposta de demonstração. `npm run build`, `npm test` (13 testes antigos) e `npm run test:db-local` passaram. O fluxo novo foi testado manualmente no navegador com login real, salvamento, envio, edição por coproprietário, parecer da arquiteta e pedido de ajuda.

## Como testar agora

1. Com Docker Desktop e Supabase local ativos, na raiz do projeto rode `npm run dev` e abra o endereço informado pelo Vite, com `/exclusive/` ao final. Nesta sessão o endereço é `http://127.0.0.1:5174/exclusive/`.
2. Para testar **primeiro envio**, use `cliente.a@example.test` na unidade 1209A. Para testar uma proposta já enviada, use `cliente.d@example.test` ou `cliente.e@example.test` na unidade 1401A. Use `architect.1@example.test` para o parecer e o atendimento. A senha local das quatro contas é `CityparkTeste2026!`.
3. Na unidade 1401A existe uma proposta de **teste** na versão 3, com parecer antigo na versão 2 e atendimento já concluído. Isso permite verificar que a versão mais recente está pendente de análise. `npm run db:demo-local` pode renovar prazos fictícios, mas não apaga propostas ou escolhas.

## Limites e próximo passo

- Ainda não há aviso externo à equipe, aprovação final, preços oficiais, renders oficiais nem catálogo real. O parecer mostrado é apenas técnico. A mensagem de envio aparece dentro da interface; a arquiteta consulta sua unidade no portal.
- Substituir o catálogo e as plantas `DEMO-*` por dados aprovados da equipe, estabelecer prazos reais por unidade e decidir o canal de aviso. Antes de uso real, definir quando a proposta deixa de aceitar edições e o fluxo de aprovação final.
- Os 13 testes JavaScript existentes cobrem o protótipo anterior; a interface nova foi verificada manualmente com o Supabase local e pelos testes de banco, mas ainda carece de testes automatizados de navegação.

**Fim do checkpoint.**

---

# 41. Restauração da interface aprovada — 06/10/2026

- A pedido do Vini, a interface principal aprovada foi restaurada: navegação lateral escura, prévias de ambientes, cartões de escolhas, resumo lateral e tela original de seleção da unidade. `src/main.js` voltou a montar `app.js`; o painel novo foi removido.
- `src/legacy-adapter.js` liga essa interface ao modelo novo do Supabase. “Salvar progresso” grava pelos módulos com `save_unit_module_choices`, respeitando planta base, disponibilidade por unidade, prazo e revisão. As opções do protótipo são mapeadas explicitamente para o catálogo `DEMO-*` local.
- Rascunhos legados continuam legíveis como ponto de partida quando um módulo ainda não tem escolhas no modelo novo. Uma gravação pelo botão antigo passa a persistir essas escolhas no modelo por módulos; dados já salvos no modelo novo prevalecem.
- O modal existente “Revisar escolhas” concentra envio da proposta, edição posterior e parecer da arquiteta. “Precisa de ajuda?” abre o atendimento sem alterar a estrutura da tela principal. O layout antigo continua mostrando valores fictícios identificados como tal.
- Rodamão e Serviço foram adicionados ao seed fictício de Bancadas para que todas as opções da interface anterior sejam graváveis no modelo novo. A unidade 1210A foi usada para validar o primeiro envio e está na versão 1; 1209A continua sem proposta enviada. A 1401A está na versão 5 da mesma proposta, com parecer técnico fictício registrado pela interface restaurada.
- Verificados no navegador: visual original, opção indisponível por planta, salvamento, versão posterior da mesma proposta, primeiro envio, pedido de ajuda, bloqueio inicial da edição após envio e parecer da arquiteta. `npm run build`, `npm test` (13 testes) e `npm run test:db-local` passaram.
- A conta fictícia `cliente.b@example.test` foi incluída no seed para testar 1210A. As contas de teste usam a senha local `CityparkTeste2026!`. Nesta sessão, o Vite está em `http://127.0.0.1:5175/exclusive/`; em outra inicialização, use a porta mostrada por `npm run dev`.
- As plantas, prazos, opções e preços usados nesse teste são fictícios. O catálogo visual aprovado está mapeado aos códigos de demonstração; quando chegarem os dados oficiais, será preciso conferir as correspondências de cada opção e seus renders sem redesenhar a interface.

**Fim do checkpoint.**


---

# 42. Ciclos de proposta e limite de alterações — 07/10/2026

## REGRA DECIDIDA E IMPLEMENTAÇÃO PREPARADA

- Regra definida por Vini: cada ciclo de proposta permite **1 envio inicial + até 3 alterações reenviadas**, totalizando no máximo **4 versões submetidas**.
- O botão **Salvar progresso** não consome uma alteração. As escolhas salvas depois de um envio ficam como rascunho até o cliente reenviar explicitamente a proposta.
- Ao chegar à versão submetida 4/4, o ciclo fica congelado para cliente e arquiteta até o parecer; admin permanece como exceção operacional explícita. Isso evita alterações não reenviáveis depois do limite. O bloqueio foi colocado também no banco, não apenas na interface.
- A arquiteta só pode registrar parecer sobre a versão submetida mais recente. Se o cliente salvou mudanças e ainda não as reenviou, o parecer é bloqueado para evitar análise de uma proposta desatualizada.
- O parecer técnico encerra o ciclo atual. Depois disso, owner/co_owner podem iniciar uma **nova proposta**, que começa novamente em 1/4 e recebe o mesmo limite de três alterações.
- Ciclos e versões anteriores permanecem armazenados para histórico e auditoria.

## Alterações preparadas no repositório

- Nova migration `20261007000100_proposal_cycles_and_edit_limit.sql`: adiciona `cycle_number`, estado do ciclo e data do parecer em `unit_proposals`; permite vários ciclos históricos por unidade, mantendo somente um aberto; remove o trigger que criava versões a cada salvamento; redefine `submit_unit_proposal` e `review_unit_proposal`; adiciona proteção do limite no banco.
- `src/legacy-adapter.js`: passa a carregar o ciclo atual, detectar alterações ainda não reenviadas, exibir limite restante e tratar os novos erros do banco.
- `app.js`: mostra `Proposta N · envio X/4`, oferece reenvio explícito, informa o limite atingido e libera “nova proposta” depois do parecer.
- `scripts/test-unit-proposals-local.sql`: atualizado para validar que salvar não consome versão, owner/co_owner podem reenviar, o quarto envio bloqueia novas alterações, parecer encerra o ciclo e o envio seguinte cria ciclo 2.
- `docs/plano-fluxo-propostas.md` e `docs/modelo-alvo-banco.md` atualizados com a nova regra.

## Validação desta alteração

- `npm test` passou com os 13 testes JavaScript existentes.
- `node --check app.js` e `node --check src/legacy-adapter.js` passaram.
- Nesta execução isolada não foi possível iniciar o Supabase/Docker local nem concluir o build do Vite porque os binários nativos incluídos no `node_modules` do arquivo recebido são do ambiente original. Portanto, a migration nova e o teste SQL ainda precisam ser aplicados/executados no ambiente local do projeto antes de considerar esta etapa **TESTADA NO BANCO**.

## Próximo passo imediato

No computador de desenvolvimento com Docker Desktop e Supabase local ativos: aplicar a migration nova, executar `npm run test:db-local`, abrir a interface e testar manualmente o ciclo completo 1/4 → 2/4 → 3/4 → 4/4 → parecer → nova proposta 1/4. Somente depois atualizar este checkpoint para **IMPLEMENTADO E TESTADO NO BANCO LOCAL**.

**Fim do checkpoint.**

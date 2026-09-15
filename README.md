# Sabor de Casa — Cardápio Digital Web com Banco de Dados

Aplicação web full-stack de cardápio digital gastronômico para restaurantes, com persistência real em banco de dados relacional (MySQL/TiDB via Drizzle ORM), interface responsiva mobile-first, cálculo automático de totais no servidor, taxa opcional de 10% de garçom, carrinho persistente e 150 produtos cadastrados e distribuídos igualmente entre 5 categorias obrigatórias.

---

## 1. Visão Geral e Recursos

- **150 Produtos Reais Cadastrados:** Exatamente 30 itens por categoria com descrições apetitosas, preços em BRL e imagens:
  - `ENTRADAS` (30 produtos)
  - `PRATO PRINCIPAL` (30 produtos)
  - `SOBREMESAS` (30 produtos)
  - `BEBIDAS` (30 produtos)
  - `CARTA DE VINHOS` (30 produtos)
- **Persistência Completa em Banco de Dados:** Produtos, pedidos e itens do pedido são gravados nas tabelas `produtos`, `pedidos` e `itens_pedido`.
- **Área "Meu Pedido" (Carrinho Persistente):**
  - Identificação por sessão de cliente (`session_id`), preservando itens mesmo ao recarregar a página.
  - Exibição de nome, quantidade, valor unitário e total por item.
  - Botões para aumentar (+), diminuir (-) e remover (lixeira) produtos.
- **Cálculo Automático no Back-End:**
  - Subtotal calculado a partir dos valores dos itens no banco.
  - Taxa de 10% do garçom opcional (com checkbox no front-end para marcar/desmarcar).
  - Total geral recalculado dinamicamente no back-end para evitar manipulações no cliente.
- **Dados do Cliente:** Solicita e persiste nome do cliente e número da mesa antes da finalização.
- **Pesquisa e Filtros:**
  - Filtro por categoria (menu interativo com abas horizontais e ícones).
  - Campo de busca em tempo real por nome ou descrição do prato.
- **Finalização do Pedido:** Grava o pedido definitivo no banco com status `finalizado` e exibe o resumo completo (número do pedido, cliente, mesa, produtos, subtotal, taxa e total).
- **Diferenciais Implementados:**
  - Imagens em todos os produtos.
  - Campo de observações especiais para a cozinha.
  - Histórico de pedidos finalizados com filtro por mesa (`/historico`).
  - Painel de gerenciamento de produtos no banco (`/admin`) com cadastro, edição e desativação (soft delete).
  - Alternância de tema Claro / Escuro (Dark Mode).
  - API REST pública documentada em `/api/v1/*` em conjunto com tRPC.

---

## 2. Estrutura do Banco de Dados

O banco de dados relacional é modelado via **Drizzle ORM**:

### Tabela `produtos`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT (PK) | Identificador único do produto |
| `nome` | VARCHAR(180) NOT NULL | Nome do prato ou bebida |
| `descricao` | TEXT NOT NULL | Descrição detalhada dos ingredientes |
| `preco` | DECIMAL(10, 2) NOT NULL | Valor unitário em Reais (R$) |
| `categoria` | VARCHAR(64) NOT NULL | `ENTRADAS`, `PRATO PRINCIPAL`, `SOBREMESAS`, `BEBIDAS`, `CARTA DE VINHOS` |
| `imagem` | TEXT | URL da imagem ilustrativa |
| `destaque` | INT DEFAULT 0 | 1 para produtos em destaque no cardápio |
| `ativo` | INT DEFAULT 1 | 1 para produto ativo, 0 para inativo |
| `created_at` | TIMESTAMP | Data de cadastro |
| `updated_at` | TIMESTAMP | Data da última atualização |

### Tabela `pedidos`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT (PK) | Número único do pedido |
| `session_id` | VARCHAR(128) NOT NULL | Identificador da sessão do cliente |
| `nome_cliente` | VARCHAR(150) NOT NULL | Nome informado pelo cliente |
| `numero_mesa` | VARCHAR(32) NOT NULL | Número da mesa |
| `observacoes` | TEXT | Instruções especiais para a cozinha |
| `subtotal` | DECIMAL(10, 2) NOT NULL | Soma dos itens do pedido |
| `taxa_garcom` | DECIMAL(10, 2) NOT NULL | 10% do subtotal se habilitado |
| `total` | DECIMAL(10, 2) NOT NULL | Subtotal + Taxa de Garçom |
| `inclui_taxa_garcom` | INT DEFAULT 1 | 1 para sim, 0 para não |
| `status` | VARCHAR(32) DEFAULT 'aberto' | `aberto` (carrinho em curso) ou `finalizado` |
| `data_criacao` | TIMESTAMP | Timestamp de criação |
| `data_atualizacao` | TIMESTAMP | Timestamp da última alteração |

### Tabela `itens_pedido`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT (PK) | Identificador do item |
| `pedido_id` | INT NOT NULL (FK) | Referência ao pedido |
| `produto_id` | INT NOT NULL (FK) | Referência ao produto |
| `quantidade` | INT NOT NULL DEFAULT 1 | Quantidade de unidades |
| `valor_unitario` | DECIMAL(10, 2) NOT NULL | Preço unitário no momento da adição |
| `valor_total` | DECIMAL(10, 2) NOT NULL | Quantidade * Valor unitário |
| `observacao_item` | TEXT | Observação específica deste item |
| `data_criacao` | TIMESTAMP | Data de inclusão |

---

## 3. Endpoints da API

A aplicação oferece tanto contratos fortemente tipados via **tRPC** (`/api/trpc/*`) quanto endpoints **REST convencionais** (`/api/v1/*`):

### Endpoints REST (`/api/v1`)

- `GET /api/v1/produtos`
  - Filtros opcionais via query string: `?categoria=ENTRADAS&busca=salmão`
  - Resposta: `{ success: true, total: 30, data: [...] }`
- `GET /api/v1/produtos/:id`
  - Retorna os dados de um produto específico.
- `POST /api/v1/pedidos`
  - Cria explicitamente um novo pedido aberto antes da inclusão de itens.
  - Body: `{ "sessionId": "sess_abc", "nomeCliente": "Renata", "numeroMesa": "14", "observacoes": "Mesa externa", "incluiTaxaGarcom": true }`
  - Resposta HTTP: `201 Created` com o pedido persistido e totais zerados.
- `GET /api/v1/pedidos/carrinho/:sessionId`
  - Retorna o pedido aberto e itens associados à sessão fornecida.
- `POST /api/v1/pedidos/itens`
  - Body: `{ "sessionId": "sess_123", "produtoId": 5, "quantidade": 2, "observacaoItem": "Bem passado" }`
  - Adiciona ou incrementa produto no carrinho e recalcula totais no servidor.
- `PUT /api/v1/pedidos/itens/:itemId`
  - Body: `{ "sessionId": "sess_123", "quantidade": 3 }`
  - Altera quantidade (se 0, remove o item) e recalcula totais.
- `DELETE /api/v1/pedidos/itens/:itemId?sessionId=sess_123`
  - Remove o item do pedido e recalcula totais.
- `PATCH /api/v1/pedidos/taxa-garcom`
  - Body: `{ "sessionId": "sess_123", "incluiTaxa": true }`
  - Liga ou desliga a taxa de 10% do garçom e atualiza o total.
- `POST /api/v1/pedidos/finalizar`
  - Body: `{ "sessionId": "sess_123", "nomeCliente": "Renata", "numeroMesa": "14", "observacoes": "Mesa externa" }`
  - Valida itens e dados obrigatórios, grava o pedido final no banco e altera status para `finalizado`.
- `GET /api/v1/pedidos/historico`
  - Query opcional: `?mesa=14`
  - Lista pedidos finalizados com resumo completo dos itens.

### Operações administrativas via tRPC

- `produtos.criar`: cadastra um produto ativo.
- `produtos.atualizar`: edita nome, descrição, preço, categoria, imagem e destaque.
- `produtos.excluir`: desativa o produto (`ativo = 0`) sem apagar o histórico do banco.

O painel administrativo usa essas operações em `/admin`. A exclusão é deliberadamente um **soft delete**, para preservar referências históricas e evitar perda de dados.

---

## 4. Como Executar Localmente

### Pré-requisitos
- Node.js 20+ ou 22+
- Gerenciador de pacotes `pnpm` (`npm install -g pnpm`)
- Banco de dados MySQL, TiDB, MariaDB ou PostgreSQL com URL de conexão no formato padrão.

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd sabor-de-casa
   ```

2. **Instalar dependências:**
   ```bash
   pnpm install
   ```

3. **Configurar as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto (ou configure em seu provedor):
   ```env
   PORT=3000
   DATABASE_URL="mysql://usuario:senha@host:3306/sabor_de_casa?sslaccept=strict"
   NODE_ENV=development
   ```

4. **Executar as migrações do banco de dados:**
   ```bash
   pnpm drizzle-kit generate
   ```

5. **Executar o script de Seed (Cadastra os 150 produtos automaticamente):**
   ```bash
   npx tsx seed.ts
   ```

6. **Rodar a suíte de testes automatizados:**
   ```bash
   pnpm test
   ```

7. **Iniciar o servidor de desenvolvimento:**
   ```bash
   pnpm dev
   ```
   Acesse a aplicação no seu navegador em `http://localhost:3000`.

---

## 5. Deploy permanente

### Opção recomendada: Render (aplicação full-stack)

O projeto atual foi estruturado para rodar como um único processo Node.js, servindo a API Express/tRPC e os arquivos estáticos do Vite. Por isso, o Render é a opção mais direta.

1. Suba o código para um repositório GitHub ou GitLab.
2. No painel do Render, escolha **New → Web Service** e conecte o repositório.
3. Configure:
   - **Environment:** `Node`
   - **Build Command:** `corepack enable && pnpm install --frozen-lockfile && pnpm build`
   - **Start Command:** `pnpm start`
   - **Health Check Path:** `/api/v1/produtos`
4. Cadastre as variáveis de ambiente no Render. Não faça commit de `.env`:
   ```env
   NODE_ENV=production
   DATABASE_URL=mysql://usuario:senha@host:3306/sabor_de_casa
   JWT_SECRET=gere-um-segredo-longo-e-aleatorio
   VITE_APP_ID=se-aplicavel-ao-login-Manus
   OAUTH_SERVER_URL=se-aplicavel-ao-login-Manus
   VITE_OAUTH_PORTAL_URL=se-aplicavel-ao-login-Manus
   OWNER_OPEN_ID=se-aplicavel-ao-login-Manus
   OWNER_NAME=Nome do proprietário
   ```
5. Crie um banco MySQL/TiDB gerenciado. Copie sua string para `DATABASE_URL`.
6. Após o primeiro deploy, execute a migração e o seed usando um Shell temporário do Render ou um job de release:
   ```bash
   pnpm drizzle-kit generate
   npx tsx seed.ts
   ```
   O `seed.ts` limpa a tabela `produtos` antes de inserir os 150 itens; execute-o somente quando quiser repopular o catálogo.
7. Teste a URL permanente:
   ```bash
   curl https://SEU-SERVICO.onrender.com/api/v1/produtos
   curl -X POST https://SEU-SERVICO.onrender.com/api/v1/pedidos \
     -H 'Content-Type: application/json' \
     -d '{"sessionId":"sess_deploy_1","nomeCliente":"Cliente Teste","numeroMesa":"1"}'
   ```

O Render injeta a variável `PORT` automaticamente; o servidor já usa essa variável e não deve ter uma porta fixa hardcoded em produção.

### Alternativa: Vercel para front-end separado + Render para API

O código atual é full-stack e usa chamadas tRPC relativas (`/api/trpc`), portanto **não deve ser simplesmente colocado como site estático na Vercel** sem uma camada de proxy. Para usar Vercel:

1. Publique o servidor completo no Render seguindo os passos anteriores, por exemplo em `https://sabor-api.onrender.com`.
2. Crie um projeto Vercel apontando para a mesma base de código e adapte a configuração do cliente tRPC para usar `VITE_API_URL=https://sabor-api.onrender.com`.
3. Configure no servidor Render CORS para aceitar o domínio Vercel e mantenha `DATABASE_URL` somente no Render.
4. No Vercel, use o build do front-end:
   ```bash
   pnpm install --frozen-lockfile && pnpm build
   ```
5. Publique os arquivos de `dist/public` como saída estática. As rotas de API continuam no Render.

Para este projeto, **Render full-stack é recomendado** porque preserva o mesmo domínio para front-end, REST e tRPC e exige menos alterações no código.

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { count } from "drizzle-orm";
import { itensPedido, pedidos, produtos, users } from "../drizzle/schema";
import { SEED_PRODUTOS } from "../seed";

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openId VARCHAR(64) NOT NULL UNIQUE,
    name TEXT NULL,
    email VARCHAR(320) NULL,
    loginMethod VARCHAR(64) NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(180) NOT NULL,
    descricao TEXT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(64) NOT NULL,
    imagem TEXT NULL,
    destaque INT NOT NULL DEFAULT 0,
    ativo INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    nome_cliente VARCHAR(150) NOT NULL DEFAULT 'Cliente',
    numero_mesa VARCHAR(32) NOT NULL DEFAULT '1',
    observacoes TEXT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    taxa_garcom DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    inclui_taxa_garcom INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'aberto',
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS itens_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    observacao_item TEXT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

let bootstrapPromise: Promise<void> | null = null;

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not configured; skipping automatic bootstrap");
    return;
  }

  const pool = mysql.createPool(process.env.DATABASE_URL);
  try {
    for (const statement of CREATE_TABLES) await pool.execute(statement);

    const database = drizzle(pool);
    const [{ value: productCount }] = await database.select({ value: count() }).from(produtos);
    if (Number(productCount) === 0) {
      console.log(`[Database] Seeding ${SEED_PRODUTOS.length} products on first startup...`);
      for (let i = 0; i < SEED_PRODUTOS.length; i += 25) {
        const chunk = SEED_PRODUTOS.slice(i, i + 25).map((product) => ({
          ...product,
          destaque: product.destaque ?? 0,
          ativo: 1,
        }));
        await database.insert(produtos).values(chunk);
      }
      console.log("[Database] Initial product catalog seeded successfully");
    }
  } finally {
    await pool.end();
  }
}

export function ensureDatabaseReady() {
  if (!bootstrapPromise) {
    bootstrapPromise = initializeDatabase().catch((error) => {
      bootstrapPromise = null;
      console.error("[Database] Automatic bootstrap failed:", error);
      throw error;
    });
  }
  return bootstrapPromise;
}

// Keep schema imports explicit so this module documents every initialized table.
void pedidos;
void itensPedido;
void users;

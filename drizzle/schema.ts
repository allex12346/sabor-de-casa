import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categorias obrigatórias especificadas:
 * - ENTRADAS
 * - PRATO PRINCIPAL
 * - SOBREMESAS
 * - BEBIDAS
 * - CARTA DE VINHOS
 */
export const CATEGORIAS_VALIDAS = [
  "ENTRADAS",
  "PRATO PRINCIPAL",
  "SOBREMESAS",
  "BEBIDAS",
  "CARTA DE VINHOS",
] as const;

export type CategoriaProduto = (typeof CATEGORIAS_VALIDAS)[number];

export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 180 }).notNull(),
  descricao: text("descricao").notNull(),
  preco: decimal("preco", { precision: 10, scale: 2 }).notNull(),
  categoria: varchar("categoria", { length: 64 }).notNull(),
  imagem: text("imagem"),
  destaque: int("destaque").default(0).notNull(),
  ativo: int("ativo").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

export const STATUS_PEDIDO = ["aberto", "finalizado", "cancelado"] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const pedidos = mysqlTable("pedidos", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("session_id", { length: 128 }).notNull(),
  nomeCliente: varchar("nome_cliente", { length: 150 }).notNull().default("Cliente"),
  numeroMesa: varchar("numero_mesa", { length: 32 }).notNull().default("1"),
  observacoes: text("observacoes"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0.00"),
  taxaGarcom: decimal("taxa_garcom", { precision: 10, scale: 2 }).notNull().default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0.00"),
  incluiTaxaGarcom: int("inclui_taxa_garcom").default(1).notNull(),
  status: varchar("status", { length: 32 }).default("aberto").notNull(),
  createdAt: timestamp("data_criacao").defaultNow().notNull(),
  updatedAt: timestamp("data_atualizacao").defaultNow().onUpdateNow().notNull(),
});

export type Pedido = typeof pedidos.$inferSelect;
export type InsertPedido = typeof pedidos.$inferInsert;

export const itensPedido = mysqlTable("itens_pedido", {
  id: int("id").autoincrement().primaryKey(),
  pedidoId: int("pedido_id").notNull(),
  produtoId: int("produto_id").notNull(),
  quantidade: int("quantidade").notNull().default(1),
  valorUnitario: decimal("valor_unitario", { precision: 10, scale: 2 }).notNull(),
  valorTotal: decimal("valor_total", { precision: 10, scale: 2 }).notNull(),
  observacaoItem: text("observacao_item"),
  createdAt: timestamp("data_criacao").defaultNow().notNull(),
});

export type ItemPedido = typeof itensPedido.$inferSelect;
export type InsertItemPedido = typeof itensPedido.$inferInsert;

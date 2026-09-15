import { and, desc, eq, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertItemPedido,
  InsertPedido,
  InsertProduto,
  InsertUser,
  ItemPedido,
  Pedido,
  Produto,
  itensPedido,
  pedidos,
  produtos,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User Helpers
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== PRODUTOS ====================

export interface ListProdutosFilters {
  categoria?: string;
  busca?: string;
  apenasAtivos?: boolean;
}

export async function listarProdutos(filters: ListProdutosFilters = {}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters.apenasAtivos !== false) {
    conditions.push(eq(produtos.ativo, 1));
  }

  if (filters.categoria && filters.categoria.trim() !== "" && filters.categoria !== "TODOS") {
    conditions.push(eq(produtos.categoria, filters.categoria.trim()));
  }

  if (filters.busca && filters.busca.trim() !== "") {
    conditions.push(
      sql`(${produtos.nome} LIKE ${`%${filters.busca.trim()}%`} OR ${produtos.descricao} LIKE ${`%${filters.busca.trim()}%`})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return await db
    .select()
    .from(produtos)
    .where(whereClause)
    .orderBy(desc(produtos.destaque), produtos.id);
}

export async function obterProdutoPorId(id: number): Promise<Produto | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [produto] = await db.select().from(produtos).where(eq(produtos.id, id)).limit(1);
  return produto;
}

export async function criarProduto(dados: InsertProduto) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [res] = await db.insert(produtos).values(dados);
  return res.insertId;
}

export async function atualizarProduto(id: number, dados: Partial<InsertProduto>) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  await db.update(produtos).set(dados).where(eq(produtos.id, id));
  return obterProdutoPorId(id);
}

export async function deletarProduto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  await db.update(produtos).set({ ativo: 0 }).where(eq(produtos.id, id));
  return { success: true };
}

// ==================== PEDIDOS & CARRINHO ====================

export interface ItemComDetalhes extends ItemPedido {
  produto?: Produto;
}

export interface PedidoComItens extends Pedido {
  itens: ItemComDetalhes[];
}

/**
 * Recalcula totais com base nos itens e na flag incluiTaxaGarcom.
 * Garante consistência exata no servidor evitando discrepâncias.
 */
export async function recalcularTotaisPedido(pedidoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [pedido] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`);

  const itens = await db.select().from(itensPedido).where(eq(itensPedido.pedidoId, pedidoId));

  let subtotalNum = 0;
  for (const item of itens) {
    subtotalNum += parseFloat(item.valorTotal);
  }

  const taxaGarcomNum = pedido.incluiTaxaGarcom === 1 ? subtotalNum * 0.1 : 0.0;
  const totalNum = subtotalNum + taxaGarcomNum;

  const subtotalStr = subtotalNum.toFixed(2);
  const taxaGarcomStr = taxaGarcomNum.toFixed(2);
  const totalStr = totalNum.toFixed(2);

  await db
    .update(pedidos)
    .set({
      subtotal: subtotalStr,
      taxaGarcom: taxaGarcomStr,
      total: totalStr,
    })
    .where(eq(pedidos.id, pedidoId));

  return {
    subtotal: subtotalStr,
    taxaGarcom: taxaGarcomStr,
    total: totalStr,
  };
}

/**
 * Obtém ou cria o pedido "aberto" (carrinho persistente) associado a uma sessão de cliente.
 */
export async function obterOuCriarPedidoAberto(sessionId: string): Promise<PedidoComItens> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  let [pedido] = await db
    .select()
    .from(pedidos)
    .where(and(eq(pedidos.sessionId, sessionId), eq(pedidos.status, "aberto")))
    .orderBy(desc(pedidos.id))
    .limit(1);

  if (!pedido) {
    const [res] = await db.insert(pedidos).values({
      sessionId,
      nomeCliente: "Cliente",
      numeroMesa: "1",
      incluiTaxaGarcom: 1,
      status: "aberto",
      subtotal: "0.00",
      taxaGarcom: "0.00",
      total: "0.00",
    });

    const [novoPedido] = await db.select().from(pedidos).where(eq(pedidos.id, res.insertId)).limit(1);
    pedido = novoPedido;
  }

  return await carregarDetalhesPedido(pedido.id);
}

export async function carregarDetalhesPedido(pedidoId: number): Promise<PedidoComItens> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [pedido] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
  if (!pedido) throw new Error(`Pedido ${pedidoId} não encontrado`);

  const itens = await db
    .select({
      id: itensPedido.id,
      pedidoId: itensPedido.pedidoId,
      produtoId: itensPedido.produtoId,
      quantidade: itensPedido.quantidade,
      valorUnitario: itensPedido.valorUnitario,
      valorTotal: itensPedido.valorTotal,
      observacaoItem: itensPedido.observacaoItem,
      createdAt: itensPedido.createdAt,
      produto: produtos,
    })
    .from(itensPedido)
    .leftJoin(produtos, eq(itensPedido.produtoId, produtos.id))
    .where(eq(itensPedido.pedidoId, pedidoId));

  return {
    ...pedido,
    itens: itens.map((item) => ({
      id: item.id,
      pedidoId: item.pedidoId,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
      observacaoItem: item.observacaoItem,
      createdAt: item.createdAt,
      produto: item.produto || undefined,
    })),
  };
}

/**
 * Adiciona ou incrementa um item no pedido aberto
 */
export async function adicionarItemAoPedido(
  sessionId: string,
  produtoId: number,
  quantidade: number = 1,
  observacaoItem?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const pedido = await obterOuCriarPedidoAberto(sessionId);
  const produto = await obterProdutoPorId(produtoId);
  if (!produto) throw new Error(`Produto ${produtoId} não encontrado`);

  const [itemExistente] = await db
    .select()
    .from(itensPedido)
    .where(and(eq(itensPedido.pedidoId, pedido.id), eq(itensPedido.produtoId, produtoId)))
    .limit(1);

  const precoUnitario = parseFloat(produto.preco);

  if (itemExistente) {
    const novaQuantidade = itemExistente.quantidade + quantidade;
    const novoValorTotal = (novaQuantidade * precoUnitario).toFixed(2);

    await db
      .update(itensPedido)
      .set({
        quantidade: novaQuantidade,
        valorTotal: novoValorTotal,
        observacaoItem: observacaoItem ?? itemExistente.observacaoItem,
      })
      .where(eq(itensPedido.id, itemExistente.id));
  } else {
    const valorTotal = (quantidade * precoUnitario).toFixed(2);
    await db.insert(itensPedido).values({
      pedidoId: pedido.id,
      produtoId,
      quantidade,
      valorUnitario: produto.preco,
      valorTotal,
      observacaoItem: observacaoItem ?? null,
    });
  }

  await recalcularTotaisPedido(pedido.id);
  return await carregarDetalhesPedido(pedido.id);
}

/**
 * Atualiza quantidade de um item específico do pedido (se <= 0, remove)
 */
export async function atualizarQuantidadeItem(
  sessionId: string,
  itemId: number,
  novaQuantidade: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [item] = await db.select().from(itensPedido).where(eq(itensPedido.id, itemId)).limit(1);
  if (!item) throw new Error("Item do pedido não encontrado");

  // Verificar se o pedido pertence à sessão
  const [pedido] = await db
    .select()
    .from(pedidos)
    .where(and(eq(pedidos.id, item.pedidoId), eq(pedidos.sessionId, sessionId)))
    .limit(1);

  if (!pedido) throw new Error("Não autorizado ou pedido não pertence a esta sessão");

  if (novaQuantidade <= 0) {
    await db.delete(itensPedido).where(eq(itensPedido.id, itemId));
  } else {
    const valorUnit = parseFloat(item.valorUnitario);
    const novoValorTotal = (novaQuantidade * valorUnit).toFixed(2);
    await db
      .update(itensPedido)
      .set({
        quantidade: novaQuantidade,
        valorTotal: novoValorTotal,
      })
      .where(eq(itensPedido.id, itemId));
  }

  await recalcularTotaisPedido(pedido.id);
  return await carregarDetalhesPedido(pedido.id);
}

/**
 * Remove um item do pedido
 */
export async function removerItemDoPedido(sessionId: string, itemId: number) {
  return await atualizarQuantidadeItem(sessionId, itemId, 0);
}

/**
 * Alterna a opção de taxa de 10% do garçom
 */
export async function alternarTaxaGarcom(sessionId: string, incluiTaxa: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const pedido = await obterOuCriarPedidoAberto(sessionId);

  await db
    .update(pedidos)
    .set({ incluiTaxaGarcom: incluiTaxa ? 1 : 0 })
    .where(eq(pedidos.id, pedido.id));

  await recalcularTotaisPedido(pedido.id);
  return await carregarDetalhesPedido(pedido.id);
}

/**
 * Atualiza os dados preliminares do cliente no pedido em andamento
 */
export async function atualizarDadosCliente(
  sessionId: string,
  nomeCliente: string,
  numeroMesa: string,
  observacoes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const pedido = await obterOuCriarPedidoAberto(sessionId);

  await db
    .update(pedidos)
    .set({
      nomeCliente: nomeCliente.trim() || "Cliente",
      numeroMesa: numeroMesa.trim() || "1",
      observacoes: observacoes ?? pedido.observacoes,
    })
    .where(eq(pedidos.id, pedido.id));

  return await carregarDetalhesPedido(pedido.id);
}

/**
 * Finaliza o pedido em aberto, validando dados obrigatórios (nome e mesa)
 * e marcando status como "finalizado".
 */
export async function finalizarPedido(
  sessionId: string,
  nomeCliente: string,
  numeroMesa: string,
  observacoes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const pedido = await obterOuCriarPedidoAberto(sessionId);

  if (!pedido.itens || pedido.itens.length === 0) {
    throw new Error("Não é possível finalizar um pedido vazio.");
  }

  if (!nomeCliente || nomeCliente.trim() === "") {
    throw new Error("O nome do cliente é obrigatório para finalizar o pedido.");
  }

  if (!numeroMesa || numeroMesa.trim() === "") {
    throw new Error("O número da mesa é obrigatório para finalizar o pedido.");
  }

  // Recalcular totais finais no servidor
  await recalcularTotaisPedido(pedido.id);

  await db
    .update(pedidos)
    .set({
      nomeCliente: nomeCliente.trim(),
      numeroMesa: numeroMesa.trim(),
      observacoes: observacoes ?? null,
      status: "finalizado",
    })
    .where(eq(pedidos.id, pedido.id));

  return await carregarDetalhesPedido(pedido.id);
}

/**
 * Histórico de pedidos finalizados (com filtro opcional por mesa)
 */
export async function listarPedidosFinalizados(numeroMesa?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(pedidos.status, "finalizado")];
  if (numeroMesa && numeroMesa.trim() !== "") {
    conditions.push(eq(pedidos.numeroMesa, numeroMesa.trim()));
  }

  const listaPedidos = await db
    .select()
    .from(pedidos)
    .where(and(...conditions))
    .orderBy(desc(pedidos.id))
    .limit(50);

  const resultados: PedidoComItens[] = [];
  for (const ped of listaPedidos) {
    const detalhe = await carregarDetalhesPedido(ped.id);
    resultados.push(detalhe);
  }

  return resultados;
}

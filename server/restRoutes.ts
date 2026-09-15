import { Router, Request, Response } from "express";
import * as db from "./db";

export const restRouter = Router();

/**
 * GET /api/v1/produtos
 * Query params:
 * - categoria: string (ex: "ENTRADAS", "PRATO PRINCIPAL")
 * - busca: string (nome ou descrição)
 */
restRouter.get("/produtos", async (req: Request, res: Response) => {
  try {
    const categoria = typeof req.query.categoria === "string" ? req.query.categoria : undefined;
    const busca = typeof req.query.busca === "string" ? req.query.busca : undefined;

    const lista = await db.listarProdutos({ categoria, busca, apenasAtivos: true });
    return res.json({
      success: true,
      total: lista.length,
      data: lista,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/produtos/:id
 */
restRouter.get("/produtos/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "ID inválido" });
    }

    const produto = await db.obterProdutoPorId(id);
    if (!produto) {
      return res.status(404).json({ success: false, error: "Produto não encontrado" });
    }

    return res.json({ success: true, data: produto });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/pedidos
 * Body: { sessionId, nomeCliente, numeroMesa, observacoes?, incluiTaxaGarcom? }
 * Cria explicitamente um pedido aberto antes da inclusão de itens.
 */
restRouter.post("/pedidos", async (req: Request, res: Response) => {
  try {
    const { sessionId, nomeCliente, numeroMesa, observacoes, incluiTaxaGarcom } = req.body;
    if (!sessionId || !nomeCliente || !numeroMesa) {
      return res.status(400).json({
        success: false,
        error: "sessionId, nomeCliente e numeroMesa são obrigatórios",
      });
    }

    const pedido = await db.criarPedidoExplicito({
      sessionId: String(sessionId),
      nomeCliente: String(nomeCliente),
      numeroMesa: String(numeroMesa),
      observacoes: observacoes ? String(observacoes) : undefined,
      incluiTaxaGarcom: incluiTaxaGarcom === undefined ? true : Boolean(incluiTaxaGarcom),
    });

    return res.status(201).json({
      success: true,
      message: "Pedido aberto criado com sucesso!",
      data: pedido,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/pedidos/carrinho/:sessionId
 */
restRouter.get("/pedidos/carrinho/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: "sessionId é obrigatório" });
    }

    const pedido = await db.obterOuCriarPedidoAberto(sessionId);
    return res.json({ success: true, data: pedido });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/pedidos/itens
 * Body: { sessionId, produtoId, quantidade?, observacaoItem? }
 */
restRouter.post("/pedidos/itens", async (req: Request, res: Response) => {
  try {
    const { sessionId, produtoId, quantidade, observacaoItem } = req.body;
    if (!sessionId || !produtoId) {
      return res.status(400).json({ success: false, error: "sessionId e produtoId são obrigatórios" });
    }

    const pedido = await db.adicionarItemAoPedido(
      sessionId,
      Number(produtoId),
      quantidade ? Number(quantidade) : 1,
      observacaoItem
    );

    return res.status(201).json({ success: true, data: pedido });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/v1/pedidos/itens/:itemId
 * Body: { sessionId, quantidade }
 */
restRouter.put("/pedidos/itens/:itemId", async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const { sessionId, quantidade } = req.body;

    if (isNaN(itemId) || !sessionId || quantidade === undefined) {
      return res.status(400).json({
        success: false,
        error: "itemId, sessionId e quantidade são obrigatórios",
      });
    }

    const pedido = await db.atualizarQuantidadeItem(sessionId, itemId, Number(quantidade));
    return res.json({ success: true, data: pedido });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/pedidos/itens/:itemId
 * Query ou Body: { sessionId }
 */
restRouter.delete("/pedidos/itens/:itemId", async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const sessionId = (req.query.sessionId as string) || req.body?.sessionId;

    if (isNaN(itemId) || !sessionId) {
      return res.status(400).json({ success: false, error: "itemId e sessionId são obrigatórios" });
    }

    const pedido = await db.removerItemDoPedido(sessionId, itemId);
    return res.json({ success: true, data: pedido });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/v1/pedidos/taxa-garcom
 * Body: { sessionId, incluiTaxa: boolean }
 */
restRouter.patch("/pedidos/taxa-garcom", async (req: Request, res: Response) => {
  try {
    const { sessionId, incluiTaxa } = req.body;
    if (!sessionId || incluiTaxa === undefined) {
      return res.status(400).json({ success: false, error: "sessionId e incluiTaxa são obrigatórios" });
    }

    const pedido = await db.alternarTaxaGarcom(sessionId, Boolean(incluiTaxa));
    return res.json({ success: true, data: pedido });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/pedidos/finalizar
 * Body: { sessionId, nomeCliente, numeroMesa, observacoes? }
 */
restRouter.post("/pedidos/finalizar", async (req: Request, res: Response) => {
  try {
    const { sessionId, nomeCliente, numeroMesa, observacoes } = req.body;
    if (!sessionId || !nomeCliente || !numeroMesa) {
      return res.status(400).json({
        success: false,
        error: "sessionId, nomeCliente e numeroMesa são obrigatórios",
      });
    }

    const pedidoFinalizado = await db.finalizarPedido(
      sessionId,
      nomeCliente,
      numeroMesa,
      observacoes
    );

    return res.json({
      success: true,
      message: "Pedido finalizado com sucesso!",
      data: pedidoFinalizado,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/pedidos/historico
 * Query: ?mesa=X
 */
restRouter.get("/pedidos/historico", async (req: Request, res: Response) => {
  try {
    const mesa = typeof req.query.mesa === "string" ? req.query.mesa : undefined;
    const historico = await db.listarPedidosFinalizados(mesa);
    return res.json({ success: true, total: historico.length, data: historico });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

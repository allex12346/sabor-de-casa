import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { carregarDetalhesPedido, criarPedidoExplicito } from "./db";

function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-test-user",
      name: "Admin Teste",
      email: "admin@example.com",
      loginMethod: "test",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Digital Menu & Order Lifecycle", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);
  const testSessionId = "test_vitest_" + Date.now();

  it("lists seeded products and filters by category", async () => {
    const todos = await caller.produtos.listar();
    expect(todos.length).toBeGreaterThanOrEqual(150);

    const entradas = await caller.produtos.listar({ categoria: "ENTRADAS" });
    expect(entradas.length).toBe(30);

    const pratos = await caller.produtos.listar({ categoria: "PRATO PRINCIPAL" });
    expect(pratos.length).toBe(30);

    const sobremesas = await caller.produtos.listar({ categoria: "SOBREMESAS" });
    expect(sobremesas.length).toBe(30);

    const bebidas = await caller.produtos.listar({ categoria: "BEBIDAS" });
    expect(bebidas.length).toBe(30);

    const vinhos = await caller.produtos.listar({ categoria: "CARTA DE VINHOS" });
    expect(vinhos.length).toBe(30);
  });

  it("filters products by search keyword", async () => {
    const busca = await caller.produtos.listar({ busca: "Bacalhau" });
    expect(busca.length).toBeGreaterThan(0);
    expect(
      busca.some(
        (p) =>
          p.nome.toLowerCase().includes("bacalhau") ||
          p.descricao.toLowerCase().includes("bacalhau")
      )
    ).toBe(true);
  });

  it("creates an explicit open order with customer and table data", async () => {
    const pedido = await criarPedidoExplicito({
      sessionId: testSessionId + "_explicit",
      nomeCliente: "João da Silva",
      numeroMesa: "12",
      observacoes: "Pedido criado por integração REST",
      incluiTaxaGarcom: false,
    });

    expect(pedido.status).toBe("aberto");
    expect(pedido.nomeCliente).toBe("João da Silva");
    expect(pedido.numeroMesa).toBe("12");
    expect(pedido.observacoes).toBe("Pedido criado por integração REST");
    expect(pedido.incluiTaxaGarcom).toBe(0);
    expect(pedido.itens).toHaveLength(0);

    const persisted = await carregarDetalhesPedido(pedido.id);
    expect(persisted.id).toBe(pedido.id);
    expect(persisted.total).toBe("0.00");
  });

  it("supports admin product create, update, and soft-delete", async () => {
    const created = await caller.produtos.criar({
      nome: "Produto de Teste CRUD",
      descricao: "Produto criado somente para validar o painel administrativo.",
      preco: "19.90",
      categoria: "ENTRADAS",
      imagem: "https://example.com/teste.jpg",
      destaque: 0,
    });
    expect(created.id).toBeGreaterThan(0);

    const updated = await caller.produtos.atualizar({
      id: created.id,
      nome: "Produto de Teste CRUD Editado",
      descricao: "Descrição atualizada pelo fluxo de edição administrativa.",
      preco: "21.90",
      categoria: "SOBREMESAS",
      imagem: "https://example.com/teste-editado.jpg",
      destaque: 1,
    });
    expect(updated?.nome).toBe("Produto de Teste CRUD Editado");
    expect(updated?.categoria).toBe("SOBREMESAS");
    expect(updated?.preco).toBe("21.90");

    const deleted = await caller.produtos.excluir({ id: created.id });
    expect(deleted.success).toBe(true);

    const hidden = await caller.produtos.obterPorId({ id: created.id });
    expect(hidden?.ativo).toBe(0);
  });

  it("creates cart, adds items, updates quantity, and computes 10% tip", async () => {
    // 1. Get empty cart
    const carrinhoInicial = await caller.pedidos.obterCarrinho({ sessionId: testSessionId });
    expect(carrinhoInicial.status).toBe("aberto");

    // 2. Add first product (id: 1, Bruschetta, R$ 28.50)
    const cartComItem1 = await caller.pedidos.adicionarItem({
      sessionId: testSessionId,
      produtoId: 1,
      quantidade: 2,
    });
    expect(cartComItem1.itens.length).toBe(1);
    expect(cartComItem1.itens[0].quantidade).toBe(2);
    expect(parseFloat(cartComItem1.subtotal)).toBeCloseTo(57.0, 2);
    // Tip 10% included by default = 5.70, total = 62.70
    expect(parseFloat(cartComItem1.taxaGarcom)).toBeCloseTo(5.7, 2);
    expect(parseFloat(cartComItem1.total)).toBeCloseTo(62.7, 2);

    // 3. Toggle tip off (0%)
    const cartSemTaxa = await caller.pedidos.alternarTaxaGarcom({
      sessionId: testSessionId,
      incluiTaxa: false,
    });
    expect(cartSemTaxa.incluiTaxaGarcom).toBe(0);
    expect(parseFloat(cartSemTaxa.taxaGarcom)).toBe(0);
    expect(parseFloat(cartSemTaxa.total)).toBeCloseTo(57.0, 2);

    // 4. Toggle tip on (10%)
    const cartComTaxa = await caller.pedidos.alternarTaxaGarcom({
      sessionId: testSessionId,
      incluiTaxa: true,
    });
    expect(cartComTaxa.incluiTaxaGarcom).toBe(1);
    expect(parseFloat(cartComTaxa.total)).toBeCloseTo(62.7, 2);

    // 5. Finalize order
    const finalizado = await caller.pedidos.finalizar({
      sessionId: testSessionId,
      nomeCliente: "Maria Fernanda",
      numeroMesa: "7",
      observacoes: "Mesa próxima à janela",
    });

    expect(finalizado.status).toBe("finalizado");
    expect(finalizado.nomeCliente).toBe("Maria Fernanda");
    expect(finalizado.numeroMesa).toBe("7");
    expect(finalizado.observacoes).toBe("Mesa próxima à janela");
    expect(parseFloat(finalizado.total)).toBeCloseTo(62.7, 2);
  });
});

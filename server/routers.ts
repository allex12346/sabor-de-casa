import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ===================== PRODUTOS =====================
  produtos: router({
    listar: publicProcedure
      .input(
        z
          .object({
            categoria: z.string().optional(),
            busca: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.listarProdutos({
          categoria: input?.categoria,
          busca: input?.busca,
          apenasAtivos: true,
        });
      }),

    obterPorId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.obterProdutoPorId(input.id);
      }),

    // Opcional: CRUD básico de produtos (Diferencial)
    criar: publicProcedure
      .input(
        z.object({
          nome: z.string().min(2),
          descricao: z.string().min(5),
          preco: z.string().regex(/^\d+(\.\d{1,2})?$/),
          categoria: z.string(),
          imagem: z.string().optional(),
          destaque: z.number().optional().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const id = await db.criarProduto({
          nome: input.nome,
          descricao: input.descricao,
          preco: input.preco,
          categoria: input.categoria,
          imagem: input.imagem,
          destaque: input.destaque ?? 0,
          ativo: 1,
        });
        return { id };
      }),

    atualizar: publicProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().min(2),
          descricao: z.string().min(5),
          preco: z.string().regex(/^\d+(\.\d{1,2})?$/),
          categoria: z.string(),
          imagem: z.string().optional(),
          destaque: z.number().optional().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const produto = await db.atualizarProduto(input.id, {
          nome: input.nome,
          descricao: input.descricao,
          preco: input.preco,
          categoria: input.categoria,
          imagem: input.imagem || null,
          destaque: input.destaque ?? 0,
        });
        return produto;
      }),

    excluir: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deletarProduto(input.id);
      }),
  }),

  // ===================== PEDIDOS & CARRINHO =====================
  pedidos: router({
    obterCarrinho: publicProcedure
      .input(z.object({ sessionId: z.string().min(1) }))
      .query(async ({ input }) => {
        return await db.obterOuCriarPedidoAberto(input.sessionId);
      }),

    adicionarItem: publicProcedure
      .input(
        z.object({
          sessionId: z.string().min(1),
          produtoId: z.number(),
          quantidade: z.number().min(1).default(1),
          observacaoItem: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.adicionarItemAoPedido(
          input.sessionId,
          input.produtoId,
          input.quantidade,
          input.observacaoItem
        );
      }),

    atualizarQuantidade: publicProcedure
      .input(
        z.object({
          sessionId: z.string().min(1),
          itemId: z.number(),
          quantidade: z.number().min(0),
        })
      )
      .mutation(async ({ input }) => {
        return await db.atualizarQuantidadeItem(
          input.sessionId,
          input.itemId,
          input.quantidade
        );
      }),

    removerItem: publicProcedure
      .input(
        z.object({
          sessionId: z.string().min(1),
          itemId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.removerItemDoPedido(input.sessionId, input.itemId);
      }),

    alternarTaxaGarcom: publicProcedure
      .input(
        z.object({
          sessionId: z.string().min(1),
          incluiTaxa: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.alternarTaxaGarcom(input.sessionId, input.incluiTaxa);
      }),

    atualizarDadosCliente: publicProcedure
      .input(
        z.object({
          sessionId: z.string().min(1),
          nomeCliente: z.string(),
          numeroMesa: z.string(),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.atualizarDadosCliente(
          input.sessionId,
          input.nomeCliente,
          input.numeroMesa,
          input.observacoes
        );
      }),

    finalizar: publicProcedure
      .input(
        z.object({
          sessionId: z.string().min(1),
          nomeCliente: z.string().min(1, "Por favor informe seu nome."),
          numeroMesa: z.string().min(1, "Por favor informe o número da mesa."),
          observacoes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.finalizarPedido(
          input.sessionId,
          input.nomeCliente,
          input.numeroMesa,
          input.observacoes
        );
      }),

    historico: publicProcedure
      .input(
        z
          .object({
            numeroMesa: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.listarPedidosFinalizados(input?.numeroMesa);
      }),
  }),
});

export type AppRouter = typeof appRouter;

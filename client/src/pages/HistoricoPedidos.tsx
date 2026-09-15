import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Receipt,
  Search,
  Clock,
  User,
  Hash,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function HistoricoPedidos() {
  const [filtroMesa, setFiltroMesa] = useState("");

  const { data: pedidos = [], isLoading } = trpc.pedidos.historico.useQuery({
    numeroMesa: filtroMesa.trim() !== "" ? filtroMesa.trim() : undefined,
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao Cardápio
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif-title">
                Histórico de Pedidos
              </h1>
              <p className="text-xs text-stone-500">
                Acompanhamento dos pedidos finalizados no restaurante
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full space-y-6">
        {/* Filter bar */}
        <div className="flex items-center gap-3 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md">
          <Hash className="w-4 h-4 text-orange-700" />
          <Input
            value={filtroMesa}
            onChange={(e) => setFiltroMesa(e.target.value)}
            placeholder="Filtrar por número da mesa (ex: 1, 5, 12)..."
            className="text-xs h-10"
          />
          {filtroMesa && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltroMesa("")}
              className="text-xs"
            >
              Limpar
            </Button>
          )}
        </div>

        {/* Orders list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 animate-pulse"
              />
            ))}
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 p-8">
            <Receipt className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold">Nenhum pedido finalizado encontrado</h3>
            <p className="text-sm text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              {filtroMesa
                ? `Não há pedidos registrados para a mesa ${filtroMesa}.`
                : "Realize seu primeiro pedido navegando pelo cardápio digital."}
            </p>
            <Link href="/">
              <Button className="bg-orange-700 hover:bg-orange-800 text-white rounded-xl text-xs font-bold">
                Ir ao Cardápio
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pedidos.map((pedido) => {
              const dataFormatada = new Date(pedido.createdAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={pedido.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base font-serif-title">
                        Pedido #{pedido.id}
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                        Finalizado
                      </Badge>
                    </div>
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {dataFormatada}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">
                        Cliente
                      </span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {pedido.nomeCliente}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">
                        Mesa
                      </span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        Mesa {pedido.numeroMesa}
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-[11px] text-stone-400 uppercase">
                      Itens solicitados:
                    </span>
                    <div className="divide-y divide-stone-100 dark:divide-stone-800 border rounded-xl overflow-hidden">
                      {pedido.itens?.map((it) => (
                        <div
                          key={it.id}
                          className="p-2.5 flex justify-between items-center text-xs"
                        >
                          <span>
                            {it.quantidade}x {it.produto?.nome || `Item #${it.produtoId}`}
                          </span>
                          <span className="font-bold font-serif-title">
                            R$ {parseFloat(it.valorTotal).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1 text-xs">
                    <div className="flex justify-between text-stone-500">
                      <span>Subtotal:</span>
                      <span>R$ {parseFloat(pedido.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>
                        Taxa de Garçom (10%):{" "}
                        {pedido.incluiTaxaGarcom === 1 ? "(inclusa)" : "(não inclusa)"}
                      </span>
                      <span>R$ {parseFloat(pedido.taxaGarcom).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-orange-800 dark:text-orange-400 pt-1 border-t border-stone-100 dark:border-stone-800">
                      <span>Total Pago:</span>
                      <span className="font-serif-title">
                        R$ {parseFloat(pedido.total).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {pedido.observacoes && (
                    <p className="text-[11px] text-stone-400 italic bg-stone-50 dark:bg-stone-800/40 p-2 rounded-lg">
                      Obs: {pedido.observacoes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

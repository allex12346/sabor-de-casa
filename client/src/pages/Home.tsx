import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { getOrCreateSessionId, resetSessionId } from "@/lib/session";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Utensils,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Moon,
  Sun,
  Wine,
  Coffee,
  Sparkles,
  User,
  Hash,
  X,
  FileText,
  Clock,
  ChevronRight,
  Receipt,
  HeartHandshake,
  Settings,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const CATEGORIAS = [
  { id: "TODOS", label: "Todos os Itens", icon: Utensils },
  { id: "ENTRADAS", label: "Entradas", icon: Sparkles },
  { id: "PRATO PRINCIPAL", label: "Prato Principal", icon: Utensils },
  { id: "SOBREMESAS", label: "Sobremesas", icon: Coffee },
  { id: "BEBIDAS", label: "Bebidas", icon: Coffee },
  { id: "CARTA DE VINHOS", label: "Carta de Vinhos", icon: Wine },
];

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [sessionId, setSessionId] = useState<string>("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("TODOS");
  const [busca, setBusca] = useState<string>("");
  const [carrinhoAberto, setCarrinhoAberto] = useState<boolean>(false);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState<boolean>(false);
  const [modalResumoAberto, setModalResumoAberto] = useState<boolean>(false);
  const [pedidoFinalizadoData, setPedidoFinalizadoData] = useState<any>(null);

  // Form fields
  const [nomeCliente, setNomeCliente] = useState<string>("");
  const [numeroMesa, setNumeroMesa] = useState<string>("1");
  const [observacoes, setObservacoes] = useState<string>("");

  // Initialize session ID
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    const savedNome = localStorage.getItem("sabor_cliente_nome") || "";
    const savedMesa = localStorage.getItem("sabor_cliente_mesa") || "1";
    setNomeCliente(savedNome);
    setNumeroMesa(savedMesa);
  }, []);

  const utils = trpc.useUtils();

  // Queries
  const { data: produtos = [], isLoading: carregandoProdutos } =
    trpc.produtos.listar.useQuery(
      {
        categoria: categoriaAtiva === "TODOS" ? undefined : categoriaAtiva,
        busca: busca.trim() !== "" ? busca : undefined,
      },
      { staleTime: 30000 }
    );

  const { data: carrinho, isLoading: carregandoCarrinho } =
    trpc.pedidos.obterCarrinho.useQuery(
      { sessionId },
      { enabled: !!sessionId, refetchOnWindowFocus: false }
    );

  // Mutations
  const adicionarItemMutation = trpc.pedidos.adicionarItem.useMutation({
    onSuccess: () => {
      utils.pedidos.obterCarrinho.invalidate({ sessionId });
      toast.success("Item adicionado ao seu pedido!");
    },
    onError: (err) => toast.error(err.message || "Erro ao adicionar item"),
  });

  const atualizarQtdMutation = trpc.pedidos.atualizarQuantidade.useMutation({
    onSuccess: () => {
      utils.pedidos.obterCarrinho.invalidate({ sessionId });
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar item"),
  });

  const removerItemMutation = trpc.pedidos.removerItem.useMutation({
    onSuccess: () => {
      utils.pedidos.obterCarrinho.invalidate({ sessionId });
      toast.info("Item removido do pedido");
    },
    onError: (err) => toast.error(err.message || "Erro ao remover item"),
  });

  const alternarTaxaMutation = trpc.pedidos.alternarTaxaGarcom.useMutation({
    onSuccess: (data) => {
      utils.pedidos.obterCarrinho.invalidate({ sessionId });
      if (data.incluiTaxaGarcom === 1) {
        toast.success("Taxa de serviço de 10% incluída!");
      } else {
        toast.info("Taxa de 10% removida do pedido.");
      }
    },
    onError: (err) => toast.error(err.message || "Erro ao alterar taxa"),
  });

  const finalizarMutation = trpc.pedidos.finalizar.useMutation({
    onSuccess: (data) => {
      setPedidoFinalizadoData(data);
      setModalConfirmacaoAberto(false);
      setCarrinhoAberto(false);
      setModalResumoAberto(true);
      toast.success("Pedido realizado com sucesso!");

      // Salva preferências locais para facilitar novo pedido
      localStorage.setItem("sabor_cliente_nome", nomeCliente);
      localStorage.setItem("sabor_cliente_mesa", numeroMesa);

      // Inicia nova sessão limpa para o cliente fazer outro pedido depois
      const novoId = resetSessionId();
      setSessionId(novoId);
      utils.pedidos.obterCarrinho.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Não foi possível finalizar o pedido.");
    },
  });

  // Totais do carrinho
  const totalItens = useMemo(() => {
    if (!carrinho?.itens) return 0;
    return carrinho.itens.reduce((acc, it) => acc + it.quantidade, 0);
  }, [carrinho]);

  const subtotalFormatado = Number(carrinho?.subtotal || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const taxaFormatada = Number(carrinho?.taxaGarcom || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const totalFormatado = Number(carrinho?.total || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const handleFinalizarClick = () => {
    if (!carrinho?.itens || carrinho.itens.length === 0) {
      toast.warning("Seu carrinho está vazio. Adicione produtos antes de finalizar!");
      return;
    }
    if (!nomeCliente.trim()) {
      toast.warning("Por favor, digite seu nome.");
      return;
    }
    if (!numeroMesa.trim()) {
      toast.warning("Por favor, informe o número da mesa.");
      return;
    }
    setModalConfirmacaoAberto(true);
  };

  const confirmarPedidoFinal = () => {
    finalizarMutation.mutate({
      sessionId,
      nomeCliente: nomeCliente.trim(),
      numeroMesa: numeroMesa.trim(),
      observacoes: observacoes.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col selection:bg-orange-600 selection:text-white transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-700 text-white flex items-center justify-center shadow-md shadow-orange-700/20">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-orange-700 dark:text-orange-500">
                Restaurante & Empório
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-serif-title tracking-tight leading-none text-stone-900 dark:text-white">
                Sabor de Casa
              </h1>
            </div>
          </div>

          {/* Table / Customer quick display */}
          <div className="hidden md:flex items-center gap-2 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full text-xs font-medium text-stone-600 dark:text-stone-300">
            <User className="w-3.5 h-3.5 text-orange-700" />
            <span>{nomeCliente || "Cliente"}</span>
            <span className="text-stone-300 dark:text-stone-600">|</span>
            <Hash className="w-3.5 h-3.5 text-orange-700" />
            <span>Mesa {numeroMesa || "1"}</span>
          </div>

          {/* Actions: Theme Toggle, Admin, Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full w-10 h-10 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800"
              title="Alternar modo claro / escuro"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-stone-600" />
              )}
            </Button>

            <Link href="/historico">
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex items-center gap-1.5 text-stone-600 dark:text-stone-300 hover:text-orange-700 text-xs font-semibold"
              >
                <Clock className="w-4 h-4" />
                Histórico
              </Button>
            </Link>

            <Link href="/admin">
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex items-center gap-1.5 text-stone-600 dark:text-stone-300 hover:text-orange-700 text-xs font-semibold"
              >
                <Settings className="w-4 h-4" />
                Painel
              </Button>
            </Link>

            {/* Cart Trigger Button */}
            <Button
              onClick={() => setCarrinhoAberto(true)}
              className="relative rounded-full bg-orange-700 hover:bg-orange-800 text-white px-4 sm:px-5 py-2 h-11 flex items-center gap-2 shadow-lg shadow-orange-700/20 active:scale-95 transition-all font-semibold"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">Meu Pedido</span>
              {totalItens > 0 && (
                <span className="bg-white text-orange-800 text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center animate-scale-in">
                  {totalItens}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-stone-900 text-white relative overflow-hidden py-10 px-4 sm:px-6">
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-stone-950 via-stone-900/90 to-transparent" />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <Badge className="bg-orange-600 text-white border-none px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              Cardápio Completo • 150 Itens
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif-title font-bold tracking-tight">
              Uma experiência gastronômica inesquecível.
            </h2>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              Explore nossos 150 pratos e bebidas distribuídos em 5 categorias selecionadas.
              Adicione os itens ao seu carrinho com cálculo em tempo real e taxa de serviço opcional.
            </p>
          </div>

          {/* Quick Client & Table Info Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl w-full md:w-80 space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-orange-300 font-bold flex items-center gap-1.5">
              <User className="w-4 h-4" /> Identificação da Mesa
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-stone-300 font-medium">Seu Nome:</label>
                <Input
                  value={nomeCliente}
                  onChange={(e) => {
                    setNomeCliente(e.target.value);
                    localStorage.setItem("sabor_cliente_nome", e.target.value);
                  }}
                  placeholder="Ex: Carlos Eduardo"
                  className="bg-stone-800/80 border-stone-700 text-white placeholder:text-stone-500 h-9 mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-stone-300 font-medium">Número da Mesa:</label>
                <Input
                  value={numeroMesa}
                  onChange={(e) => {
                    setNumeroMesa(e.target.value);
                    localStorage.setItem("sabor_cliente_mesa", e.target.value);
                  }}
                  placeholder="Ex: 12"
                  className="bg-stone-800/80 border-stone-700 text-white placeholder:text-stone-500 h-9 mt-1 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Search & Categories Bar */}
        <div className="space-y-4 mb-8">
          {/* Search Box */}
          <div className="relative max-w-xl">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou ingrediente do prato..."
              className="pl-11 pr-10 h-12 rounded-xl bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm shadow-xs focus-visible:ring-orange-600"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIAS.map((cat) => {
              const Icon = cat.icon;
              const ativa = categoriaAtiva === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 border ${
                    ativa
                      ? "bg-orange-700 text-white border-orange-700 shadow-md shadow-orange-700/20"
                      : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-stone-700 hover:bg-orange-50/50 dark:hover:bg-stone-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-200/60 dark:border-stone-800/60">
            <span>
              Exibindo <strong>{produtos.length}</strong> produtos
              {categoriaAtiva !== "TODOS" && ` em ${categoriaAtiva}`}
              {busca && ` para "${busca}"`}
            </span>
            <span>Preços em Reais (R$)</span>
          </div>
        </div>

        {/* Product Grid */}
        {carregandoProdutos ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-stone-200 dark:bg-stone-800 animate-pulse"
              />
            ))}
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 p-8">
            <Utensils className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">
              Nenhum produto encontrado
            </h3>
            <p className="text-sm text-stone-500 max-w-md mx-auto mt-1 mb-4">
              Tente buscar por outro termo ou selecione uma categoria diferente no cardápio.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setBusca("");
                setCategoriaAtiva("TODOS");
              }}
              className="rounded-full text-xs font-semibold"
            >
              Ver todos os 150 produtos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {produtos.map((produto) => {
              const precoNum = Number(produto.preco);
              const precoFormatado = precoNum.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              });

              return (
                <div
                  key={produto.id}
                  className="group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800 shadow-xs hover:shadow-xl hover:border-orange-300 dark:hover:border-stone-700 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Image with Category Badge */}
                    <div className="relative h-44 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <img
                        src={produto.imagem || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"}
                        alt={produto.nome}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback se imagem externa falhar
                          (e.target as HTMLElement).setAttribute("style", "display: none;");
                        }}
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <Badge className="bg-stone-900/80 backdrop-blur-md text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-none">
                          {produto.categoria}
                        </Badge>
                        {produto.destaque === 1 && (
                          <Badge className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 border-none flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Destaque
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5 space-y-2">
                      <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                        {produto.nome}
                      </h3>
                      <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                        {produto.descricao}
                      </p>
                    </div>
                  </div>

                  {/* Price & Add Button */}
                  <div className="p-4 sm:p-5 pt-0 flex items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-800/60 mt-3">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-stone-400 block leading-none">
                        Preço
                      </span>
                      <span className="text-lg sm:text-xl font-bold font-serif-title text-orange-800 dark:text-orange-400">
                        {precoFormatado}
                      </span>
                    </div>

                    <Button
                      onClick={() =>
                        adicionarItemMutation.mutate({
                          sessionId,
                          produtoId: produto.id,
                          quantidade: 1,
                        })
                      }
                      disabled={adicionarItemMutation.isPending}
                      className="rounded-xl bg-orange-700 hover:bg-orange-800 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 h-10 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button for Mobile when items exist */}
      {totalItens > 0 && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-30">
          <Button
            onClick={() => setCarrinhoAberto(true)}
            className="w-full bg-orange-700 hover:bg-orange-800 text-white shadow-2xl rounded-2xl h-14 flex items-center justify-between px-5 font-bold"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white text-orange-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                {totalItens}
              </span>
              <span>Ver Meu Pedido</span>
            </div>
            <span className="text-base">{totalFormatado}</span>
          </Button>
        </div>
      )}

      {/* Cart Sidebar / Drawer Modal */}
      {carrinhoAberto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setCarrinhoAberto(false)}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Cart Header */}
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-950/50 text-orange-700 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-stone-900 dark:text-stone-100">
                    Meu Pedido
                  </h2>
                  <span className="text-xs text-stone-500">
                    {totalItens} {totalItens === 1 ? "item" : "itens"} adicionados
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCarrinhoAberto(false)}
                className="rounded-full w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {carregandoCarrinho ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-20 bg-stone-100 dark:bg-stone-800 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : !carrinho?.itens || carrinho.itens.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <ShoppingCart className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto" />
                  <h4 className="font-bold text-stone-700 dark:text-stone-300">
                    Seu pedido está vazio
                  </h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    Navegue pelas categorias e adicione os pratos e bebidas que deseja pedir.
                  </p>
                </div>
              ) : (
                carrinho.itens.map((item) => {
                  const valorUnit = Number(item.valorUnitario).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  });
                  const valorTotal = Number(item.valorTotal).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  });

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 line-clamp-1">
                            {item.produto?.nome || `Produto #${item.produtoId}`}
                          </h4>
                          <span className="text-xs text-stone-500">
                            Unitário: {valorUnit}
                          </span>
                        </div>
                        <span className="font-bold font-serif-title text-sm text-orange-800 dark:text-orange-400">
                          {valorTotal}
                        </span>
                      </div>

                      {/* Controls: minus, qty, plus, delete */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 p-1">
                          <button
                            onClick={() =>
                              atualizarQtdMutation.mutate({
                                sessionId,
                                itemId: item.id,
                                quantidade: item.quantidade - 1,
                              })
                            }
                            className="w-7 h-7 flex items-center justify-center rounded text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                            title="Diminuir"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">
                            {item.quantidade}
                          </span>
                          <button
                            onClick={() =>
                              atualizarQtdMutation.mutate({
                                sessionId,
                                itemId: item.id,
                                quantidade: item.quantidade + 1,
                              })
                            }
                            className="w-7 h-7 flex items-center justify-center rounded text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                            title="Aumentar"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removerItemMutation.mutate({
                              sessionId,
                              itemId: item.id,
                            })
                          }
                          className="text-stone-400 hover:text-red-600 rounded-lg w-8 h-8"
                          title="Remover produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Footer Calculations & Checkout */}
            {carrinho?.itens && carrinho.itens.length > 0 && (
              <div className="p-5 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 space-y-4">
                {/* 10% Tip Checkbox */}
                <div className="flex items-start gap-3 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                  <Checkbox
                    id="taxa-garcom-check"
                    checked={carrinho.incluiTaxaGarcom === 1}
                    onCheckedChange={(checked) =>
                      alternarTaxaMutation.mutate({
                        sessionId,
                        incluiTaxa: Boolean(checked),
                      })
                    }
                    className="mt-0.5 data-[state=checked]:bg-orange-700 data-[state=checked]:border-orange-700"
                  />
                  <div className="space-y-0.5 text-xs">
                    <label
                      htmlFor="taxa-garcom-check"
                      className="font-bold text-stone-900 dark:text-stone-100 cursor-pointer flex items-center gap-1.5"
                    >
                      <HeartHandshake className="w-3.5 h-3.5 text-orange-700" />
                      Incluir 10% de taxa de serviço (garçom)
                    </label>
                    <p className="text-stone-500">
                      Taxa opcional destinada à equipe de atendimento ({taxaFormatada}).
                    </p>
                  </div>
                </div>

                {/* Subtotal, Tip, Total Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Subtotal dos produtos:</span>
                    <span className="font-semibold">{subtotalFormatado}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Taxa de garçom (10%):</span>
                    <span
                      className={
                        carrinho.incluiTaxaGarcom === 1
                          ? "font-semibold text-orange-700 dark:text-orange-400"
                          : "line-through text-stone-400"
                      }
                    >
                      {carrinho.incluiTaxaGarcom === 1 ? taxaFormatada : "R$ 0,00"}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-stone-900 dark:text-white pt-2 border-t border-stone-200 dark:border-stone-800">
                    <span>Total do Pedido:</span>
                    <span className="font-serif-title text-orange-800 dark:text-orange-400 text-lg">
                      {totalFormatado}
                    </span>
                  </div>
                </div>

                {/* Customer fields inside cart drawer */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-stone-500 uppercase">
                      Cliente:
                    </label>
                    <Input
                      value={nomeCliente}
                      onChange={(e) => {
                        setNomeCliente(e.target.value);
                        localStorage.setItem("sabor_cliente_nome", e.target.value);
                      }}
                      placeholder="Seu nome"
                      className="h-9 mt-0.5 text-xs bg-white dark:bg-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-500 uppercase">
                      Mesa:
                    </label>
                    <Input
                      value={numeroMesa}
                      onChange={(e) => {
                        setNumeroMesa(e.target.value);
                        localStorage.setItem("sabor_cliente_mesa", e.target.value);
                      }}
                      placeholder="Ex: 5"
                      className="h-9 mt-0.5 text-xs bg-white dark:bg-stone-900"
                    />
                  </div>
                </div>

                {/* Finalize button */}
                <Button
                  onClick={handleFinalizarClick}
                  disabled={finalizarMutation.isPending}
                  className="w-full bg-orange-700 hover:bg-orange-800 text-white rounded-xl h-12 font-bold text-sm shadow-lg shadow-orange-700/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>FINALIZAR PEDIDO</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog Before Submitting */}
      <Dialog open={modalConfirmacaoAberto} onOpenChange={setModalConfirmacaoAberto}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-stone-900">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-xl text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-700" /> Confirmar Pedido
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Revise os dados antes de enviar seu pedido para a cozinha do restaurante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-stone-50 dark:bg-stone-800/60 p-3 rounded-xl space-y-1">
              <p>
                <strong>Cliente:</strong> {nomeCliente}
              </p>
              <p>
                <strong>Mesa:</strong> {numeroMesa}
              </p>
              <p>
                <strong>Qtd de itens:</strong> {totalItens} produtos
              </p>
            </div>

            <div>
              <label className="font-bold text-stone-600 dark:text-stone-400 block mb-1">
                Observações para a cozinha (opcional):
              </label>
              <Input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Sem cebola, carne ao ponto, trazer gelo..."
                className="text-xs"
              />
            </div>

            <div className="border-t border-stone-200 dark:border-stone-800 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{subtotalFormatado}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de Garçom (10%):</span>
                <span>
                  {carrinho?.incluiTaxaGarcom === 1 ? taxaFormatada : "Não inclusa (R$ 0,00)"}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-orange-800 dark:text-orange-400 pt-1">
                <span>Total a Pagar:</span>
                <span>{totalFormatado}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setModalConfirmacaoAberto(false)}
              className="rounded-xl"
            >
              Voltar e editar
            </Button>
            <Button
              onClick={confirmarPedidoFinal}
              disabled={finalizarMutation.isPending}
              className="bg-orange-700 hover:bg-orange-800 text-white rounded-xl font-bold"
            >
              {finalizarMutation.isPending ? "Gravando pedido..." : "Confirmar e Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog After Order Completion (Section 8 requirement) */}
      <Dialog open={modalResumoAberto} onOpenChange={setModalResumoAberto}>
        <DialogContent className="max-w-lg rounded-2xl bg-white dark:bg-stone-900">
          <DialogHeader className="text-center sm:text-left">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto sm:mx-0 mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <DialogTitle className="font-serif-title text-2xl text-stone-900 dark:text-stone-100">
              Pedido Realizado com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Seu pedido foi registrado no banco de dados e enviado para preparação.
            </DialogDescription>
          </DialogHeader>

          {pedidoFinalizadoData && (
            <div className="space-y-4 py-2 text-xs">
              {/* Order Meta */}
              <div className="bg-stone-50 dark:bg-stone-800/80 p-3.5 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">
                    Número do Pedido
                  </span>
                  <span className="font-bold text-sm text-stone-800 dark:text-stone-100">
                    #{pedidoFinalizadoData.id}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">
                    Mesa
                  </span>
                  <span className="font-bold text-sm text-stone-800 dark:text-stone-100">
                    Mesa {pedidoFinalizadoData.numeroMesa}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">
                    Cliente
                  </span>
                  <span className="font-bold text-sm text-stone-800 dark:text-stone-100">
                    {pedidoFinalizadoData.nomeCliente}
                  </span>
                </div>
              </div>

              {/* Items Summary Table */}
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                <div className="bg-stone-100 dark:bg-stone-800 px-3 py-2 font-bold text-[11px] text-stone-600 dark:text-stone-300">
                  Itens do Pedido:
                </div>
                <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-48 overflow-y-auto">
                  {pedidoFinalizadoData.itens?.map((it: any) => (
                    <div
                      key={it.id}
                      className="p-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {it.quantidade}x {it.produto?.nome || `Item #${it.produtoId}`}
                        </span>
                        <span className="text-[10px] text-stone-400 block">
                          Unit: R$ {parseFloat(it.valorUnitario).toFixed(2)}
                        </span>
                      </div>
                      <span className="font-bold font-serif-title">
                        R$ {parseFloat(it.valorTotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="bg-orange-50 dark:bg-orange-950/40 p-3.5 rounded-xl border border-orange-200/60 dark:border-orange-900/40 space-y-1">
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Subtotal:</span>
                  <span>R$ {parseFloat(pedidoFinalizadoData.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>
                    Taxa Garçom 10% ({pedidoFinalizadoData.incluiTaxaGarcom === 1 ? "Inclusa" : "Dispensada"}):
                  </span>
                  <span>R$ {parseFloat(pedidoFinalizadoData.taxaGarcom).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-orange-900 dark:text-orange-300 pt-1 border-t border-orange-200 dark:border-orange-900">
                  <span>Total Final:</span>
                  <span className="font-serif-title text-base">
                    R$ {parseFloat(pedidoFinalizadoData.total).toFixed(2)}
                  </span>
                </div>
              </div>

              {pedidoFinalizadoData.observacoes && (
                <p className="text-[11px] text-stone-500 italic">
                  <strong>Observações:</strong> {pedidoFinalizadoData.observacoes}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setModalResumoAberto(false)}
              className="w-full bg-orange-700 hover:bg-orange-800 text-white rounded-xl font-bold"
            >
              Fazer Novo Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="mt-16 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-orange-700" />
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              Sabor de Casa
            </span>
            <span>— Sistema Web de Cardápio Digital com Persistência em Banco de Dados</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/historico" className="hover:text-orange-700 underline">
              Histórico de Pedidos
            </Link>
            <Link href="/admin" className="hover:text-orange-700 underline">
              Gerenciador de Produtos
            </Link>
            <a
              href="/api/v1/produtos"
              target="_blank"
              rel="noreferrer"
              className="hover:text-orange-700 underline"
            >
              API REST (JSON)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

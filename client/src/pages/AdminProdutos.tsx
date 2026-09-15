import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Package,
  Search,
  CheckCircle,
  AlertCircle,
  Tag,
  DollarSign,
  Utensils,
  Wine,
  Coffee,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const CATEGORIAS_VALIDAS = [
  "ENTRADAS",
  "PRATO PRINCIPAL",
  "SOBREMESAS",
  "BEBIDAS",
  "CARTA DE VINHOS",
] as const;

export default function AdminProdutos() {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("TODOS");
  const [modalNovoAberto, setModalNovoAberto] = useState(false);

  // Form states
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [catSelecionada, setCatSelecionada] = useState<string>("ENTRADAS");
  const [imagem, setImagem] = useState("");
  const [destaque, setDestaque] = useState(0);

  const utils = trpc.useUtils();

  const { data: produtos = [], isLoading } = trpc.produtos.listar.useQuery({
    categoria: categoria === "TODOS" ? undefined : categoria,
    busca: busca.trim() !== "" ? busca : undefined,
  });

  const criarMutation = trpc.produtos.criar.useMutation({
    onSuccess: () => {
      toast.success("Produto cadastrado com sucesso no banco de dados!");
      setModalNovoAberto(false);
      setNome("");
      setDescricao("");
      setPreco("");
      setImagem("");
      setDestaque(0);
      utils.produtos.listar.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao cadastrar produto");
    },
  });

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !descricao.trim() || !preco.trim()) {
      toast.warning("Preencha todos os campos obrigatórios");
      return;
    }

    criarMutation.mutate({
      nome: nome.trim(),
      descricao: descricao.trim(),
      preco: preco.trim().replace(",", "."),
      categoria: catSelecionada,
      imagem: imagem.trim() || undefined,
      destaque,
    });
  };

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
                Gerenciador de Produtos
              </h1>
              <p className="text-xs text-stone-500">
                Visualização e cadastro direto no banco de dados
              </p>
            </div>
          </div>

          <Button
            onClick={() => setModalNovoAberto(true)}
            className="rounded-xl bg-orange-700 hover:bg-orange-800 text-white font-semibold text-xs sm:text-sm px-4 gap-2"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Produto
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produtos cadastrados..."
              className="pl-9 text-xs h-10"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setCategoria("TODOS")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                categoria === "TODOS"
                  ? "bg-orange-700 text-white border-orange-700"
                  : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
              }`}
            >
              Todos ({produtos.length})
            </button>
            {CATEGORIAS_VALIDAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                  categoria === cat
                    ? "bg-orange-700 text-white border-orange-700"
                    : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <span className="font-bold text-sm">
              Lista de Produtos ({produtos.length})
            </span>
            <span className="text-xs text-stone-400">
              Persistidos na tabela <code>produtos</code>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 uppercase text-[10px] tracking-wider border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Preço</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      Carregando produtos do banco de dados...
                    </td>
                  </tr>
                ) : produtos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      Nenhum produto cadastrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  produtos.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-stone-400">
                        #{p.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              p.imagem ||
                              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80"
                            }
                            alt={p.nome}
                            className="w-10 h-10 rounded-lg object-cover bg-stone-100 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-stone-900 dark:text-stone-100">
                              {p.nome}
                            </div>
                            <div className="text-stone-400 line-clamp-1 max-w-md">
                              {p.descricao}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-bold uppercase"
                        >
                          {p.categoria}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold font-serif-title text-sm text-orange-800 dark:text-orange-400">
                        R$ {parseFloat(p.preco).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle className="w-3 h-3" /> Ativo
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Novo Produto */}
      <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
        <DialogContent className="max-w-md bg-white dark:bg-stone-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif-title text-xl">
              Cadastrar Novo Produto
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione um item diretamente à base de dados do restaurante.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Nome do Produto *
              </label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Risoto de Frutos do Mar"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Categoria *
              </label>
              <select
                value={catSelecionada}
                onChange={(e) => setCatSelecionada(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs font-semibold"
              >
                {CATEGORIAS_VALIDAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Preço em Reais (R$) *
              </label>
              <Input
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="Ex: 48.50"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Descrição Curta *
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                placeholder="Descreva os ingredientes e diferenciais do prato..."
                className="w-full p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                URL da Imagem (opcional)
              </label>
              <Input
                value={imagem}
                onChange={(e) => setImagem(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovoAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={criarMutation.isPending}
                className="bg-orange-700 hover:bg-orange-800 text-white font-bold"
              >
                {criarMutation.isPending ? "Salvando..." : "Salvar no Banco"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

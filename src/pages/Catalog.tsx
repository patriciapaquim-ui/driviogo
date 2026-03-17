import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VehicleCard from "@/components/VehicleCard";
import { Search, SlidersHorizontal } from "lucide-react";
import { usePublicVehicleList } from "@/hooks/usePublicVehicles";

const Catalog = () => {
  const { data: allVehicles = [], isLoading } = usePublicVehicleList();

  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [maxPrice, setMaxPrice] = useState(10000);
  const [showFilters, setShowFilters] = useState(false);

  const brands = useMemo(() => [...new Set(allVehicles.map((v) => v.brand))], [allVehicles]);
  const bodyTypes = useMemo(() => [...new Set(allVehicles.map((v) => v.bodyType))], [allVehicles]);

  const filtered = useMemo(() => {
    return allVehicles.filter((v) => {
      const matchSearch =
        !search ||
        `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase());
      const matchBrand = !brand || v.brand === brand;
      const matchBody = !bodyType || v.bodyType === bodyType;
      const matchPrice = !v.basePrice || v.basePrice <= maxPrice;
      return matchSearch && matchBrand && matchBody && matchPrice;
    });
  }, [allVehicles, search, brand, bodyType, maxPrice]);

  const selectClass =
    "rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pb-16 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-4xl font-bold text-foreground">Catálogo</h1>
          <p className="mt-2 text-muted-foreground">
            Encontre o veículo perfeito para sua assinatura.
          </p>
        </motion.div>

        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por marca ou modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                showFilters
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" /> Filtros
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-wrap gap-4 rounded-xl border border-border bg-card p-5"
            >
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={selectClass}
              >
                <option value="">Todas as marcas</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className={selectClass}
              >
                <option value="">Todos os tipos</option>
                {bodyTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground">Até R$ {maxPrice.toLocaleString("pt-BR")}/mês</label>
                <input
                  type="range"
                  min={2000}
                  max={10000}
                  step={100}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="accent-primary"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} index={i} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground">
              Nenhum veículo encontrado com os filtros selecionados.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Catalog;

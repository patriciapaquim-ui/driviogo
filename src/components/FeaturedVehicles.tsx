import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import VehicleCard from "./VehicleCard";
import { usePublicVehicleList } from "@/hooks/usePublicVehicles";

const FeaturedVehicles = () => {
  const { data: vehicles = [], isLoading } = usePublicVehicleList();
  const featured = vehicles.filter((v) => v.available).slice(0, 3);

  if (isLoading) {
    return (
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="mb-12 h-16 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 flex items-end justify-between"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Destaques
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold text-foreground">
              Veículos em destaque
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="hidden items-center gap-2 text-sm font-semibold text-primary transition-all hover:gap-3 md:flex"
          >
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((v, i) => (
            <VehicleCard key={v.id} vehicle={v} index={i} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            Ver todos os veículos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedVehicles;

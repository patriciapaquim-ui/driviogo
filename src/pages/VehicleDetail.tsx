import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Fuel, Settings, Gauge, Box, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SubscriptionSimulator from "@/components/SubscriptionSimulator";
import { usePublicVehicle } from "@/hooks/usePublicVehicles";
import { useVehiclePricing } from "@/hooks/usePublicPricing";
import { useBestVehicleDiscount } from "@/hooks/usePublicDiscounts";

const VehicleDetail = () => {
  const { id } = useParams();
  const { data: vehicle, isLoading } = usePublicVehicle(id);
  const { data: pricingPeriods = [] } = useVehiclePricing(vehicle?.id);
  const discount = useBestVehicleDiscount(vehicle?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 pb-16 pt-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
            <div className="space-y-6">
              <div className="aspect-[16/10] w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="h-96 animate-pulse rounded-xl bg-muted" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-foreground">Veículo não encontrado</h1>
            <Link to="/catalogo" className="mt-4 inline-block text-primary hover:underline">
              Voltar ao catálogo
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const specItems = [
    vehicle.specs.engine && { icon: Settings, label: "Motor", value: vehicle.specs.engine },
    vehicle.specs.power && { icon: Gauge, label: "Potência", value: vehicle.specs.power },
    vehicle.specs.transmission && { icon: Settings, label: "Câmbio", value: vehicle.specs.transmission },
    vehicle.specs.fuel && { icon: Fuel, label: "Combustível", value: vehicle.specs.fuel },
    vehicle.specs.consumption && { icon: Fuel, label: "Consumo", value: vehicle.specs.consumption },
    vehicle.specs.trunk && { icon: Box, label: "Porta-malas", value: vehicle.specs.trunk },
    vehicle.specs.seats && { icon: Users, label: "Lugares", value: `${vehicle.specs.seats}` },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pb-16 pt-28">
        <Link
          to="/catalogo"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
          {/* Left: Info */}
          <div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="overflow-hidden rounded-xl">
                <img
                  src={vehicle.image}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-8"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {vehicle.brand}
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold text-foreground md:text-4xl">
                {vehicle.model}{" "}
                <span className="text-muted-foreground">{vehicle.year}</span>
              </h1>
              {!vehicle.available && (
                <span className="mt-3 inline-block rounded-full bg-destructive/10 px-4 py-1 text-xs font-semibold text-destructive">
                  Indisponível no momento
                </span>
              )}
              {vehicle.description && (
                <p className="mt-4 text-muted-foreground">{vehicle.description}</p>
              )}
            </motion.div>

            {/* Specs */}
            {specItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-10"
              >
                <h2 className="mb-4 font-display text-xl font-bold text-foreground">
                  Ficha Técnica
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {specItems.map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-medium text-foreground">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Features */}
            {vehicle.features.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-10"
              >
                <h2 className="mb-4 font-display text-xl font-bold text-foreground">
                  Itens de Série
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {vehicle.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Optionals */}
            {vehicle.optionals.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-10"
              >
                <h2 className="mb-4 font-display text-xl font-bold text-foreground">Opcionais</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {vehicle.optionals.map((o) => (
                    <div key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 shrink-0 text-gold-dark" />
                      {o}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Simulator */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SubscriptionSimulator vehicle={vehicle} pricingPeriods={pricingPeriods} discount={discount} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VehicleDetail;

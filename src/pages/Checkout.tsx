import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Car, User, FileText, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { vehicles } from "@/data/vehicles";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepReview from "@/components/checkout/StepReview";
import StepPersonal, { type ProfileForm, type DocUrls } from "@/components/checkout/StepPersonal";
import StepContract from "@/components/checkout/StepContract";
import StepPayment from "@/components/checkout/StepPayment";
import StepConfirmation from "@/components/checkout/StepConfirmation";

const periods = [
  { months: 12, label: "12 meses", factor: 1.15 },
  { months: 24, label: "24 meses", factor: 1.0 },
  { months: 36, label: "36 meses", factor: 0.9 },
];

const mileages = [
  { km: 1000, label: "1.000 km/mês", factor: 0 },
  { km: 2000, label: "2.000 km/mês", factor: 350 },
  { km: 3000, label: "3.000 km/mês", factor: 650 },
];

const STEPS = [
  { id: "review", label: "Plano", icon: Car },
  { id: "personal", label: "Dados & Docs", icon: User },
  { id: "contract", label: "Contrato", icon: FileText },
  { id: "payment", label: "Pagamento", icon: CreditCard },
  { id: "confirm", label: "Confirmação", icon: Check },
];

const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const vehicleId = params.get("vehicle");
  const periodIdx = Number(params.get("period") ?? 1);
  const mileageIdx = Number(params.get("mileage") ?? 0);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const period = periods[periodIdx] ?? periods[1];
  const mileage = mileages[mileageIdx] ?? mileages[0];
  const price = vehicle ? Math.round(vehicle.basePrice * period.factor + mileage.factor) : 0;

  const [step, setStep] = useState(0);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    full_name: "", phone: "", cpf: "", cnh: "",
    address_street: "", address_city: "", address_state: "", address_zip: "",
  });
  const [docUrls, setDocUrls] = useState<DocUrls>({
    doc_cnh_url: "", doc_income_url: "", doc_residence_url: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signedContract, setSignedContract] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [authLoading, user, navigate]);

  // Load existing profile
  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
        if (data) {
          setProfileForm({
            full_name: data.full_name || "",
            phone: data.phone || "",
            cpf: data.cpf || "",
            cnh: data.cnh || "",
            address_street: data.address_street || "",
            address_city: data.address_city || "",
            address_state: data.address_state || "",
            address_zip: data.address_zip || "",
          });
          setDocUrls({
            doc_cnh_url: (data as any).doc_cnh_url || "",
            doc_income_url: (data as any).doc_income_url || "",
            doc_residence_url: (data as any).doc_residence_url || "",
          });
        }
      });
    }
  }, [user]);

  if (!vehicle) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-foreground">Veículo não encontrado</h1>
            <Link to="/catalogo" className="mt-4 inline-block text-primary hover:underline">Voltar ao catálogo</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isPersonalComplete =
    profileForm.full_name && profileForm.phone && profileForm.cpf && profileForm.cnh &&
    profileForm.address_street && profileForm.address_city && profileForm.address_state && profileForm.address_zip;

  const isDocsComplete = docUrls.doc_cnh_url && docUrls.doc_income_url && docUrls.doc_residence_url;

  const canAdvance = () => {
    if (step === 0) return true;
    if (step === 1) return !!isPersonalComplete && !!isDocsComplete;
    if (step === 2) return acceptedTerms && signedContract;
    if (step === 3) return !!paymentMethod;
    return false;
  };

  const handleSubmit = async () => {
    if (!user || !vehicle) return;
    setSubmitting(true);

    // Save profile + doc URLs
    await supabase.from("profiles").update({
      ...profileForm,
      doc_cnh_url: docUrls.doc_cnh_url,
      doc_income_url: docUrls.doc_income_url,
      doc_residence_url: docUrls.doc_residence_url,
      updated_at: new Date().toISOString(),
    } as any).eq("user_id", user.id);

    if (paymentMethod === "credit_card") {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          vehicleName: vehicle.model,
          vehicleBrand: vehicle.brand,
          vehicleImage: vehicle.image,
          periodMonths: period.months,
          mileageKm: mileage.km,
          monthlyPrice: price,
        },
      });

      if (error || !data?.url) {
        toast({
          title: "Erro ao iniciar pagamento",
          description: error?.message || "Não foi possível criar a sessão de pagamento.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      await supabase.from("subscriptions").insert({
        user_id: user.id,
        vehicle_name: vehicle.model,
        vehicle_brand: vehicle.brand,
        vehicle_image: vehicle.image,
        period_months: period.months,
        mileage_km: mileage.km,
        monthly_price: price,
        status: "pending",
      });

      window.location.href = data.url;
      return;
    }

    // For boleto/pix
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      vehicle_name: vehicle.model,
      vehicle_brand: vehicle.brand,
      vehicle_image: vehicle.image,
      period_months: period.months,
      mileage_km: mileage.km,
      monthly_price: price,
      status: "pending",
    });

    if (error) {
      toast({ title: "Erro ao criar assinatura", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setCompleted(true);
    setStep(4);
    setSubmitting(false);
  };

  const next = () => {
    if (step === 3) {
      handleSubmit();
    } else {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  const prev = () => {
    if (step === 0) {
      // Go back to vehicle detail to edit selections
      navigate(`/veiculo/${vehicle.id}`);
    } else {
      setStep((s) => Math.max(s - 1, 0));
    }
  };

  const progressPercent = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pb-16 pt-28">
        <Link to={`/veiculo/${vehicle.id}`} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar ao veículo
        </Link>

        {/* Stepper */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={s.id} className="flex flex-1 flex-col items-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isDone ? "border-primary bg-primary text-primary-foreground"
                    : isActive ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                  }`}>
                    {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`mt-2 hidden text-xs font-medium sm:block ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && <StepReview vehicle={vehicle} period={period} mileage={mileage} price={price} />}
            {step === 1 && user && (
              <StepPersonal
                form={profileForm}
                setForm={setProfileForm}
                docs={docUrls}
                setDocs={setDocUrls}
                userId={user.id}
              />
            )}
            {step === 2 && (
              <StepContract
                vehicle={vehicle}
                period={period}
                mileage={mileage}
                price={price}
                accepted={acceptedTerms}
                setAccepted={setAcceptedTerms}
                signed={signedContract}
                setSigned={setSignedContract}
              />
            )}
            {step === 3 && <StepPayment method={paymentMethod} setMethod={setPaymentMethod} />}
            {step === 4 && <StepConfirmation vehicle={vehicle} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {!completed && (
          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" onClick={prev}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {step === 0 ? "Editar seleção" : "Voltar"}
            </Button>
            <Button onClick={next} disabled={!canAdvance() || submitting}>
              {submitting ? "Processando..." : step === 3 ? "Confirmar assinatura" : step === 0 ? "Confirmar e prosseguir" : "Continuar"}
              {!submitting && step < 3 && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;

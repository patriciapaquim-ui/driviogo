import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, CreditCard, User, LogOut, CalendarDays, Gauge, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  vehicle_name: string;
  vehicle_brand: string;
  vehicle_image: string | null;
  period_months: number;
  mileage_km: number;
  monthly_price: number;
  status: string;
  start_date: string;
  end_date: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string | null;
}

interface Profile {
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  cnh: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativa", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  expired: { label: "Expirada", variant: "outline" },
};

const paymentStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Pago", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  failed: { label: "Falhou", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "outline" },
};

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Profile>({
    full_name: "", phone: "", cpf: "", cnh: "",
    address_street: "", address_city: "", address_state: "", address_zip: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const [{ data: profileData }, { data: subsData }, { data: paymentsData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user!.id).single(),
      supabase.from("subscriptions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("payment_history").select("*, subscriptions!inner(user_id)").order("payment_date", { ascending: false }),
    ]);

    if (profileData) {
      setProfile(profileData);
      setProfileForm(profileData);
    }
    setSubscriptions((subsData as Subscription[]) || []);
    setPayments((paymentsData as Payment[]) || []);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        cpf: profileForm.cpf,
        cnh: profileForm.cnh,
        address_street: profileForm.address_street,
        address_city: profileForm.address_city,
        address_state: profileForm.address_state,
        address_zip: profileForm.address_zip,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user!.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
      setProfile(profileForm);
      setEditingProfile(false);
    }
    setSaving(false);
  };

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const activeSubscription = subscriptions.find((s) => s.status === "active");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 glass">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Car className="h-7 w-7 text-primary" />
            <span className="font-display text-xl font-bold text-foreground">
              Drive<span className="text-primary">Sub</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-1 font-display text-3xl font-bold text-foreground">
            Olá, {profile?.full_name || "Cliente"}
          </h1>
          <p className="mb-8 text-muted-foreground">Gerencie sua assinatura e dados pessoais</p>

          {/* Active subscription highlight */}
          {activeSubscription && (
            <Card className="mb-8 border-primary/30 bg-gradient-to-r from-card to-secondary">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Car className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Veículo atual</p>
                    <h3 className="text-lg font-semibold text-foreground">
                      {activeSubscription.vehicle_brand} {activeSubscription.vehicle_name}
                    </h3>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {activeSubscription.period_months} meses
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gauge className="h-4 w-4" />
                    {activeSubscription.mileage_km.toLocaleString("pt-BR")} km/mês
                  </div>
                  <div className="text-lg font-bold text-primary">
                    R$ {activeSubscription.monthly_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="subscriptions" className="space-y-6">
            <TabsList className="bg-secondary">
              <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
              <TabsTrigger value="payments">Pagamentos</TabsTrigger>
              <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
            </TabsList>

            {/* Subscriptions tab */}
            <TabsContent value="subscriptions">
              {subscriptions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-4 py-12">
                    <Clock className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Você ainda não tem assinaturas</p>
                    <Button asChild>
                      <Link to="/catalogo">
                        Explorar catálogo <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {subscriptions.map((sub) => (
                    <Card key={sub.id}>
                      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {sub.vehicle_brand} {sub.vehicle_name}
                            </h3>
                            <Badge variant={statusMap[sub.status]?.variant || "secondary"}>
                              {statusMap[sub.status]?.label || sub.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {sub.period_months} meses · {sub.mileage_km.toLocaleString("pt-BR")} km/mês · Início: {new Date(sub.start_date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-primary">
                          R$ {sub.monthly_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Payments tab */}
            <TabsContent value="payments">
              {payments.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-4 py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum pagamento registrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {payments.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium text-foreground">
                            R$ {p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(p.payment_date).toLocaleDateString("pt-BR")}
                            {p.payment_method && ` · ${p.payment_method}`}
                          </p>
                        </div>
                        <Badge variant={paymentStatusMap[p.status]?.variant || "secondary"}>
                          {paymentStatusMap[p.status]?.label || p.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Profile tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" /> Dados Pessoais
                  </CardTitle>
                  {!editingProfile && (
                    <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                      Editar
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {editingProfile ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-muted-foreground">Nome completo</label>
                        <Input value={profileForm.full_name || ""} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="bg-secondary" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-muted-foreground">Telefone</label>
                        <Input value={profileForm.phone || ""} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="bg-secondary" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-muted-foreground">CPF</label>
                        <Input value={profileForm.cpf || ""} onChange={(e) => setProfileForm({ ...profileForm, cpf: e.target.value })} className="bg-secondary" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-muted-foreground">CNH</label>
                        <Input value={profileForm.cnh || ""} onChange={(e) => setProfileForm({ ...profileForm, cnh: e.target.value })} className="bg-secondary" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm text-muted-foreground">Endereço</label>
                        <Input value={profileForm.address_street || ""} onChange={(e) => setProfileForm({ ...profileForm, address_street: e.target.value })} placeholder="Rua, número" className="bg-secondary" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-muted-foreground">Cidade</label>
                        <Input value={profileForm.address_city || ""} onChange={(e) => setProfileForm({ ...profileForm, address_city: e.target.value })} className="bg-secondary" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-muted-foreground">Estado</label>
                        <Input value={profileForm.address_state || ""} onChange={(e) => setProfileForm({ ...profileForm, address_state: e.target.value })} className="bg-secondary" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-muted-foreground">CEP</label>
                        <Input value={profileForm.address_zip || ""} onChange={(e) => setProfileForm({ ...profileForm, address_zip: e.target.value })} className="bg-secondary" />
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <Button onClick={handleSaveProfile} disabled={saving}>
                          {saving ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button variant="outline" onClick={() => { setEditingProfile(false); setProfileForm(profile!); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ProfileField label="Nome" value={profile?.full_name} />
                      <ProfileField label="E-mail" value={user?.email} />
                      <ProfileField label="Telefone" value={profile?.phone} />
                      <ProfileField label="CPF" value={profile?.cpf} />
                      <ProfileField label="CNH" value={profile?.cnh} />
                      <ProfileField label="Endereço" value={profile?.address_street} />
                      <ProfileField label="Cidade" value={profile?.address_city} />
                      <ProfileField label="Estado" value={profile?.address_state} />
                      <ProfileField label="CEP" value={profile?.address_zip} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

const ProfileField = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium text-foreground">{value || "—"}</p>
  </div>
);

export default Dashboard;

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DocumentUpload from "./DocumentUpload";

export interface ProfileForm {
  full_name: string;
  phone: string;
  cpf: string;
  cnh: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}

export interface DocUrls {
  doc_cnh_url: string;
  doc_income_url: string;
  doc_residence_url: string;
}

interface Props {
  form: ProfileForm;
  setForm: (f: ProfileForm) => void;
  docs: DocUrls;
  setDocs: (d: DocUrls) => void;
  userId: string;
}

const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="mb-1 block text-sm text-muted-foreground">{label}</label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-secondary" />
  </div>
);

const StepPersonal = ({ form, setForm, docs, setDocs, userId }: Props) => {
  const update = (field: keyof ProfileForm, value: string) => setForm({ ...form, [field]: value });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground">Para prosseguir, informe seus dados e anexe os documentos</h2>
        <p className="mt-2 text-muted-foreground">Precisamos dessas informações para formalizar o contrato de assinatura.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-6 font-display text-lg font-bold text-foreground">Dados pessoais</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo *" value={form.full_name} onChange={(v) => update("full_name", v)} />
            <Field label="Telefone *" value={form.phone} onChange={(v) => update("phone", v)} placeholder="(11) 99999-0000" />
            <Field label="CPF *" value={form.cpf} onChange={(v) => update("cpf", v)} placeholder="000.000.000-00" />
            <Field label="CNH *" value={form.cnh} onChange={(v) => update("cnh", v)} placeholder="Número da habilitação" />
            <div className="sm:col-span-2">
              <Field label="Endereço *" value={form.address_street} onChange={(v) => update("address_street", v)} placeholder="Rua, número, complemento" />
            </div>
            <Field label="Cidade *" value={form.address_city} onChange={(v) => update("address_city", v)} />
            <Field label="Estado *" value={form.address_state} onChange={(v) => update("address_state", v)} />
            <Field label="CEP *" value={form.address_zip} onChange={(v) => update("address_zip", v)} placeholder="00000-000" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-2 font-display text-lg font-bold text-foreground">Documentos obrigatórios</h3>
          <p className="mb-6 text-sm text-muted-foreground">Envie fotos ou PDFs legíveis (máx. 10MB cada).</p>
          <div className="space-y-4">
            <DocumentUpload
              label="CNH (Carteira Nacional de Habilitação)"
              description="Frente e verso ou CNH digital em PDF"
              userId={userId}
              docType="cnh"
              currentUrl={docs.doc_cnh_url}
              onUploaded={(url) => setDocs({ ...docs, doc_cnh_url: url })}
            />
            <DocumentUpload
              label="Comprovante de Renda"
              description="Holerite, declaração de IR ou extrato bancário recente"
              userId={userId}
              docType="income"
              currentUrl={docs.doc_income_url}
              onUploaded={(url) => setDocs({ ...docs, doc_income_url: url })}
            />
            <DocumentUpload
              label="Comprovante de Residência"
              description="Conta de luz, água, telefone ou correspondência bancária (últimos 90 dias)"
              userId={userId}
              docType="residence"
              currentUrl={docs.doc_residence_url}
              onUploaded={(url) => setDocs({ ...docs, doc_residence_url: url })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StepPersonal;

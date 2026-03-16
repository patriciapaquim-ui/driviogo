import { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  label: string;
  description: string;
  userId: string;
  docType: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

const DocumentUpload = ({ label, description, userId, docType, currentUrl, onUploaded }: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 10MB.", variant: "destructive" });
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Envie JPG, PNG, WebP ou PDF.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/${docType}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("user-documents").upload(path, file, { upsert: true });

    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("user-documents").getPublicUrl(path);
    // Since bucket is private, we store the path for signed URL generation later
    onUploaded(path);
    setFileName(file.name);
    setUploading(false);
  };

  const handleRemove = () => {
    setFileName(null);
    onUploaded("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const isUploaded = !!currentUrl || !!fileName;

  return (
    <div className={`rounded-xl border-2 border-dashed p-5 transition-all ${
      isUploaded ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30 hover:border-primary/20"
    }`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
          isUploaded ? "bg-primary/10" : "bg-muted"
        }`}>
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : isUploaded ? (
            <CheckCircle className="h-5 w-5 text-primary" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          {fileName && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-primary">{fileName}</span>
              <button onClick={handleRemove} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button
            type="button"
            variant={isUploaded ? "outline" : "secondary"}
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1 h-3.5 w-3.5" />
            )}
            {isUploaded ? "Trocar" : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;

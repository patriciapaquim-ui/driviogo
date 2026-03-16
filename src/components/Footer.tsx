import { Link } from "react-router-dom";
import { Car } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Link to="/" className="flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-bold text-foreground">
              Drive<span className="text-primary">Sub</span>
            </span>
          </Link>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Início</Link>
            <Link to="/catalogo" className="hover:text-primary">Catálogo</Link>
            <a href="/#faq" className="hover:text-primary">FAQ</a>
            <a href="/#contato" className="hover:text-primary">Contato</a>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} DriveSub. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

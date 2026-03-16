import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedVehicles from "@/components/FeaturedVehicles";
import HowItWorks from "@/components/HowItWorks";
import CostComparisonCalculator from "@/components/CostComparisonCalculator";
import FAQ from "@/components/FAQ";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <FeaturedVehicles />
      <HowItWorks />
      <CostComparisonCalculator />
      <FAQ />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;

import HeroSection from "@/components/landing/HeroSection";
import FeaturesStrip from "@/components/landing/FeaturesStrip";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyParentsChoose from "@/components/landing/WhyParentsChoose";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import DashboardRedirectGuard from "@/components/landing/DashboardRedirectGuard";

export default function Home() {
  return (
    <main>
      <DashboardRedirectGuard />
      <HeroSection />
      <FeaturesStrip />
      <HowItWorks />
      <WhyParentsChoose />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
import Hero from "@/components/landing/Hero";
import { FeatureGrid, ComparisonTable, FormatShowcase, CTABand, Footer } from "@/components/landing/Sections";

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <FormatShowcase />
      <ComparisonTable />
      <CTABand />
      <Footer />
    </>
  );
}

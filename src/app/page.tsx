import { Nav } from "./landing/nav";
import { HeroSection } from "./landing/hero";
import { Marquee } from "./landing/marquee";
import { HowItWorks } from "./landing/how-it-works";
import { FeaturesSection } from "./landing/features";
import { StackSection } from "./landing/stack";
import { CTABanner } from "./landing/cta-banner";
import { Footer } from "./landing/footer";
import { PipelineSection } from "./landing/pipeline";
import { AgentLogSection } from "./landing/agent-log";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main>
        <HeroSection />
        <Marquee />
        <HowItWorks />
        <PipelineSection />
        <AgentLogSection />
        <FeaturesSection />
        <StackSection />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}

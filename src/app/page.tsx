import { Nav } from "./landing/nav";
import { HeroSection } from "./landing/hero";
import { Marquee } from "./landing/marquee";
import { HowItWorks, FeaturesSection, StackSection, Footer } from "./landing/sections";
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
      </main>
      <Footer />
    </div>
  );
}

import HeroTracking from "@/components/sections/HeroTracking";
import Services from "@/components/sections/Services";
import WhySkoro from "@/components/sections/WhySkoro";
import Reviews from "@/components/sections/Reviews";
import MarqueeTicker from "@/components/ornaments/MarqueeTicker";

export default function Home() {
  return (
    <>
      <HeroTracking />
      <MarqueeTicker />
      <Services />
      <WhySkoro />
      <Reviews />
    </>
  );
}

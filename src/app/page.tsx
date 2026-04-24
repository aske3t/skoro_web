import HeroTracking from "@/components/sections/HeroTracking";
import Services from "@/components/sections/Services";
import WhySkoro from "@/components/sections/WhySkoro";
import Cooperation from "@/components/sections/Cooperation";
import Reviews from "@/components/sections/Reviews";
import ContactForm from "@/components/sections/ContactForm";
import MarqueeTicker from "@/components/ornaments/MarqueeTicker";

export default function Home() {
  return (
    <>
      <HeroTracking />
      <MarqueeTicker />
      <Services />
      <WhySkoro />
      <Cooperation />
      <Reviews />
      <ContactForm />
    </>
  );
}

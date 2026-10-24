import HeroTracking from "@/components/sections/HeroTracking";
import Services from "@/components/sections/Services";
import WhySkoro from "@/components/sections/WhySkoro";
import Tariffs from "@/components/sections/Tariffs";
import Cooperation from "@/components/sections/Cooperation";
import Promotions from "@/components/sections/Promotions";
import ContactForm from "@/components/sections/ContactForm";
import MarqueeTicker from "@/components/ornaments/MarqueeTicker";
import Abons from "@/components/sections/Abons"
import Individual from "@/components/sections/Individual";
export default function Home() {
  return (
    <>
      <HeroTracking />
      <MarqueeTicker />
      <Services />
      <WhySkoro />
      <Tariffs />
      <Abons />
      <Individual />
      <Cooperation />
      <Promotions />
      <ContactForm />
    </>
  );
}

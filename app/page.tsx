import { SignedIn, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/pricing";
import { CTA } from "@/components/landing/cta";

export default function Home() {
  return (
    <main className= "min-h-screen bg-white dark:bg-black">
     <Hero />
     <Features />
     <HowItWorks />

     <SignedIn>
      <div className="fixed top-4 right-4">  
        <UserButton/>
      </div>
     </SignedIn>

     <Pricing />
     <CTA />
    </main>
  );
}

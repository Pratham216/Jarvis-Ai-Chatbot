import { currentUser } from "@clerk/nextjs/server";
import SmoothScroll from "@/components/landing/SmoothScroll";
import ParticleField from "@/components/landing/ParticleField";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import ChatReveal from "@/components/landing/ChatReveal";
import Features from "@/components/landing/Features";
import Process from "@/components/landing/Process";
import DashboardPreview from "@/components/landing/DashboardPreview";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await currentUser();
  const isSignedIn = !!user;
  return (
    <SmoothScroll>
      <div className="relative min-h-screen bg-black text-white [overflow-x:clip]">
        {/* Page-wide interactive particle field. Fixed to the viewport so
            it stays interactive on every section as the user scrolls. */}
        <ParticleField />

        {/* Ensure all real content sits above the fixed canvas */}
        <div className="relative z-10">
          <Nav isSignedIn={isSignedIn} />
          <Hero isSignedIn={isSignedIn} />
          <ChatReveal />
          <Features />
          <Process />
          <DashboardPreview />
          <CTA isSignedIn={isSignedIn} />
          <Footer />
        </div>
      </div>
    </SmoothScroll>
  );
}

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import WhoItsFor from "@/components/landing/WhoItsFor";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text-body">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <WhoItsFor />
      </main>
      <Footer />
    </div>
  );
}


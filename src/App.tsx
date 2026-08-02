import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import Navbar from "./components/Navbar";
import BusinessLifecyclePortal from "./components/BusinessLifecyclePortal";
import { About } from "./components/About";
import BusinessUnits from "./components/BusinessUnits";
import Services from "./components/Services";
import Environment from "./components/Environment";
import Gallery from "./components/Gallery";
import VideoShowcase from "./components/VideoShowcase";
import { Footer } from "./components/Contact";
import Strip from "./components/About";
import Dashboard from "./components/Dashboard";

function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <BusinessLifecyclePortal />
        <Environment />
        <Services />
        <Strip />
        <About />
        <BusinessUnits />
        <VideoShowcase />
        <Gallery />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <div className="min-h-screen font-sans">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard/mill" element={<Dashboard defaultValue="mill" />} />
            <Route path="/dashboard/seedling" element={<Dashboard defaultValue="seedling" />} />
            <Route path="/dashboard/erp" element={<Dashboard defaultValue="erp" />} />
            {/* Fallback */}
            <Route path="/dashboard" element={<Dashboard defaultValue="mill" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </LanguageProvider>
  );
}


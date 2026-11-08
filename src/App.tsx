
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from 'framer-motion';
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Map from "./pages/Map";
import EmbedMap from "./pages/EmbedMap";
import Contact from "./pages/Contact"
import NotFound from "./pages/NotFound";
import AboutPage from "./pages/AboutPage";
import NetworkHealth from "./pages/NetworkHealth";
import { useEffect } from "react";
import ScrollToTop from "./components/ScrollToTop";
// import Soundscape from './components/Soundscape';

const queryClient = new QueryClient();

const App = () => {
  // Dashboard default is light; individual routes (e.g. EmbedMap) can
  // apply the .dark class on mount if the host page needs dark mode.

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" closeButton richColors />
        {/* <Soundscape /> */}
        <BrowserRouter>
        <ScrollToTop />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/map" element={<Map />} />
              <Route path="/embed/map" element={<EmbedMap />} />
              <Route path="*" element={<NotFound />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/network" element={<NetworkHealth />} />
            </Routes>
          </AnimatePresence>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

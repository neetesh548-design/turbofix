import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LanguageGate from '../components/LanguageGate';
import SkipLink from '../components/SkipLink';
import PublicSiteDebugMonitor from '../components/PublicSiteDebugMonitor';

export default function MainLayout({ children }) {
  return (
    <>
      <PublicSiteDebugMonitor />
      <SkipLink />
      <Navbar />
      <LanguageGate />
      <main id="main-content">
        {children}
      </main>
      <Footer />
    </>
  );
}

import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LanguageGate from '../components/LanguageGate';

export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <LanguageGate />
      <main id="top">
        {children}
      </main>
      <Footer />
    </>
  );
}

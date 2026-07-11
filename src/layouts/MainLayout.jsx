import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <main id="top">
        {children}
      </main>
      <Footer />
    </>
  );
}

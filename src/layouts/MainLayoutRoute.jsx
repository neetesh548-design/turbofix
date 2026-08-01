import React from 'react';
import { Outlet } from 'react-router-dom';
import MainLayout from './MainLayout';

export default function MainLayoutRoute() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

/**
 * Layout pour les pages d'authentification
 * Pages publiques : login, signup, email verification, etc.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Outlet />
    </div>
  );
};

export default AuthLayout;

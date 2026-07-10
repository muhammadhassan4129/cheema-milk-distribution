/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TransactionProvider } from './contexts/TransactionContext';
import { MilkTransactionProvider } from './contexts/MilkTransactionContext';
import { LabProvider } from './contexts/LabContext';
import { AccountProvider } from './contexts/AccountContext';
import { UserProvider } from './contexts/UserContext';
import { VehicleProvider } from './contexts/VehicleContext';
import { RouteProvider } from './contexts/RouteContext';
import { RouteCollectionProvider } from './contexts/RouteCollectionContext';
import { AdvanceProvider } from './contexts/AdvanceContext';
import { DispatchProvider } from './contexts/DispatchContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Login from './screens/Login';
import SplashCelebration from './components/SplashCelebration';
import { isOnline } from './services/api';

// Admin Screens
import AdminDashboard from './screens/admin/AdminDashboard';
import UserManagement from './screens/admin/UserManagement';
import VehicleManagement from './screens/admin/VehicleManagement';
import AdminPnL from './screens/admin/AdminPnL';
import RouteManagement from './screens/admin/RouteManagement';
import AdminRouteCollections from './screens/admin/AdminRouteCollections';
import AdminAdvances from './screens/admin/AdminAdvances';
import AdminDriverReports from './screens/admin/AdminDriverReports';
import AdminLabReports from './screens/admin/AdminLabReports';
import AdminAccountReports from './screens/admin/AdminAccountReports';
import AdminDispatch from './screens/admin/AdminDispatch';

// Driver Screens
import DriverDashboard from './screens/driver/DriverDashboard';
import SaleEntry from './screens/driver/SaleEntry';
import PurchaseEntry from './screens/driver/PurchaseEntry';
import RoutePanel from './screens/driver/RoutePanel';
import DriverRouteCollection from './screens/driver/DriverRouteCollection';
import DriverAdvances from './screens/driver/DriverAdvances';

// Accountant Screens
import AccountantDashboard from './screens/accountant/AccountantDashboard';
import MilkPurchases from './screens/accountant/MilkPurchases';
import MilkSales from './screens/accountant/MilkSales';
import ExpenseEntry from './screens/accountant/ExpenseEntry';
import AccountantAdvances from './screens/accountant/AccountantAdvances';
import AccountantReports from './screens/accountant/AccountantReports';
import FinancialOverview from './screens/accountant/FinancialOverview';
import PurchaseLedger from './screens/accountant/PurchaseLedger';
import SaleLedger from './screens/accountant/SaleLedger';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Tab visible hone pe foran sync — Admin ne kuch add kiya toh Accountant ko turant dikhega
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isOnline()) {
        window.dispatchEvent(new CustomEvent('dairy-visibility-sync'));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <ThemeProvider> <AuthProvider> <UserProvider> <VehicleProvider> <TransactionProvider> <MilkTransactionProvider> <LabProvider> <AccountProvider> <RouteProvider> <RouteCollectionProvider> <AdvanceProvider> <DispatchProvider>

          {/* Splash — jab tak show hai, sirf splash render hoga, baaki kuch nahi */}
          <AnimatePresence mode="wait">
            {showSplash && (
              <SplashCelebration onComplete={() => setShowSplash(false)} />
            )}
          </AnimatePresence>

          {/* App — sirf tab render hoga jab splash khatam ho jaye */}
          {!showSplash && (
            <BrowserRouter> <Routes> <Route path="/login" element={<Login />} />
              
              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Admin']} />}> <Route path="/admin" element={<AdminDashboard />} /> <Route path="/admin/routes" element={<RouteManagement />} /> <Route path="/admin/collections" element={<AdminRouteCollections />} /> <Route path="/admin/users" element={<UserManagement />} /> <Route path="/admin/vehicles" element={<VehicleManagement />} /> <Route path="/admin/driver-reports" element={<AdminDriverReports />} /> <Route path="/admin/sale-ledger" element={<SaleLedger />} /> <Route path="/admin/purchase-ledger" element={<PurchaseLedger />} /> <Route path="/admin/farmer-purchases" element={<MilkPurchases />} /> <Route path="/admin/sales" element={<MilkSales />} /> <Route path="/admin/lab-reports" element={<AdminLabReports />} /> <Route path="/admin/account-reports" element={<AdminAccountReports />} /> <Route path="/admin/expense-entry" element={<ExpenseEntry />} /> <Route path="/admin/pnl" element={<AdminPnL />} /> <Route path="/admin/advances" element={<AdminAdvances />} /> <Route path="/admin/dispatch" element={<AdminDispatch />} /> </Route>

              {/* MilkTester Routes */}
              <Route element={<ProtectedRoute allowedRoles={['MilkTester']} />}> <Route path="/milktester" element={<Navigate to="/milktester/collections" replace />} /> <Route path="/milktester/collections" element={<DriverRouteCollection />} /> </Route>

              {/* Accountant Routes */}
              <Route element={<ProtectedRoute allowedRoles={['Accountant']} />}> <Route path="/accountant" element={<AccountantDashboard />} /> <Route path="/accountant/collections" element={<AdminRouteCollections />} /> <Route path="/accountant/advances" element={<AccountantAdvances />} /> <Route path="/accountant/farmer-purchases" element={<MilkPurchases />} /> <Route path="/accountant/sales" element={<MilkSales />} /> <Route path="/accountant/purchase-ledger" element={<PurchaseLedger />} /> <Route path="/accountant/sale-ledger" element={<SaleLedger />} /> <Route path="/accountant/expense-entry" element={<ExpenseEntry />} /> <Route path="/accountant/reports" element={<AccountantReports />} /> <Route path="/accountant/financial-overview" element={<FinancialOverview />} /> <Route path="/accountant/dispatch" element={<AdminDispatch />} /> <Route path="/accountant/vehicles" element={<VehicleManagement />} /> </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes> </BrowserRouter>
          )}

        </DispatchProvider> </AdvanceProvider> </RouteCollectionProvider> </RouteProvider> </AccountProvider> </LabProvider> </MilkTransactionProvider> </TransactionProvider> </VehicleProvider> </UserProvider> </AuthProvider> </ThemeProvider>
  );
}

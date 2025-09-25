/** @format */

import React from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import { DarkModeProvider } from "./hooks/useDarkMode";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";

// Importations existantes
import { CustomerList } from "./pages/Customers/CustomerList";
import { QuoteList } from "./pages/Quotes/QuoteList";
import { InvoiceList } from "./pages/Invoices/InvoiceList";
import { PaymentList } from "./pages/Payments/PaymentList";
import { ProductList } from "./pages/Products/ProductList";
import { ExpenseList } from "./pages/Accounting/ExpenseList";
import { UserManagement } from "./pages/Admin/UserManagement";
import { ServiceManagement } from "./pages/Admin/ServiceManagement";
import { PermissionManagement } from "./pages/Admin/PermissionManagement";
import { EmployeeList } from "./pages/HR/EmployeeList";
import { LeaveManagement } from "./pages/HR/LeaveManagement";
import { SalaryManagement } from "./pages/HR/SalaryManagement";
import { LoanManagement } from "./pages/HR/LoanManagement";
import { ContractList } from "./pages/HR/ContractList";
import { ProspectionWorkflow } from "./pages/Commercial/ProspectionWorkflow";
import { SpecialiteList } from "./pages/Services/SpecialiteList";
import { TechnicienList } from "./pages/Services/TechnicienList";
import { MissionList } from "./pages/Services/MissionList";
import { MaterielList } from "./pages/Services/MaterielList";
import { InterventionList } from "./pages/Services/InterventionList";
import { ReportList } from "./pages/Reports/ReportList";
import { MessageList } from "./pages/Messages/MessageList";

// Nouvelles pages
import { ProjectManagement } from "./pages/Projects/ProjectManagement";
import { PurchaseManagement } from "./pages/Purchases/PurchaseManagement";
import { PerformanceManagement } from "./pages/Performance/PerformanceManagement";
import { CalendarManagement } from "./pages/Calendar/CalendarManagement";
import { CommercialPermissionManagement } from "./pages/Commercial/CommercialPermissionManagement";

// Pages manquantes à ajouter
import { SupplierList } from "./pages/Suppliers/SupplierList";
import { AccountManagement } from "./pages/Accounting/AccountManagement";
import { TreasuryManagement } from "./pages/Accounting/TreasuryManagement";

// Créer le client React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Routes>
              {/* Route de connexion */}
              <Route path="/login" element={<Login />} />

              {/* Routes protégées */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route
                  path="dashboard"
                  element={
                    <ErrorBoundary
                      fallback={
                        <div className="p-6 text-center">
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Erreur Dashboard
                          </h2>
                          <p className="text-gray-600 dark:text-gray-300">
                            Le tableau de bord ne peut pas se charger.
                          </p>
                        </div>
                      }
                    >
                      <Dashboard />
                    </ErrorBoundary>
                  }
                />

                {/* Redirection par défaut vers le dashboard */}
                <Route index element={<Navigate to="/dashboard" replace />} />

                {/* === MODULE COMMERCIAL & CRM === */}
                <Route
                  path="customers"
                  element={
                    <ProtectedRoute permission="customers.read">
                      <CustomerList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="quotes"
                  element={
                    <ProtectedRoute permission="quotes.read">
                      <QuoteList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="invoices"
                  element={
                    <ProtectedRoute permission="invoices.read">
                      <InvoiceList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="payments"
                  element={
                    <ProtectedRoute permission="payments.read">
                      <PaymentList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="commercial/prospection"
                  element={
                    <ProtectedRoute permission="prospects.read">
                      <ProspectionWorkflow />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="commercial/permissions"
                  element={
                    <ProtectedRoute permission="admin.system_settings">
                      <CommercialPermissionManagement />
                    </ProtectedRoute>
                  }
                />

                {/* === MODULE COMPTABILITÉ & FINANCES === */}
                <Route
                  path="accounting/expenses"
                  element={
                    <ProtectedRoute permission="expenses.read">
                      <ExpenseList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="accounting/accounts"
                  element={
                    <ProtectedRoute permission="accounts.read">
                      <AccountManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="accounting/treasury"
                  element={
                    <ProtectedRoute permission="cash-flows.read">
                      <TreasuryManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <ProtectedRoute permission="reports.financial">
                      <ReportList />
                    </ProtectedRoute>
                  }
                />

                {/* === MODULE RESSOURCES HUMAINES === */}
                <Route
                  path="hr/employees"
                  element={
                    <ProtectedRoute permission="employees.read">
                      <EmployeeList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="hr/salaries"
                  element={
                    <ProtectedRoute permission="salaries.read">
                      <SalaryManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="hr/contracts"
                  element={
                    <ProtectedRoute permission="contracts.read">
                      <ContractList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="hr/leaves"
                  element={
                    <ProtectedRoute permission="leaves.read">
                      <LeaveManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="hr/loans"
                  element={
                    <ProtectedRoute permission="loans.read">
                      <LoanManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="hr/performance"
                  element={
                    <ProtectedRoute permission="performance.read">
                      <PerformanceManagement />
                    </ProtectedRoute>
                  }
                />

                {/* === MODULE SERVICES TECHNIQUES === */}
                <Route
                  path="services/specialites"
                  element={
                    <ProtectedRoute permission="specialites.read">
                      <SpecialiteList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="services/techniciens"
                  element={
                    <ProtectedRoute permission="techniciens.read">
                      <TechnicienList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="services/missions"
                  element={
                    <ProtectedRoute permission="missions.read">
                      <MissionList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="services/interventions"
                  element={
                    <ProtectedRoute permission="interventions.read">
                      <InterventionList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="services/materiel"
                  element={
                    <ProtectedRoute permission="materiels.read">
                      <MaterielList />
                    </ProtectedRoute>
                  }
                />

                {/* === MODULE PROJETS CLIENTS === */}
                <Route
                  path="projects"
                  element={
                    <ProtectedRoute permission="projects.read">
                      <ProjectManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="calendar"
                  element={
                    <ProtectedRoute permission="calendar.read">
                      <CalendarManagement />
                    </ProtectedRoute>
                  }
                />

                {/* === MODULE ACHATS & STOCKS === */}
                <Route
                  path="purchases/products"
                  element={
                    <ProtectedRoute permission="products.read">
                      <ProductList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="purchases/suppliers"
                  element={
                    <ProtectedRoute permission="suppliers.read">
                      <SupplierList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="purchases/orders"
                  element={
                    <ProtectedRoute permission="purchases.read">
                      <PurchaseManagement />
                    </ProtectedRoute>
                  }
                />

                {/* === MODULE COMMUNICATION === */}
                <Route
                  path="messages"
                  element={
                    <ProtectedRoute permission="messages.read">
                      <MessageList />
                    </ProtectedRoute>
                  }
                />

                {/* === MODULE ADMINISTRATION === */}
                <Route
                  path="admin/users"
                  element={
                    <ProtectedRoute permission="users.read">
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/services"
                  element={
                    <ProtectedRoute permission="admin.system_settings">
                      <ServiceManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/permissions"
                  element={
                    <ProtectedRoute permission="users.manage_permissions">
                      <PermissionManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Routes de développement */}
                <Route
                  path="commercial/pipeline"
                  element={
                    <ProtectedRoute permission="quotes.read">
                      <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-900">
                          Pipeline des prospects
                        </h1>
                        <p className="text-gray-600">
                          Cette fonctionnalité est en cours de développement.
                        </p>
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Route 404 */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </DarkModeProvider>
    </QueryClientProvider>
  );
}

export default App;
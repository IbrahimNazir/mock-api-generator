import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Navbar } from "./components/layout/Navbar";
import { LoginForm } from "./components/auth/LoginForm";
import { RegisterForm } from "./components/auth/RegisterForm";
import { Dashboard } from "./pages/Dashboard";
import { APIsPage } from "./pages/APIsPage";
import { CreateAPIForm } from "./components/api/CreateAPIForm";
import { EditAPIForm } from "./components/api/EditAPIForm";
import { CreateEndpointForm } from "./components/endpoint/CreateEndpointForm";
import { EditEndpointForm } from "./components/endpoint/EditEndpointForm";
import { APIDetails } from "./pages/APIDetails";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Navbar />
            <Routes>
              {/* Public routes */}
              <Route path="/auth/login" element={<LoginForm />} />
              <Route path="/auth/register" element={<RegisterForm />} />
              
              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/apis" element={
                <ProtectedRoute>
                  <APIsPage />
                </ProtectedRoute>
              } />
              <Route path="/apis/new" element={
                <ProtectedRoute>
                  <CreateAPIForm />
                </ProtectedRoute>
              } />
              <Route path="/apis/:apiId" element={
                <ProtectedRoute>
                  <APIDetails />
                </ProtectedRoute>
              } />
              <Route path="/apis/:apiId/edit" element={
                <ProtectedRoute>
                  <EditAPIForm />
                </ProtectedRoute>
              } />
              <Route path="/apis/:apiId/endpoints/new" element={
                <ProtectedRoute>
                  <CreateEndpointForm />
                </ProtectedRoute>
              } />
              <Route path="/apis/:apiId/endpoints/:endpointId/edit" element={
                <ProtectedRoute>
                  <EditEndpointForm />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

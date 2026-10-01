import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import SupportChat from './components/SupportChat';
import Header from './components/Header';
import Footer from './components/Footer';
import EmailVerificationBanner from './components/EmailVerificationBanner';

const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const ListingForm = lazy(() => import('./pages/ListingForm'));
const SelectCountry = lazy(() => import('./pages/SelectCountry'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Settings = lazy(() => import('./pages/Settings'));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="در حال بارگذاری صفحه">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-700" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-gray-500">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-gray-500">در حال بارگذاری...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-porcelain">
      <SupportChat
        appId="persianpages"
        supportUrl={import.meta.env.VITE_SUPPORT_URL || 'http://localhost:5005'}
        user={user ? { name: user.name, email: user.email } : null}
        locale="fa"
        theme={{ primary: 'bg-primary-600', primaryHover: 'hover:bg-primary-700', text: 'text-white' }}
        buttonPosition="bottom-6 left-6"
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Select Country - No Header */}
        <Route path="/select-country" element={<SelectCountry />} />

        {/* All other routes with Header */}
        <Route
          path="*"
          element={
            <>
              <Header />
              <EmailVerificationBanner />
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/browse/:countryCode" element={<BrowsePage />} />
                  <Route path="/browse/:countryCode/category/:categorySlug" element={<BrowsePage />} />
                  <Route path="/browse/:countryCode/:citySlug" element={<BrowsePage />} />
                  <Route path="/browse/:countryCode/:citySlug/:categorySlug" element={<BrowsePage />} />
                  <Route path="/listing/:id" element={<ListingDetail />} />

                  <Route
                    path="/login"
                    element={
                      <GuestRoute>
                        <Login />
                      </GuestRoute>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <GuestRoute>
                        <Register />
                      </GuestRoute>
                    }
                  />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<Terms />} />

                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/listings/new"
                    element={
                      <ProtectedRoute>
                        <ListingForm />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/listings/:id/edit"
                    element={
                      <ProtectedRoute>
                        <ListingForm />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </>
          }
        />
        </Routes>
      </Suspense>
    </div>
  );
}

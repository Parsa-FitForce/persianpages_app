import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../hooks/useAuth';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { setToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token)
        .then(() => navigate('/dashboard'))
        .catch(() => navigate('/login'));
    } else {
      navigate('/login');
    }
  }, [searchParams, setToken, navigate]);

  return (
    <>
      <Helmet>
        <title>در حال ورود... | PersianPages</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال ورود...</p>
        </div>
      </div>
    </>
  );
}

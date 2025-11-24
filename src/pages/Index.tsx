import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/mockData';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/leader');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto gradient-primary rounded-full animate-pulse shadow-glow" />
        <p className="text-lg font-medium gradient-primary bg-clip-text text-transparent animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
};

export default Index;

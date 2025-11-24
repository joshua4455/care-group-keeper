import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="text-center space-y-6 p-8">
        <div className="text-8xl font-bold gradient-primary bg-clip-text text-transparent animate-in zoom-in duration-500">
          404
        </div>
        <p className="text-2xl font-semibold text-foreground">Oops! Page not found</p>
        <p className="text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-glow hover:shadow-xl font-medium"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;

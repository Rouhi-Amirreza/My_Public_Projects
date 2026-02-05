import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem("flightfinder_auth");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const sanitizeInput = (value: string) => value.trim().replace(/^(user|username|pass|password)\s*[:=\-]?\s*/i, "");

  const login = (username: string, password: string): boolean => {
    const normalizedUsername = sanitizeInput(username).toLowerCase();
    const normalizedPassword = sanitizeInput(password).toLowerCase();

    const validCredentials = [
      { username: "Qashio_demo", password: "Qashio_demo" },
      { username: "Qashio", password: "Qshio" },
    ];

    const matchedCredential = validCredentials.find(
      (cred) =>
        cred.username.toLowerCase() === normalizedUsername &&
        cred.password.toLowerCase() === normalizedPassword
    );

    if (matchedCredential) {
      setIsAuthenticated(true);
      localStorage.setItem("flightfinder_auth", "true");
      return true;
    }

    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("flightfinder_auth");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

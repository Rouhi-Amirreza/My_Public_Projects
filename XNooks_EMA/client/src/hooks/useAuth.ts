import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check if the error is a 401 (unauthorized)
  const is401Error = error && (error as any).message?.includes('401');

  return {
    user,
    isLoading,
    isAuthenticated: !is401Error && !!user,
  };
}

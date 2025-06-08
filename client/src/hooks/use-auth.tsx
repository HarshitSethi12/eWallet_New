
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export function useAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/auth/user");
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/auth/google";
    },
  });

  const appleLoginMutation = useMutation({
    mutationFn: async () => {
      window.location.href = "/auth/apple";
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/auth/logout");
      if (!response.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      });
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error signing you out. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    loginWithApple: appleLoginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}

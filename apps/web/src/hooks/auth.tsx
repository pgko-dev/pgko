import type { AxiosError } from "axios";
import {
  createContext,
  type ReactNode,
  useCallback,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as v from "valibot";

import type {
  AuthMeResponse,
  CommonSuccess,
  SignInBody,
  SignUpBody,
  UpdateProfileBody as UpdateProfileBodyType,
} from "@pgko.dev/schema";
import { AuthMeResponseSchema, CommonSuccessSchema } from "@pgko.dev/schema";

import { apiClient } from "@/lib/api.ts";
import { handleApiError } from "@/lib/parse-error";

type User = AuthMeResponse["user"];

type LoginBody = SignInBody;

export type UpdateProfileBody = UpdateProfileBodyType;

type RegisterBody = SignUpBody;

export type AuthUser = NonNullable<AuthMeResponse["user"]>;

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isAuthenticated: () => Promise<boolean>;
  getUserOrRefresh: () => Promise<User | null>;
  login: (payload: LoginBody) => Promise<AuthMeResponse>;
  logout: () => Promise<CommonSuccess>;
  refresh: () => Promise<User | null>;
  updateProfile: (body: UpdateProfileBody) => Promise<AuthMeResponse>;
  uploadAvatar: (file: File) => Promise<AuthMeResponse>;
  deleteAvatar: () => Promise<AuthMeResponse>;
  deleteAccount: () => Promise<CommonSuccess>;
  register: (payload: RegisterBody) => Promise<AuthMeResponse>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInFlightRef = useRef<Promise<User | null> | null>(null);

  const refresh = useCallback((): Promise<User | null> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const inFlight = (async () => {
      try {
        setIsRefreshing(true);
        const response = await apiClient.get("/api/auth/me");
        const parsed = v.parse(AuthMeResponseSchema, response.data);
        setUser(parsed.user);
        return parsed.user;
      } catch (error) {
        handleApiError(error as AxiosError);
        return null;
      } finally {
        setIsRefreshing(false);
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = inFlight;
    return inFlight;
  }, []);

  useEffect(() => {
    refresh()
      .catch(console.error)
      .finally(() => {
        setIsLoading(false);
      });
  }, [refresh]);

  const login = useCallback(async (payload: LoginBody) => {
    const response = await apiClient.post("/api/auth/login", payload);
    const data = v.parse(AuthMeResponseSchema, response.data);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const response = await apiClient.post("/api/auth/logout");
      return v.parse(CommonSuccessSchema, response.data);
    } finally {
      await refresh();
    }
  }, [refresh]);

  const updateProfile = useCallback(
    async (body: UpdateProfileBody) => {
      try {
        const response = await apiClient.patch("/api/auth/me", body);
        const data = v.parse(AuthMeResponseSchema, response.data);
        setUser(data.user);
        return data;
      } catch (error) {
        await refresh();
        throw error;
      }
    },
    [refresh],
  );

  const uploadAvatar = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await apiClient.post("/api/auth/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const data = v.parse(AuthMeResponseSchema, response.data);
    setUser(data.user);
    return data;
  }, []);

  const deleteAvatar = useCallback(async () => {
    setUser((prev) => (prev ? { ...prev, avatarUrl: null } : null));
    try {
      const response = await apiClient.delete("/api/auth/me/avatar");
      const data = v.parse(AuthMeResponseSchema, response.data);
      setUser(data.user);
      return data;
    } catch (error) {
      await refresh();
      throw error;
    }
  }, [refresh]);

  const deleteAccount = useCallback(async () => {
    try {
      const response = await apiClient.delete("/api/auth/me");
      return v.parse(CommonSuccessSchema, response.data);
    } finally {
      await refresh();
    }
  }, [refresh]);

  const register = useCallback(async (payload: RegisterBody) => {
    const response = await apiClient.post("/api/auth/register", payload);
    const data = v.parse(AuthMeResponseSchema, response.data);
    setUser(data.user);
    return data;
  }, []);

  const getUserOrRefresh = useCallback(async (): Promise<User | null> => {
    if (user || !isLoading) return user;
    return await refresh();
  }, [refresh, user, isLoading]);

  const isAuthenticated = useCallback(async () => {
    const u = await getUserOrRefresh();
    return Boolean(u);
  }, [getUserOrRefresh]);

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      getUserOrRefresh,
      user,
      isLoading,
      isRefreshing,
      login,
      logout,
      refresh,
      updateProfile,
      uploadAvatar,
      deleteAvatar,
      deleteAccount,
      register,
    }),
    [
      isAuthenticated,
      getUserOrRefresh,
      user,
      isLoading,
      isRefreshing,
      login,
      logout,
      refresh,
      updateProfile,
      uploadAvatar,
      deleteAvatar,
      deleteAccount,
      register,
    ],
  );

  return <AuthContext value={contextValue}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

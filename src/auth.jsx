import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { App } from "antd";
import api, { AUTH_EXPIRED_EVENT, getToken, setToken } from "./api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { message } = App.useApp();
  // undefined = still checking the saved token, null = logged out
  const [admin, setAdmin] = useState(getToken() ? undefined : null);

  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
    const onExpired = (event) => {
      setAdmin(null);
      if (event.detail) message.warning(event.detail);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [message]);

  const login = useCallback(async (email, password) => {
    const { token, admin: loggedIn } = await api.login(email, password);
    setToken(token);
    setAdmin(loggedIn);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
  }, []);

  return <AuthContext.Provider value={{ admin, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Provider } from "react-redux";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BlurTargetView } from "expo-blur";
import { StatusBar } from "expo-status-bar";

import { store } from "./redux/Store";
import { BASE_URL } from "./services/api";
import {
  setProfileFromLogin,
  clearProfile,
  type LoginUser,
} from "./redux/slices/ProfileSlice";
import SuperAppOverlay from "./components/SuperAppOverlay";
import MainTabNavigator from "./navigation/MainTabNavigator";
import AuthNavigator from "./navigation/AuthNavigator";
import PasswordScreen from "./screens/PasswordScreen";
import { navigationRef } from "./navigation/NavigationService";
import { HeaderScrollProvider } from "./context/HeaderScrollContext";

type Stage = "loading" | "login" | "forgot" | "change" | "home";

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";
const MUST_CHANGE_KEY = "authMustChangePassword";
const API_BASE = BASE_URL.replace(/\/+$/, "");

export default function App() {
  const [stage, setStage] = useState<Stage>("loading");
  const [changeUserId, setChangeUserId] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [superAppOpen, setSuperAppOpen] = useState(false);
  const blurTargetRef = useRef<React.ComponentRef<typeof BlurTargetView> | null>(null);

  // Uygulama yeniden açıldığında telefondaki oturumu geri yükle.
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const [token, savedUser, savedMustChange] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
          SecureStore.getItemAsync(MUST_CHANGE_KEY),
        ]);

        if (!active) return;

        if (!token?.trim() || !savedUser) {
          setStage("login");
          return;
        }

        const user: LoginUser = JSON.parse(savedUser);
        if (!user?.id) {
          setStage("login");
          return;
        }

        store.dispatch(setProfileFromLogin(user));
        setChangeUserId(user.id);
        const mustChange = savedMustChange === "true";
        setPasswordRequired(mustChange);
        setStage(mustChange ? "change" : "home");
      } catch (error) {
        console.warn("[AUTH] Kayıtlı oturum okunamadı:", error);
        if (active) setStage("login");
      }
    };

    void restoreSession();
    return () => { active = false; };
  }, []);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/Auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        console.error("[LOGIN]", response.status, result?.message);
        return false;
      }

      const token: unknown = result?.data?.token;
      const user: LoginUser | undefined = result?.data?.user;
      const mustChange = result?.data?.mustChangePassword === true;

      if (typeof token !== "string" || !token.trim() || !user?.id) {
        console.error("[LOGIN] Token veya kullanıcı bilgisi eksik.");
        return false;
      }

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      await SecureStore.setItemAsync(MUST_CHANGE_KEY, String(mustChange));

      store.dispatch(setProfileFromLogin(user));
      setChangeUserId(user.id);
      setPasswordRequired(mustChange);
      return true;
    } catch (error) {
      console.error("[LOGIN] Bağlantı / JSON / kayıt hatası:", error);
      return false;
    }
  };

  const handleAuthenticated = () => {
    setSuperAppOpen(false);
    setStage(passwordRequired ? "change" : "home");
  };

  const clearLocalSession = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(MUST_CHANGE_KEY),
    ]);
    store.dispatch(clearProfile());
    setPasswordRequired(false);
    setChangeUserId("");
    setSuperAppOpen(false);
  };

  const handleLogout = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const response = await fetch(`${API_BASE}/api/Auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) console.warn("[LOGOUT] HTTP", response.status);
      }
    } catch (error) {
      console.warn("[LOGOUT] Sunucu hatası:", error);
    } finally {
      try {
        await clearLocalSession();
      } finally {
        setStage("login");
      }
    }
  };

  const handlePasswordChanged = async () => {
    await SecureStore.setItemAsync(MUST_CHANGE_KEY, "false");
    setPasswordRequired(false);
    setStage("home");
  };

  const handleShortcutPress = (key: string) => {
    if (!navigationRef.isReady()) return;
    switch (key) {
      case "blogs":
        navigationRef.navigate("HomeTab", { screen: "Blog" });
        break;
      case "news":
        navigationRef.navigate("HomeTab", { screen: "CompanyNew" });
        break;
      case "announcement":
        navigationRef.navigate("HomeTab", { screen: "Announcement" });
        break;
      case "surveys":
        navigationRef.navigate("HomeTab", { screen: "Survey" });
        break;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Provider store={store}>
        {stage === "loading" ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1D2749" />
          </View>
        ) : (
          <NavigationContainer ref={navigationRef}>
            {stage === "change" ? (
              <PasswordScreen
                mode="change"
                userId={changeUserId}
                onSuccess={handlePasswordChanged}
                onCancel={async () => {
                  await clearLocalSession();
                  setStage("login");
                }}
              />
            ) : stage === "forgot" ? (
              <PasswordScreen
                mode="forgot"
                onSuccess={() => setStage("login")}
                onCancel={() => setStage("login")}
              />
            ) : stage === "home" ? (
              <HeaderScrollProvider>
                <View style={styles.container}>
                  <BlurTargetView ref={blurTargetRef} style={styles.container}>
                    <View style={styles.content}>
                      <MainTabNavigator
                        onSuperAppPress={() => setSuperAppOpen(true)}
                        onLogout={handleLogout}
                        onShortcutPress={handleShortcutPress}
                      />
                    </View>
                  </BlurTargetView>
                  <SuperAppOverlay
                    visible={superAppOpen}
                    onClose={() => setSuperAppOpen(false)}
                    blurTarget={blurTargetRef}
                  />
                </View>
              </HeaderScrollProvider>
            ) : (
              <AuthNavigator
                onLogin={handleLogin}
                onAuthenticated={handleAuthenticated}
                onForgotPassword={() => setStage("forgot")}
                logOut={handleLogout}
              />
            )}
          </NavigationContainer>
        )}
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  content: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FA",
  },
});

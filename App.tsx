import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Provider } from "react-redux";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BlurTargetView } from "expo-blur";
import { StatusBar } from "expo-status-bar";

import { store } from "./redux/Store";
import { BASE_URL } from "./services/api";
import { setProfileFromLogin, clearProfile, type LoginUser } from "./redux/slices/ProfileSlice";
import SuperAppOverlay from "./components/SuperAppOverlay";
import MainTabNavigator from "./navigation/MainTabNavigator";
import AuthNavigator from "./navigation/AuthNavigator";
import PasswordScreen from "./screens/PasswordScreen";
import { navigationRef } from "./navigation/NavigationService";
import { HeaderScrollProvider } from "./context/HeaderScrollContext";

type Stage = "login" | "forgot" | "change" | "home";

export default function App() {
  const [stage, setStage] = useState<Stage>("login");
  const [changeUserId, setChangeUserId] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [superAppOpen, setSuperAppOpen] = useState(false);
  const blurTargetRef = useRef<React.ComponentRef<typeof BlurTargetView> | null>(null);

  // Login: yeni API { data: { token, mustChangePassword, user } } döndürüyor.
  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
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

      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("authUser", JSON.stringify(user));
      store.dispatch(setProfileFromLogin(user));
      setChangeUserId(user.id);
      setPasswordRequired(mustChange);
      return true;
    } catch (error) {
      console.error("[LOGIN] Bağlantı / JSON hatası:", error);
      return false;
    }
  };

  // Login ekranındaki başarı animasyonu bittikten sonra yönlendir.
  const handleAuthenticated = () => {
    setSuperAppOpen(false);
    setStage(passwordRequired ? "change" : "home");
  };

  const clearLocalSession = async () => {
    await SecureStore.deleteItemAsync("authToken");
    await SecureStore.deleteItemAsync("authUser");
    store.dispatch(clearProfile());
    setPasswordRequired(false);
    setChangeUserId("");
    setSuperAppOpen(false);
  };

  const handleLogout = async () => {
    try {
      const token = await SecureStore.getItemAsync("authToken");
      if (token) {
        const response = await fetch(`${BASE_URL}/api/Auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) console.warn("[LOGOUT] HTTP", response.status);
      }
    } catch (error) {
      console.warn("[LOGOUT] Sunucu hatası:", error);
    } finally {
      await clearLocalSession();
      setStage("login");
    }
  };

  const handlePasswordChanged = () => {
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
                onForgotPassword={() => {
    console.log("Şifremi Unuttum tıklandı");
    setStage("forgot");
  }}
              logOut={handleLogout}
            />
          )}
        </NavigationContainer>
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  content: { flex: 1 },
});

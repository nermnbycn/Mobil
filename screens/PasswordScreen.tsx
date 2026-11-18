import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../services/api";

type Props =
  | { mode: "change"; userId: string; onSuccess: () => void; onCancel: () => void }
  | { mode: "forgot"; onSuccess: () => void; onCancel: () => void };

type ForgotStep = "request" | "verify" | "reset";

const C = {
  primary: "#1D2749",
  text: "#202638",
  muted: "#8E96A7",
  bg: "#F7F8FA",
  border: "#E7E9F0",
  white: "#FFFFFF",
};

async function postJson(path: string, payload: object, token?: string): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let result: any = null;
  if (raw) {
    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error(`Sunucu geçerli JSON döndürmedi (HTTP ${response.status}).`);
    }
  }
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || result?.detail || `HTTP ${response.status}`);
  }
  return result;
}

export default function PasswordScreen(props: Props) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [code, setCode] = useState("");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("request");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const scale = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    if (!success) return;
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [scale, success]);

  const submit = async () => {
    if (busy) return;
    setError("");
    try {
      setBusy(true);
      if (props.mode === "change") {
        if (!oldPassword || !newPassword || !confirmPassword) throw new Error("Tüm alanları doldurun.");
        if (newPassword !== confirmPassword) throw new Error("Yeni şifreler eşleşmiyor.");
        if (newPassword === oldPassword) throw new Error("Yeni şifre farklı olmalıdır.");
        const token = await SecureStore.getItemAsync("authToken");
        if (!token) throw new Error("Oturum bulunamadı.");
        await postJson("/api/User/change-password", {
          userId: props.userId,
          oldPassword,
          newPassword,
        }, token);
        setSuccess(true);
        return;
      }

      // Swagger'da doğrulanmış şifremi unuttum API alanları.
      if (forgotStep === "request") {
        if (!usernameOrEmail.trim()) throw new Error("Kullanıcı adı veya e-posta girin.");
        await postJson("/api/User/forgot-password", { usernameOrEmail: usernameOrEmail.trim() });
        setForgotStep("verify");
      } else if (forgotStep === "verify") {
        if (!code.trim()) throw new Error("Doğrulama kodunu girin.");
        await postJson("/api/User/validate-code", { usernameOrEmail: usernameOrEmail.trim(), code: code.trim() });
        setForgotStep("reset");
      } else {
        if (!newPassword || !confirmPassword) throw new Error("Yeni şifreyi girin.");
        if (newPassword !== confirmPassword) throw new Error("Yeni şifreler eşleşmiyor.");
        await postJson("/api/User/reset-password", {
          usernameOrEmail: usernameOrEmail.trim(),
          code: code.trim(),
          newPassword,
        });
        setSuccess(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  };

  const isChange = props.mode === "change";
  const title = isChange ? "Şifre Değiştirme" : "Şifremi Unuttum";
  const description = isChange
    ? "Devam etmeden önce şifrenizi güncelleyin."
    : forgotStep === "request"
      ? "Şifre sıfırlama işlemini başlatın."
      : forgotStep === "verify"
        ? "Size iletilen doğrulama kodunu girin."
        : "Yeni şifrenizi belirleyin.";

  if (success) {
    return (
      <View style={s.successScreen}>
        <Animated.View style={[s.successBlock, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark-circle" size={96} color="#22C55E" />
          <Text style={s.successTitle}>{isChange ? "Şifreniz Güncellendi!" : "Şifreniz Sıfırlandı!"}</Text>
          <Text style={s.description}>İşleminiz başarıyla tamamlandı.</Text>
          <TouchableOpacity style={s.button} onPress={props.onSuccess}>
            <Text style={s.buttonText}>{isChange ? "Uygulamaya Devam Et" : "Giriş Ekranına Dön"}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <View style={s.headerIcon}>
            <Ionicons name="lock-closed-outline" size={30} color={C.primary} />
          </View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.description}>{description}</Text>

          {isChange ? (
            <Field label="Mevcut Şifre" value={oldPassword} onChangeText={setOldPassword} secure />
          ) : forgotStep === "request" ? (
            <Field label="Kullanıcı Adı veya E-posta" value={usernameOrEmail} onChangeText={setUsernameOrEmail} />
          ) : forgotStep === "verify" ? (
            <Field label="Doğrulama Kodu" value={code} onChangeText={setCode} />
          ) : null}

          {(isChange || (!isChange && forgotStep === "reset")) && (
            <>
              <Field label="Yeni Şifre" value={newPassword} onChangeText={setNewPassword} secure />
              <Field label="Yeni Şifre Tekrar" value={confirmPassword} onChangeText={setConfirmPassword} secure />
            </>
          )}

          {!!error && <Text style={s.error}>{error}</Text>}
          <TouchableOpacity style={[s.button, busy && s.disabled]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color={C.white} /> : (
              <Text style={s.buttonText}>
                {isChange ? "Şifremi Güncelle" : forgotStep === "request" ? "Kod Gönder" : forgotStep === "verify" ? "Kodu Doğrula" : "Şifremi Sıfırla"}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={props.onCancel} disabled={busy} style={s.backButton}>
            <Text style={s.backText}>Giriş Ekranına Dön</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
}) {
  return (
    <>
      <Text style={s.label}>{props.label}</Text>
      <TextInput
        style={s.input}
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secure}
        autoCapitalize="none"
        placeholder={props.label}
        placeholderTextColor={C.muted}
      />
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: { backgroundColor: C.white, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border, elevation: 3 },
  headerIcon: { height: 60, width: 60, borderRadius: 18, backgroundColor: "#E8F0FC", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  title: { color: C.primary, fontWeight: "800", fontSize: 24, marginBottom: 10 },
  description: { color: C.muted, fontSize: 14, lineHeight: 21, marginBottom: 18, textAlign: "center" },
  label: { color: C.text, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  input: { height: 53, borderWidth: 1, borderColor: C.border, borderRadius: 13, backgroundColor: C.bg, color: C.text, paddingHorizontal: 14 },
  button: { height: 54, borderRadius: 13, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginTop: 24, paddingHorizontal: 14, width: "100%" },
  buttonText: { fontSize: 15, fontWeight: "700", color: C.white },
  disabled: { opacity: 0.6 },
  error: { marginTop: 12, color: "#DC2626" },
  backButton: { paddingVertical: 16, alignItems: "center" },
  backText: { color: C.muted, fontWeight: "600" },
  successScreen: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  successBlock: { width: "100%", maxWidth: 400, alignItems: "center" },
  successTitle: { color: C.primary, fontWeight: "800", fontSize: 24, textAlign: "center", marginTop: 20, marginBottom: 10 },
});

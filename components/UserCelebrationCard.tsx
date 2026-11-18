import React, { useCallback, useEffect, useState } from "react";

import {

  View,

  Text,

  Image,

  TouchableOpacity,

  TextInput,

  Modal,

  StyleSheet,

  ActivityIndicator,

  Alert,

  KeyboardAvoidingView,

  Platform,

  ScrollView,

} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useDispatch, useSelector } from "react-redux";

import * as SecureStore from "expo-secure-store";

import { useFocusEffect } from "@react-navigation/native";

import type { User } from "../redux/slices/UserSlice";

import type { RootState, AppDispatch } from "../redux/Store";

import { sendMessage } from "../redux/slices/MessageSlice";

import { BASE_URL } from "../services/api";

interface Props {

  user: User;

  type: "birthday" | "anniversary" | "welcome";

  isWeekly?: boolean;

  onSendMessage?: (userId: string, message: string) => Promise<void>;

}

const COLORS = {

  navy: "#1D2749",

  navyDark: "#13294B",

  lightBlue: "#E8F0FC",

  background: "#F7F8FA",

  white: "#FFFFFF",

  muted: "#606d83",

  border: "#E6EBF2",

  red: "#DC2626",

};

function getImageUrl(imageUrl?: string | null): string | null {

  if (!imageUrl?.trim()) return null;

  const path = imageUrl.trim();

  if (/^https?:\/\//i.test(path)) return path;

  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;

}

export default function UserCelebrationCard({

  user,

  type,

  isWeekly = false,

}: Props) {

  const dispatch = useDispatch<AppDispatch>();

  const senderId = useSelector((state: RootState) => state.profile.profile?.id);

  const [modalVisible, setModalVisible] = useState(false);

  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);

  const [imageError, setImageError] = useState(false);

  const [hasCelebrated, setHasCelebrated] = useState(false);

  const [checkingCelebration, setCheckingCelebration] = useState(false);

  const isBirthday = type === "birthday";
  const isWelcome = type === "welcome";

  const imageUrl = getImageUrl(user.imageUrl);

  useEffect(() => setImageError(false), [imageUrl]);

  // Yeni API alanları: nameSurname ve startDate

  const currentUser = user as User & {

    nameSurname?: string | null;

    startDate?: string | null;

  };

  const fullName = currentUser.nameSurname?.trim() || "Kullanıcı";

  const firstName = fullName.split(/\s+/)[0];

  const nameParts = fullName.split(/\s+/);

  const initials = nameParts.length > 1

    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toLocaleUpperCase("tr-TR")

    : fullName[0]?.toLocaleUpperCase("tr-TR") || "?";

  const years = !isBirthday && !isWelcome && currentUser.startDate

    ? new Date().getFullYear() - Number(currentUser.startDate.substring(0, 4))

    : 0;

  const remainingDays = isWeekly

    ? isBirthday

      ? user.daysUntilBirthday

      : user.daysUntilAnniversary

    : undefined;

  // Kutlama kontrolünü sayfa odaklandığında güncelle.

  useFocusEffect(

    useCallback(() => {

      let active = true;

      const controller = new AbortController();

      const checkCelebration = async () => {

        if (isWelcome || isWeekly || !user.id) {

          if (active) setCheckingCelebration(false);

          return;

        }

        if (active) setCheckingCelebration(true);

        try {

          const token = await SecureStore.getItemAsync("authToken");

          if (!token) throw new Error("Oturum bulunamadı.");

          const url = `${BASE_URL.replace(/\/$/, "")}/api/Message/celebrated?receiverId=${encodeURIComponent(String(user.id))}&type=${encodeURIComponent(type)}`;

          const response = await fetch(url, {

            method: "GET",

            headers: {

              Authorization: `Bearer ${token}`,

              Accept: "application/json",

            },

            signal: controller.signal,

          });

          if (!response.ok) {

            throw new Error(`Kutlama kontrolü başarısız (HTTP ${response.status}). URL: ${url}`);

          }

          const result: unknown = await response.json();

          const body = result as {

            hasCelebrated?: boolean;

            data?: { hasCelebrated?: boolean } | boolean;

          } | null;

          const celebrated =

            body?.hasCelebrated === true ||

            body?.data === true ||

            (typeof body?.data === "object" &&

              body.data?.hasCelebrated === true);

          if (active) setHasCelebrated(celebrated);

        } catch (error) {

          if (active && !controller.signal.aborted) {

            console.warn("Kutlama kontrol hatası:", error);

            // Başarılı gönderim sonrası ekrandaki Kutlandı durumunu kaybetme.

          }

        } finally {

          if (active) setCheckingCelebration(false);

        }

      };

      void checkCelebration();

      return () => {

        active = false;

        controller.abort();

      };

    }, [user.id, type, isWeekly, isWelcome]),

  );

  const messageExamples = isBirthday

    ? [

        `Doğum günün kutlu olsun ${firstName}! 🎂`,

        `Nice mutlu yıllara ${firstName}! 🎉`,

        `Mutlu seneler dilerim ${firstName}! 🎈`,

      ]

    : [

        `${years}. iş yıl dönümün kutlu olsun ${firstName}! 🎉`,

        `Nice başarılı yıllara ${firstName}! 👏`,

        `İş yıl dönümünü tebrik ederim ${firstName}! 🎊`,

      ];

  const disabled = isWelcome || isWeekly || hasCelebrated || checkingCelebration || sending;

  const openModal = () => {

    if (disabled) return;

    setMessage(messageExamples[0]);

    setModalVisible(true);

  };

  const handleSend = async () => {

    if (disabled || !message.trim()) return;

    if (!senderId) {

      Alert.alert("Hata", "Giriş yapan kullanıcı bilgisi bulunamadı.");

      return;

    }

    if (!user.id) {

      Alert.alert("Hata", "Mesaj gönderilecek kullanıcı bulunamadı.");

      return;

    }

    if (String(senderId) === String(user.id)) {

      Alert.alert("Uyarı", "Kendinize kutlama mesajı gönderemezsiniz.");

      return;

    }

    setSending(true);

    try {

      await dispatch(

        sendMessage({

          senderId,

          receiverId: user.id,

          message: message.trim(),

          type,

        }),

      ).unwrap();

      setHasCelebrated(true);

      setModalVisible(false);

      setMessage("");

      Alert.alert("Başarılı", "Kutlama mesajınız gönderildi.");

    } catch (error) {

      Alert.alert(

        "Mesaj Gönderilemedi",

        typeof error === "string" ? error : "Bir hata oluştu. Tekrar deneyin.",

      );

    } finally {

      setSending(false);

    }

  };

  return (

    <View style={styles.card}>

      {isWeekly && remainingDays != null && remainingDays > 0 && (

        <View style={styles.countdownContainer}>

          <Ionicons name="time-outline" size={15} color={COLORS.red} />

          <Text style={styles.countdownText}>{remainingDays} gün kaldı</Text>

        </View>

      )}

      <View style={styles.avatar}>

        {imageUrl && !imageError ? (

          <Image

            source={{ uri: imageUrl }}

            style={styles.avatarImage}

            resizeMode="cover"

            onError={() => setImageError(true)}

          />

        ) : (

          <Text style={styles.avatarText}>{initials}</Text>

        )}

        <View style={styles.avatarBadge}>

          <Ionicons

            name={isWelcome ? "person-add-outline" : isBirthday ? "gift-outline" : "ribbon-outline"}

            size={15}

            color={COLORS.navy}

          />

        </View>

      </View>

      <Text style={styles.name} numberOfLines={1}>

        {fullName}

      </Text>

      <Text style={styles.description} numberOfLines={2}>

        {isWelcome
          ? "Aramıza Hoş Geldin!"
          : isBirthday
          ? isWeekly

            ? ""

            : "Doğum Günün Kutlu Olsun!"

          : `${years}. İş Yıl Dönümü yaklaşıyor!`}

      </Text>

     {!isWeekly && !isWelcome && (

  <TouchableOpacity

    style={[

      styles.celebrateButton,

      disabled && styles.disabledCelebrateButton,

    ]}

    activeOpacity={0.85}

    onPress={openModal}

    disabled={disabled}

    accessibilityRole="button"

    accessibilityState={{ disabled }}

  >

    <Ionicons

      name={hasCelebrated ? "checkmark-circle-outline" : "paper-plane-outline"}

      size={17}

      color={COLORS.white}

    />

    <Text style={styles.celebrateText}>

      {hasCelebrated

        ? "Kutlandı"

        : checkingCelebration

          ? "Kontrol Ediliyor"

          : "Kutla"}

    </Text>

  </TouchableOpacity>

)}

      <Modal

        visible={modalVisible}

        transparent

        animationType="fade"

        onRequestClose={() => {

          if (!sending) setModalVisible(false);

        }}

      >

        <KeyboardAvoidingView

          style={styles.overlay}

          behavior={Platform.OS === "ios" ? "padding" : undefined}

        >

          <View style={styles.modal}>

            <ScrollView

              keyboardShouldPersistTaps="handled"

              showsVerticalScrollIndicator={false}

              contentContainerStyle={styles.modalScrollContent}

            >

              <View style={styles.modalIcon}>

                <Ionicons

                  name={isWelcome ? "person-add-outline" : isBirthday ? "gift-outline" : "ribbon-outline"}

                  size={30}

                  color={COLORS.navy}

                />

              </View>

              <Text style={styles.modalTitle}>

                {fullName}

              </Text>

              <Text style={styles.modalSubtitle}>Kutlama mesajı seç veya yaz</Text>

              <View style={styles.messageOptions}>

                {messageExamples.map((example, index) => (

                  <TouchableOpacity

                    key={index}

                    activeOpacity={0.8}

                    disabled={sending}

                    onPress={() => setMessage(example)}

                    style={[

                      styles.messageOption,

                      message === example && styles.selectedMessageOption,

                    ]}

                  >

                    <Text style={styles.messageOptionText}>{example}</Text>

                  </TouchableOpacity>

                ))}

              </View>

              <TextInput

                style={styles.input}

                multiline

                value={message}

                onChangeText={setMessage}

                placeholder="Mesajınızı yazın..."

                placeholderTextColor={COLORS.muted}

                maxLength={500}

                editable={!sending}

              />

              <TouchableOpacity

                style={[

                  styles.sendButton,

                  (sending || !message.trim()) && styles.disabledButton,

                ]}

                onPress={handleSend}

                disabled={sending || !message.trim()}

              >

                {sending ? (

                  <ActivityIndicator color={COLORS.white} />

                ) : (

                  <Text style={styles.sendText}>Mesaj Gönder</Text>

                )}

              </TouchableOpacity>

              <TouchableOpacity

                onPress={() => setModalVisible(false)}

                disabled={sending}

              >

                <Text style={styles.cancel}>Vazgeç</Text>

              </TouchableOpacity>

            </ScrollView>

          </View>

        </KeyboardAvoidingView>

      </Modal>

    </View>

  );

}

const styles = StyleSheet.create({

  card: {

    width: 170,

    minHeight: 190,

    backgroundColor: COLORS.white,

    borderRadius: 22,

    padding: 16,

    alignItems: "center",

    marginRight: 12,

    borderWidth: 1,

    borderColor: COLORS.border,

    shadowColor: COLORS.navy,

    shadowOffset: { width: 0, height: 5 },

    shadowOpacity: 0.06,

    shadowRadius: 12,

    elevation: 2,

  },

  countdownContainer: {

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    width: "100%",

    marginBottom: 10,

  },

  countdownText: {

    fontSize: 12,

    fontWeight: "700",

    color: COLORS.red,

    textAlign: "center",

  },

  avatar: {

    width: 80,

    height: 100,

    borderRadius: 38,

    backgroundColor: COLORS.lightBlue,

    justifyContent: "center",

    alignItems: "center",

    marginTop: 8,

    marginBottom: 15,

  },

  avatarImage: { width: 80, height: 100, borderRadius: 38 },

  avatarText: { fontSize: 25, fontWeight: "800", color: COLORS.navy },

  avatarBadge: {

    position: "absolute",

    right: -4,

    bottom: 0,

    width: 27,

    height: 27,

    borderRadius: 14,

    backgroundColor: COLORS.white,

    borderWidth: 1,

    borderColor: COLORS.border,

    justifyContent: "center",

    alignItems: "center",

  },

  name: {

    fontSize: 16,

    fontWeight: "700",

    color: COLORS.navyDark,

    textAlign: "center",

    width: "100%",

    marginBottom: 8,

  },

  description: {

    fontSize: 12,

    lineHeight: 17,

    color: COLORS.muted,

    textAlign: "center",

    minHeight: 34,

    marginBottom: 14,

  },

  celebrateButton: {

    marginTop: "auto",

    width: "100%",

    paddingVertical: 12,

    borderRadius: 14,

    backgroundColor: COLORS.navy,

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    gap: 8,

  },

  disabledCelebrateButton: { backgroundColor: "#4d6ca5", opacity: 0.65 },

  celebrateText: { color: COLORS.white, fontSize: 14, fontWeight: "bold" },

  overlay: {

    flex: 1,

    backgroundColor: "rgba(13, 27, 53, 0.55)",

    justifyContent: "center",

    padding: 24,

  },

  modal: {

    backgroundColor: COLORS.white,

    borderRadius: 24,

    padding: 24,

    maxHeight: "85%",

  },

  modalScrollContent: { alignItems: "center" },

  modalIcon: {

    width: 60,

    height: 60,

    borderRadius: 30,

    backgroundColor: COLORS.lightBlue,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 14,

  },

  modalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.navy },

  modalSubtitle: { color: COLORS.muted, marginTop: 6, marginBottom: 20 },

  messageOptions: { width: "100%", gap: 10, marginBottom: 15 },

  messageOption: {

    padding: 12,

    borderRadius: 12,

    backgroundColor: COLORS.background,

    borderWidth: 1,

    borderColor: COLORS.border,

  },

  selectedMessageOption: {

    backgroundColor: "#DBE4F5",

    borderColor: COLORS.navy,

  },

  messageOptionText: { fontSize: 14, color: COLORS.navy },

  input: {

    width: "100%",

    minHeight: 110,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 12,

    padding: 14,

    textAlignVertical: "top",

    color: COLORS.navyDark,

    marginBottom: 16,

  },

  sendButton: {

    backgroundColor: COLORS.navy,

    padding: 14,

    borderRadius: 12,

    width: "100%",

    alignItems: "center",

  },

  disabledButton: { opacity: 0.55 },

  sendText: { color: COLORS.white, fontWeight: "700" },

  cancel: { marginTop: 18, color: COLORS.muted },

});

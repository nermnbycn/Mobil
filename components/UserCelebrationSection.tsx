
import React, { useEffect, useRef, useState } from "react";

import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { useDispatch, useSelector } from "react-redux";

import type { RootState, AppDispatch } from "../redux/Store";
import type { User } from "../redux/slices/UserSlice";

import {
  fetchBirthdayUsers,
  fetchAnniversaryUsers,
  fetchWeeklyBirthdays,
  fetchWeeklyAnniversaries,
  fetchNewJoiners,
} from "../redux/slices/UserSlice";

import UserCelebrationCard from "./UserCelebrationCard";

type Period = "today" | "week";

const COLORS = {
  primary: "#1D2749",
  secondary: "#303D65",
  background: "#F7F8FA",
  white: "#FFFFFF",
  muted: "#8E96A7",
  border: "#E7E9F0",
  selectedBackground: "#E9F0F9",
};

export default function UserCelebrationSection() {
  const dispatch = useDispatch<AppDispatch>();

  const {
    birthdayUsers,
    anniversaryUsers,
    weeklyBirthdays,
    weeklyAnniversaries,

    birthdayStatus,
    anniversaryStatus,
    weeklyBirthdayStatus,
    weeklyAnniversaryStatus,

    birthdayError,
    anniversaryError,
    weeklyBirthdayError,
    weeklyAnniversaryError,
    newJoiners,
    newJoinersStatus,
    newJoinersError,
  } = useSelector((state: RootState) => state.user);

  // =====================================================
  // SEKME DURUMLARI
  // =====================================================

  const [birthdayPeriod, setBirthdayPeriod] =
    useState<Period>("today");

  const [anniversaryPeriod, setAnniversaryPeriod] =
    useState<Period>("today");

  // Kullanıcı sekmeyi manuel değiştirdi mi?
  // Manuel seçimleri otomatik işlem değiştirmeyecek.
  const birthdayManualSelection = useRef(false);
  const anniversaryManualSelection = useRef(false);

  // =====================================================
  // BUGÜNKÜ DOĞUM GÜNLERİ VE İŞ YIL DÖNÜMLERİ
  // =====================================================

  useEffect(() => {
    dispatch(fetchBirthdayUsers());
    dispatch(fetchAnniversaryUsers());
    dispatch(fetchNewJoiners());
  }, [dispatch]);

  // =====================================================
  // BUGÜN DOĞUM GÜNÜ YOKSA BU HAFTA SEKmesini AÇ
  // =====================================================

  useEffect(() => {
    if (
      birthdayStatus === "succeeded" &&
      !birthdayManualSelection.current
    ) {
      setBirthdayPeriod(
        birthdayUsers.length === 0 ? "week" : "today"
      );
    }
  }, [birthdayStatus, birthdayUsers]);

  // =====================================================
  // BUGÜN İŞ YIL DÖNÜMÜ YOKSA BU HAFTA SEKmesini AÇ
  // =====================================================

  useEffect(() => {
    if (
      anniversaryStatus === "succeeded" &&
      !anniversaryManualSelection.current
    ) {
      setAnniversaryPeriod(
        anniversaryUsers.length === 0 ? "week" : "today"
      );
    }
  }, [anniversaryStatus, anniversaryUsers]);

  // =====================================================
  // HAFTALIK DOĞUM GÜNLERİNİ GETİR
  // =====================================================

  useEffect(() => {
    if (birthdayPeriod === "week") {
      dispatch(fetchWeeklyBirthdays());
    }
  }, [birthdayPeriod, dispatch]);

  // =====================================================
  // HAFTALIK İŞ YIL DÖNÜMLERİNİ GETİR
  // =====================================================

  useEffect(() => {
    if (anniversaryPeriod === "week") {
      dispatch(fetchWeeklyAnniversaries());
    }
  }, [anniversaryPeriod, dispatch]);

  // =====================================================
  // MANUEL SEKME DEĞİŞİMİ
  // =====================================================

  const handleBirthdayPeriodChange = (period: Period) => {
    birthdayManualSelection.current = true;
    setBirthdayPeriod(period);
  };

  const handleAnniversaryPeriodChange = (period: Period) => {
    anniversaryManualSelection.current = true;
    setAnniversaryPeriod(period);
  };

  // =====================================================
  // BUGÜN / BU HAFTA BUTONLARI
  // =====================================================

  const renderPeriodSelector = (
    selected: Period,
    onChange: (period: Period) => void
  ) => (
    <View style={styles.periodContainer}>
      <TouchableOpacity
        style={[
          styles.periodButton,
          selected === "today" && styles.periodActive,
        ]}
        onPress={() => onChange("today")}
      >
        <Text
          style={[
            styles.periodText,
            selected === "today" && styles.periodActiveText,
          ]}
        >
          Bugün
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.periodButton,
          selected === "week" && styles.periodActive,
        ]}
        onPress={() => onChange("week")}
      >
        <Text
          style={[
            styles.periodText,
            selected === "week" && styles.periodActiveText,
          ]}
        >
          Bu Hafta
        </Text>
      </TouchableOpacity>
    </View>
  );

  // =====================================================
  // KART LİSTESİ
  // =====================================================

  const renderCelebrationList = (
    users: User[],
    type: "birthday" | "anniversary",
    period: Period
  ) => (
    <FlatList
      horizontal
      data={users}
      keyExtractor={(item, index) =>
        item.id
          ? `${type}-${period}-${item.id}-${index}`
          : `${type}-${period}-${index}`
      }
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {period === "today"
            ? type === "birthday"
              ? "Bugün doğum günü olan çalışan bulunmuyor."
              : "Bugün iş yıl dönümü olan çalışan bulunmuyor."
            : type === "birthday"
              ? "Bu hafta doğum günü olan çalışan bulunmuyor."
              : "Bu hafta iş yıl dönümü olan çalışan bulunmuyor."}
        </Text>
      }
      renderItem={({ item }) => (
        <UserCelebrationCard
          user={item}
          type={type}
          isWeekly={period === "week"}
        />
      )}
    />
  );

  // =====================================================
  // GÖSTERİLECEK VERİLER
  // =====================================================

  const birthdayData =
    birthdayPeriod === "today"
      ? birthdayUsers
      : weeklyBirthdays;

  const anniversaryData =
    anniversaryPeriod === "today"
      ? anniversaryUsers
      : weeklyAnniversaries;

  // =====================================================
  // YÜKLENME DURUMLARI
  // =====================================================

  const birthdayBusy =
    birthdayPeriod === "today"
      ? birthdayStatus === "loading" ||
        birthdayStatus === "idle"
      : weeklyBirthdayStatus === "loading" ||
        weeklyBirthdayStatus === "idle";

  const anniversaryBusy =
    anniversaryPeriod === "today"
      ? anniversaryStatus === "loading" ||
        anniversaryStatus === "idle"
      : weeklyAnniversaryStatus === "loading" ||
        weeklyAnniversaryStatus === "idle";

  // =====================================================
  // HATALAR
  // =====================================================

  const currentBirthdayError =
    birthdayPeriod === "today"
      ? birthdayError
      : weeklyBirthdayError;

  const currentAnniversaryError =
    anniversaryPeriod === "today"
      ? anniversaryError
      : weeklyAnniversaryError;

  // =====================================================
  // EKRAN
  // =====================================================

  return (
    <View style={styles.container}>
      {/* DOĞUM GÜNLERİ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.heading}>
            Doğum Günleri
          </Text>

          {renderPeriodSelector(
            birthdayPeriod,
            handleBirthdayPeriodChange
          )}
        </View>

        {birthdayBusy ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : currentBirthdayError ? (
          <Text style={styles.error}>
            {currentBirthdayError}
          </Text>
        ) : (
          renderCelebrationList(
            birthdayData,
            "birthday",
            birthdayPeriod
          )
        )}
      </View>

      {/* İŞ YIL DÖNÜMLERİ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.heading}>
            İş Yıl Dönümleri
          </Text>

          {renderPeriodSelector(
            anniversaryPeriod,
            handleAnniversaryPeriodChange
          )}
        </View>

        {anniversaryBusy ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : currentAnniversaryError ? (
          <Text style={styles.error}>
            {currentAnniversaryError}
          </Text>
        ) : (
          renderCelebrationList(
            anniversaryData,
            "anniversary",
            anniversaryPeriod
          )
        )}
      </View>

      {/* ARAMIZA HOŞ GELDİNİZ — SEÇENEK YOK */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.heading}>Aramıza Hoş Geldiniz</Text>
        </View>

        {newJoinersStatus === "loading" || newJoinersStatus === "idle" ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : newJoinersError ? (
          <Text style={styles.error}>{newJoinersError}</Text>
        ) : (
          <FlatList
            horizontal
            data={newJoiners}
            keyExtractor={(item, index) => `welcome-${item.id || index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>Yeni katılan çalışan bulunmuyor.</Text>
            }
            renderItem={({ item }) => (
              <UserCelebrationCard user={item} type="welcome" />
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 30,
  },

  section: {
    gap: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  heading: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.primary,
    flexShrink: 1,
  },

  periodContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.selectedBackground,
    borderRadius: 14,
    padding: 3,
  },

  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  periodActive: {
    backgroundColor: COLORS.primary,
  },

  periodText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
  },

  periodActiveText: {
    color: COLORS.white,
  },

  listContent: {
    paddingRight: 16,
    paddingBottom: 8,
  },

  empty: {
    color: COLORS.muted,
    fontSize: 13,
    paddingVertical: 18,
  },

  error: {
    color: "#DC2626",
    fontSize: 13,
    marginBottom: 12,
  },
});

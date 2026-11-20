
import React, { useCallback, useEffect } from "react";

import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useDispatch, useSelector } from "react-redux";
import RenderHTML from "react-native-render-html";

import type { AppDispatch, RootState } from "../redux/Store";
import { fetchAnnouncementById } from "../redux/slices/AnnouncementSlice";
import { useHeaderScroll } from "../context/HeaderScrollContext";

// RENKLER
const COLORS = {
  primary: "#1D2749",
  background: "#F7F8FA",
  white: "#FFFFFF",
  text: "#202638",
  muted: "#8E96A7",
  border: "#E7E9F0",
};

// YEREL DUYURU GÖRSELLERİ
const ACTION_SUITE_IMAGE = require(
  "../assets/uploads/announcement/action-suite.png"
);

const PORTAL_IMAGE = require(
  "../assets/uploads/announcement/portal.png"
);

// NAVIGATION
type Params = {
  AnnouncementDetail: {
    announcementId: string;
  };
};

type DetailRoute = RouteProp<
  Params,
  "AnnouncementDetail"
>;

type DetailNavigation = NativeStackNavigationProp<
  Params,
  "AnnouncementDetail"
>;

// BAŞLIĞA GÖRE GÖRSEL SEÇ
function getAnnouncementImage(title?: string | null) {
  const normalizedTitle = (title ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, "");

  if (normalizedTitle.includes("actionsuite")) {
    return ACTION_SUITE_IMAGE;
  }

  return PORTAL_IMAGE;
}

// TARİH
function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

export default function AnnouncementDetailScreen() {
  const dispatch = useDispatch<AppDispatch>();

  const navigation = useNavigation<DetailNavigation>();

  const route = useRoute<DetailRoute>();

  const { announcementId } = route.params;

  const { width } = useWindowDimensions();

  const { setCollapsed } = useHeaderScroll();

  const {
    selectedAnnouncement,
    detailLoading,
    detailError,
  } = useSelector(
    (state: RootState) => state.announcement
  );

  // HEADER
  useFocusEffect(
    useCallback(() => {
      setCollapsed(false);

      return () => {
        setCollapsed(false);
      };
    }, [setCollapsed])
  );

  // DUYURU DETAYINI GETİR
  useEffect(() => {
    dispatch(fetchAnnouncementById(announcementId));
  }, [dispatch, announcementId]);

  const reload = () => {
    dispatch(fetchAnnouncementById(announcementId));
  };

  const goBack = () => {
    navigation.goBack();
  };

  // YÜKLENİYOR
  if (
    detailLoading ||
    (
      selectedAnnouncement &&
      selectedAnnouncement.id !== announcementId
    )
  ) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.info}>
          Duyuru yükleniyor...
        </Text>
      </View>
    );
  }

  // HATA
  if (detailError || !selectedAnnouncement) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="alert-circle-outline"
          size={42}
          color={COLORS.muted}
        />

        <Text style={styles.info}>
          {detailError || "Duyuru bulunamadı."}
        </Text>

        <TouchableOpacity
          style={styles.retry}
          onPress={reload}
        >
          <Text style={styles.retryText}>
            Tekrar Dene
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goBack}>
          <Text style={styles.backText}>
            Duyurulara Dön
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const announcement = selectedAnnouncement;

  const imageSource = getAnnouncementImage(
    announcement.title
  );

  const dateText = formatDate(
    announcement.publishedAt
  );

  const contentWidth = Math.max(
    Math.min(width - 72, 864),
    1
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(event) => {
        setCollapsed(
          event.nativeEvent.contentOffset.y > 80
        );
      }}
    >
      <View style={styles.inner}>
        {/* GERİ DÖN */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={COLORS.primary}
          />

          <Text style={styles.backText}>
            Duyurulara Dön
          </Text>
        </TouchableOpacity>

        {/* DUYURU KARTI */}
        <View style={styles.card}>
          {/* SABİT BOYUTLU GÖRSEL */}
          <View style={styles.imageWrapper}>
            <Image
              source={imageSource}
              style={styles.coverImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.body}>
            {/* BAŞLIK */}
            <Text style={styles.title}>
              {announcement.title ||
                "Başlıksız duyuru"}
            </Text>

            {/* TARİH */}
            {!!dateText && (
              <View style={styles.metaRow}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={COLORS.muted}
                />

                <Text style={styles.metaText}>
                  {dateText}
                </Text>
              </View>
            )}

            {/* ÖZET */}
            {!!announcement.summary?.trim() && (
              <Text style={styles.summary}>
                {announcement.summary}
              </Text>
            )}

            <View style={styles.divider} />

            {/* HTML İÇERİĞİ */}
            {!!announcement.content?.trim() ? (
              <RenderHTML
                contentWidth={contentWidth}
                source={{
                  html: announcement.content.replace(
                    /\n/g,
                    "<br/>"
                  ),
                }}
                baseStyle={{
                  fontSize: 15,
                  lineHeight: 24,
                  color: COLORS.text,
                }}
                tagsStyles={{
                  p: {
                    marginTop: 0,
                    marginBottom: 12,
                  },
                  img: {
                    marginVertical: 8,
                  },
                  a: {
                    color: COLORS.primary,
                  },
                }}
                defaultTextProps={{
                  selectable: true,
                }}
                renderersProps={{
                  img: {
                    enableExperimentalPercentWidth: true,
                  },
                }}
              />
            ) : (
              <Text style={styles.info}>
                Duyuru açıklaması bulunmuyor.
              </Text>
            )}

            {/* GÖRÜNTÜLENME */}
            <View style={styles.viewsRow}>
              <Ionicons
                name="eye-outline"
                size={16}
                color={COLORS.muted}
              />

              <Text style={styles.metaText}>
                {announcement.hit ?? 0}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 45,
  },

  inner: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: 12,
    padding: 24,
  },

  info: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
    height: 44,
  },

  backText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "600",
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    elevation: 2,
  },

  // GÖRSEL ALANI
  imageWrapper: {
    width: "100%",
    height: 230,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  // SABİT 300 x 230
  coverImage: {
    width: 450,
    height: 400,
  },

  body: {
    padding: 18,
  },

  title: {
    fontSize: 23,
    lineHeight: 31,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 12,
  },

  summary: {
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.text,
    marginBottom: 16,
    fontWeight: "500",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 15,
  },

  metaText: {
    fontSize: 12,
    color: COLORS.muted,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },

  viewsRow: {
    marginTop: 18,
    paddingTop: 13,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  retry: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },

  retryText: {
    color: COLORS.white,
    fontWeight: "600",
  },
});

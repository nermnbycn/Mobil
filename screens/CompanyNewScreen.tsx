
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from "../redux/Store";
import {
  fetchGroupNews,
  type GroupNew,
} from "../redux/slices/GroupNewSlice";
import { useHeaderScroll } from "../context/HeaderScrollContext";

// HABER GÖRSELLERİ
const EKIP_IMAGE = require("../assets/uploads/announcement/ekip.jpg");
const EKIP2_IMAGE = require("../assets/uploads/announcement/ekip2.png");

const COLORS = {
  primary: "#1D2749",
  background: "#F7F8FA",
  white: "#FFFFFF",
  text: "#202638",
  muted: "#8E96A7",
  border: "#E7E9F0",
  softBlue: "#EEF2F8",
};

const HORIZONTAL_PADDING = 18;
const MAX_CONTENT_WIDTH = 900;

type NewsNavigation = NativeStackNavigationProp<{
  GroupNewsDetail: {
    newsId: string;
  };
}>;

// BAŞLIĞA GÖRE HABER GÖRSELİ
function getNewsImage(title?: string | null) {
  const normalizedTitle = (title ?? "")
    .toLocaleLowerCase("tr-TR")
    .trim()
    .replace(/\s+/g, " ");

  if (
    normalizedTitle ===
    "dijital dönüşüm projelerimiz hız kesmeden devam ediyor"
  ) {
    return EKIP_IMAGE;
  }

  return EKIP2_IMAGE;
}

// HTML İÇERİĞİNİ DÜZ METNE ÇEVİR
function toPlainText(value?: string | null): string {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .trim();
}

// TARİH FORMATLAMA
function formatDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function GroupNewsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NewsNavigation>();
  const { setCollapsed } = useHeaderScroll();
  const { width } = useWindowDimensions();

  const { news, loading, error } = useSelector(
    (state: RootState) => state.groupNew
  );

  const cardWidth = Math.min(
    Math.max(width - HORIZONTAL_PADDING * 2, 1),
    MAX_CONTENT_WIDTH
  );

  // HABER DETAYINA GİT
  const handleNewsPress = (newsId: string) => {
    navigation.navigate("GroupNewsDetail", {
      newsId,
    });
  };

  // HABERLERİ YENİLE
  const refreshNews = useCallback(() => {
    dispatch(fetchGroupNews());
  }, [dispatch]);

  // İLK YÜKLEME
  useEffect(() => {
    refreshNews();
  }, [refreshNews]);

  // HEADER KONTROL
  useFocusEffect(
    useCallback(() => {
      setCollapsed(false);

      return () => {
        setCollapsed(false);
      };
    }, [setCollapsed])
  );

  // HABER KARTI
  const renderNews = ({ item }: { item: GroupNew }) => {
    const dateLabel = formatDate(item.publishedAt);
    const excerpt = toPlainText(item.summary || item.content);

    return (
      <TouchableOpacity
        style={[
          styles.newsCard,
          { width: cardWidth },
        ]}
        activeOpacity={0.85}
        onPress={() => handleNewsPress(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`${
          item.title || "Haber"
        } detayını aç`}
      >
        {/* BAŞLIĞA GÖRE HABER GÖRSELİ */}
        <View style={styles.imageContainer}>
          <Image
            source={getNewsImage(item.title)}
            style={styles.newsImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.cardContent}>
          {/* TARİH */}
          {!!dateLabel && (
            <View style={styles.metaRow}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={COLORS.muted}
              />

              <Text style={styles.metaText}>
                {dateLabel}
              </Text>
            </View>
          )}

          {/* BAŞLIK */}
          <Text
            style={styles.newsTitle}
            numberOfLines={2}
          >
            {item.title || "Başlıksız haber"}
          </Text>

          {/* AÇIKLAMA */}
          {!!excerpt && (
            <Text
              style={styles.newsExcerpt}
              numberOfLines={3}
            >
              {excerpt}
            </Text>
          )}

          {/* DEVAMINI OKU */}
          <View style={styles.cardBottom}>
            <Text style={styles.readMore}>
              Devamını Oku
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color={COLORS.primary}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageScrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          setCollapsed(
            event.nativeEvent.contentOffset.y > 80
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshNews}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* SAYFA BAŞLIĞI */}
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <Text style={styles.pageTitle}>
              Bizden Haberler
            </Text>

            <Text style={styles.pageSubtitle}>
              Şirketimizden en yeni haberler ve duyurular
            </Text>
          </View>
        </View>

        {/* HABER LİSTESİ */}
        {loading && news.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text style={styles.infoText}>
              Haberler yükleniyor...
            </Text>
          </View>
        ) : error && news.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="alert-circle-outline"
              size={44}
              color={COLORS.muted}
            />

            <Text style={styles.infoText}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={refreshNews}
            >
              <Text style={styles.retryText}>
                Tekrar Dene
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={news}
            keyExtractor={(item) => item.id}
            renderItem={renderNews}
            numColumns={1}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="newspaper-outline"
                  size={44}
                  color={COLORS.muted}
                />

                <Text style={styles.infoText}>
                  Henüz haber paylaşılmamış.
                </Text>
              </View>
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  pageScroll: {
    flex: 1,
  },

  pageScrollContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },

  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 18,
    paddingBottom: 16,
  },

  headerInner: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },

  pageTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.primary,
  },

  pageSubtitle: {
    marginTop: 5,
    fontSize: 13,
    color: COLORS.muted,
  },

  list: {
    width: "100%",
  },

  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 28,
    alignItems: "center",
  },

  newsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 9,
  },

  imageContainer: {
    width: "100%",
    height: 190,
    backgroundColor: COLORS.softBlue,
  },

  newsImage: {
    width: "100%",
    height: "100%",
  },

  cardContent: {
    padding: 18,
  },

  metaRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 9,
  },

  metaText: {
    fontSize: 12,
    color: COLORS.muted,
  },

  newsTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "700",
    color: COLORS.text,
  },

  newsExcerpt: {
    marginTop: 9,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.muted,
  },

  cardBottom: {
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  readMore: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "700",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },

  infoText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },

  retryText: {
    color: COLORS.white,
    fontWeight: "600",
  },

  emptyContainer: {
    paddingVertical: 70,
    gap: 12,
    alignItems: "center",
  },
});

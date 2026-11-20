import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import RenderHTML from "react-native-render-html";
import type { AppDispatch, RootState } from "../redux/Store";
import { fetchGroupNewById } from "../redux/slices/GroupNewSlice";
import { useHeaderScroll } from "../context/HeaderScrollContext";
import { BASE_URL } from "../services/api";

const EKIP_IMAGE = require("../assets/uploads/announcement/ekip.jpg");

const COLORS = {
  primary: "#1D2749",
  background: "#F7F8FA",
  white: "#FFFFFF",
  text: "#202638",
  muted: "#8E96A7",
  border: "#E7E9F0",
};

type NewsStackParams = {
  GroupNewsDetail: { newsId: string };
};
type NewsDetailRoute = RouteProp<NewsStackParams, "GroupNewsDetail">;
type NewsDetailNavigation = NativeStackNavigationProp<
  NewsStackParams,
  "GroupNewsDetail"
>;

function formatDate(date?: string | null): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function GroupNewsDetailScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NewsDetailNavigation>();
  const route = useRoute<NewsDetailRoute>();
  const { newsId } = route.params;
  const { width } = useWindowDimensions();
  const { setCollapsed } = useHeaderScroll();
  const { selectedGroupNew, detailLoading, detailError } = useSelector(
    (state: RootState) => state.groupNew
  );

  useFocusEffect(
    useCallback(() => {
      setCollapsed(false);
      return () => setCollapsed(false);
    }, [setCollapsed])
  );

  useEffect(() => {
    dispatch(fetchGroupNewById(newsId));
  }, [dispatch, newsId]);

  const reloadNews = () => dispatch(fetchGroupNewById(newsId));
  const goBack = () => navigation.goBack();

  if (
    detailLoading ||
    (!detailError && selectedGroupNew !== null && selectedGroupNew.id !== newsId)
  ) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.infoText}>Haber yükleniyor...</Text>
      </View>
    );
  }

  if (detailError || !selectedGroupNew) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={42} color={COLORS.muted} />
        <Text style={styles.infoText}>{detailError || "Haber bulunamadı."}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={reloadNews}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goBack}>
          <Text style={styles.backText}>Haberlere Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const news = selectedGroupNew;
  const content = news.content || "";
  const formattedDate = formatDate(news.publishedAt);
  const contentWidth = Math.max(Math.min(width - 72, 864), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(event) => setCollapsed(event.nativeEvent.contentOffset.y > 50)}
    >
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          <Text style={styles.backText}>Haberlere Dön</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.imageWrapper}>
            <Image source={EKIP_IMAGE} style={styles.coverImage} resizeMode="contain" />
          </View>

          <View style={styles.body}>
            {news.isPinned ? (
              <View style={styles.pinnedRow}>
                <Ionicons name="pin" size={14} color={COLORS.primary} />
                <Text style={styles.pinnedText}>Sabitlenmiş Haber</Text>
              </View>
            ) : null}

            <Text style={styles.title}>{news.title}</Text>

            <View style={styles.metaRow}>
              {formattedDate ? (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={15} color={COLORS.muted} />
                  <Text style={styles.metaText}>{formattedDate}</Text>
                </View>
              ) : null}
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={16} color={COLORS.muted} />
                <Text style={styles.metaText}>{news.hit ?? 0} görüntülenme</Text>
              </View>
            </View>

            {news.summary ? <Text style={styles.summary}>{news.summary}</Text> : null}
            <View style={styles.divider} />
            <RenderHTML
              contentWidth={contentWidth}
              source={{
                html: content.replace(/\n/g, "<br/>"),
                baseUrl: `${BASE_URL.replace(/\/+$/, "")}/`,
              }}
              baseStyle={{ fontSize: 15, lineHeight: 24, color: COLORS.text }}
              tagsStyles={{
                p: { marginTop: 0, marginBottom: 12 },
                img: { marginVertical: 8 },
                a: { color: COLORS.primary },
              }}
              defaultTextProps={{ selectable: true }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 45 },
  inner: { width: "100%", maxWidth: 900, alignSelf: "center" },
  center: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: COLORS.background, padding: 24, gap: 12,
  },
  infoText: { color: COLORS.muted, fontSize: 14, textAlign: "center" },
  backButton: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginBottom: 18, height: 44,
  },
  backText: { fontSize: 18, fontWeight: "600", color: COLORS.primary },
  card: {
    backgroundColor: COLORS.white, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 17,
    overflow: "hidden", elevation: 2,
  },
  imageWrapper: {
    width: "100%", height: 250, alignItems: "center",
    justifyContent: "center", backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  coverImage: { width: 500, height: 500 },
  body: { padding: 18 },
  pinnedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  pinnedText: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  title: {
    fontSize: 23, lineHeight: 31, fontWeight: "800",
    color: COLORS.primary, marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    gap: 16, marginBottom: 15,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: COLORS.muted },
  summary: {
    fontSize: 15, lineHeight: 23, color: COLORS.text,
    marginBottom: 16, fontWeight: "500",
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 18 },
  retryButton: {
    backgroundColor: COLORS.primary, paddingHorizontal: 20,
    paddingVertical: 11, borderRadius: 10,
  },
  retryText: { color: COLORS.white, fontWeight: "600" },
});

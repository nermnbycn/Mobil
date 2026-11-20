import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../redux/Store";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  clearNotificationActionError,
  type NotificationItem,
} from "../redux/slices/NotificationSlice";
import { useHeaderScroll } from "../context/HeaderScrollContext";

const COLORS = {
  navy: "#1D2749",
  background: "#F7F8FA",
  white: "#FFFFFF",
  text: "#202638",
  muted: "#8E96A7",
  border: "#E7E9F0",
  blue: "#3563B7",
  blueSoft: "#EFF4FF",
  red: "#CC4040",
  redSoft: "#FFF1F0",
  orange: "#C47C16",
  orangeSoft: "#FFF5E8",
  green: "#16805C",
  greenSoft: "#EAF7F0",
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function appearance(item: NotificationItem) {
  const title = (item.title ?? "").toLocaleLowerCase("tr-TR");
  if (title.includes("süresi doldu"))
    return { icon: "alert-circle-outline" as const, color: COLORS.red, bg: COLORS.redSoft };
  if (title.includes("yaklaşıyor"))
    return { icon: "time-outline" as const, color: COLORS.orange, bg: COLORS.orangeSoft };
  if (item.surveyTask)
    return { icon: "clipboard-outline" as const, color: COLORS.green, bg: COLORS.greenSoft };
  return { icon: "notifications-outline" as const, color: COLORS.blue, bg: COLORS.blueSoft };
}

export default function NotificationScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { setCollapsed } = useHeaderScroll();
  const {
    notifications, loading, error, countError,
    markingIds, actionError,
  } = useSelector((state: RootState) => state.notification);

  const [onlyUnread, setOnlyUnread] = useState(true);
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  const reload = useCallback((unread: boolean) => {
    void dispatch(fetchNotifications(unread));
    void dispatch(fetchUnreadCount());
  }, [dispatch]);

  useFocusEffect(useCallback(() => {
    setCollapsed(false);
    reload(onlyUnread);
    return () => setCollapsed(false);
  }, [reload, onlyUnread, setCollapsed]));

  const changeFilter = useCallback((unread: boolean) => {
    if (onlyUnread === unread) return;
    setOnlyUnread(unread);
  }, [onlyUnread]);

  const refresh = useCallback(() => reload(onlyUnread), [reload, onlyUnread]);

  const sortedNotifications = useMemo(() =>
    [...notifications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [notifications]
  );

  const openNotification = useCallback(async (item: NotificationItem) => {
    setSelected(item);
    if (item.isRead || markingIds.includes(item.id)) return;
    const result = await dispatch(markNotificationRead(item.id));
    if (markNotificationRead.fulfilled.match(result)) {
      setSelected((current) => current?.id === item.id ? { ...current, isRead: true } : current);
      void dispatch(fetchUnreadCount());
    }
  }, [dispatch, markingIds]);

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const visual = appearance(item);
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.unreadCard]}
        activeOpacity={0.85}
        onPress={() => { void openNotification(item); }}
      >
        <View style={[styles.iconBox, { backgroundColor: visual.bg }]}>
          <Ionicons name={visual.icon} size={22} color={visual.color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, !item.isRead && styles.bold]} numberOfLines={2}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.dot} />}
          </View>
          {!!item.description && <Text style={styles.description} numberOfLines={3}>{item.description}</Text>}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{formatDate(item.date)}</Text>
            {!!item.type?.name && (
              <View style={styles.tag}><Text style={styles.tagText}>{item.type.name}</Text></View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => setCollapsed(event.nativeEvent.contentOffset.y > 80)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={COLORS.navy}
            colors={[COLORS.navy]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Bildirimler</Text>
            <Text style={styles.subtitle}>Güncel bildirimlerinizi takip edin</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterButton, onlyUnread && styles.filterActive]}
                onPress={() => changeFilter(true)}
              >
                <Text style={[styles.filterText, onlyUnread && styles.filterTextActive]}>
                  Okunmamış Bildirimler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, !onlyUnread && styles.filterActive]}
                onPress={() => changeFilter(false)}
              >
                <Text style={[styles.filterText, !onlyUnread && styles.filterTextActive]}>
                  Tüm Bildirimler
                </Text>
              </TouchableOpacity>
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!countError && <Text style={styles.error}>Okunmamış sayısı: {countError}</Text>}
            {!!actionError && (
              <TouchableOpacity onPress={() => dispatch(clearNotificationActionError())}>
                <Text style={styles.error}>{actionError} (Kapat)</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.navy} />
            ) : (
              <Ionicons name="notifications-off-outline" size={44} color={COLORS.muted} />
            )}
            <Text style={styles.emptyText}>
              {loading ? "Bildirimler yükleniyor..." : error ? "Liste yüklenemedi." : onlyUnread ? "Okunmamış bildirim yok." : "Bildirim bulunamadı."}
            </Text>
            {!!error && (
              <TouchableOpacity onPress={refresh}><Text style={styles.retryText}>Tekrar Dene</Text></TouchableOpacity>
            )}
          </View>
        }
      />
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selected?.title}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={24} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDate}>{selected ? formatDate(selected.date) : ""}</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>{selected?.description || "Açıklama bulunmuyor."}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelected(null)}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 16, paddingBottom: 35, flexGrow: 1 },
  header: { marginBottom: 20 },
  pageTitle: { fontSize: 25, fontWeight: "800", color: COLORS.navy },
  subtitle: { marginTop: 5, fontSize: 13, color: COLORS.muted },
  filterRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  filterButton: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  filterText: { fontSize: 12, fontWeight: "700", color: COLORS.muted, textAlign: "center" },
  filterTextActive: { color: COLORS.white },
  card: { flexDirection: "row", backgroundColor: COLORS.white, borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  unreadCard: { backgroundColor: "#F8FAFF", borderColor: "#C9D8F3" },
  iconBox: { width: 43, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text, flex: 1, lineHeight: 20 },
  bold: { fontWeight: "800", color: COLORS.navy },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.blue, marginTop: 5 },
  description: { marginTop: 6, fontSize: 13, lineHeight: 20, color: COLORS.muted },
  metaRow: { marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  meta: { fontSize: 11, color: COLORS.muted },
  tag: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.blueSoft },
  tagText: { fontSize: 10, fontWeight: "700", color: COLORS.blue },
  error: { marginTop: 10, color: COLORS.red, fontSize: 12 },
  empty: { paddingVertical: 75, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 13, color: COLORS.muted, textAlign: "center" },
  retryText: { color: COLORS.navy, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(13,27,53,0.55)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.navy },
  modalDate: { marginTop: 10, fontSize: 12, color: COLORS.muted },
  modalScroll: { marginTop: 16, flexGrow: 0 },
  modalDescription: { fontSize: 14, lineHeight: 23, color: COLORS.text },
  closeButton: { marginTop: 23, padding: 13, borderRadius: 12, backgroundColor: COLORS.navy, alignItems: "center" },
  closeText: { color: COLORS.white, fontWeight: "700" },
});

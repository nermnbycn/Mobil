import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../../services/api";

export interface NotificationItem {
  id: string;
  title: string;
  description: string | null;
  type: { id: string; name: string } | null;
  link: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  surveyTask: { participantId: string; surveyId: string } | null;
  date: string;
  isRead: boolean;
}

interface NotificationState {
  notifications: NotificationItem[];
  loading: boolean;
  error: string | null;
  onlyUnread: boolean;
  currentRequestId: string | null;
  unreadCount: number;
  countLoading: boolean;
  countError: string | null;
  markingIds: string[];
  actionError: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  loading: false,
  error: null,
  onlyUnread: false,
  currentRequestId: null,
  unreadCount: 0,
  countLoading: false,
  countError: null,
  markingIds: [],
  actionError: null,
};

async function postNotification(endpoint: string, body?: object): Promise<unknown> {
  const token = await SecureStore.getItemAsync("authToken");
  if (!token) throw new Error("Oturum bulunamadı. Tekrar giriş yapın.");

  const response = await fetch(
    `${BASE_URL.replace(/\/+$/, "")}/api/Notification/${endpoint}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }
  );

  const raw = await response.text();
  let result: unknown = null;
  if (raw) {
    try {
      result = JSON.parse(raw);
    } catch {
      if (response.ok) throw new Error("Sunucu geçerli JSON döndürmedi.");
    }
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error("Oturum süresi dolmuş veya token geçersiz.");
    if (response.status === 403) throw new Error("Bu işlem için erişim yetkiniz yok.");
    throw new Error(`Bildirim işlemi başarısız (HTTP ${response.status}).`);
  }
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const envelope = result as { success?: boolean; message?: string };
    if (envelope.success === false) {
      throw new Error(envelope.message || "Bildirim işlemi başarısız.");
    }
  }
  return result;
}

function getData(result: unknown): unknown {
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result) {
    return (result as { data: unknown }).data;
  }
  return result;
}

// POST /api/Notification/getMyNotification
// Swagger body: { "onlyUnread": true | false }
export const fetchNotifications = createAsyncThunk<
  NotificationItem[],
  boolean | undefined,
  { rejectValue: string }
>("notification/fetchNotifications", async (onlyUnread = false, { rejectWithValue }) => {
  try {
    const data = getData(await postNotification("getMyNotification", { onlyUnread }));
    if (!Array.isArray(data)) throw new Error("API yanıtında bildirim listesi bulunamadı.");
    return data as NotificationItem[];
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Bildirimler alınamadı.");
  }
});

// POST /api/Notification/getUnreadCountNotification — body yok
// Swagger response: { data: 4, success: true, ... }
export const fetchUnreadCount = createAsyncThunk<number, void, { rejectValue: string }>(
  "notification/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const data = getData(await postNotification("getUnreadCountNotification"));
      if (typeof data !== "number" || !Number.isFinite(data)) {
        throw new Error("Okunmamış bildirim sayısı geçersiz.");
      }
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Sayı alınamadı.");
    }
  }
);

// POST /api/Notification/markAsReadNotification
// Swagger body: { "ids": ["uuid"] }
export const markNotificationRead = createAsyncThunk<string, string, { rejectValue: string }>(
  "notification/markNotificationRead",
  async (id, { rejectWithValue }) => {
    try {
      await postNotification("markAsReadNotification", { ids: [id] });
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Okundu bilgisi kaydedilemedi.");
    }
  }
);

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    clearNotifications: () => initialState,
    clearNotificationActionError: (state) => { state.actionError = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.onlyUnread = action.meta.arg ?? false;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.notifications = action.payload;
        state.error = null;
        state.currentRequestId = null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.error = action.payload ?? "Bildirimler yüklenemedi.";
        state.currentRequestId = null;
      })
      .addCase(fetchUnreadCount.pending, (state) => {
        state.countLoading = true;
        state.countError = null;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.countLoading = false;
        state.unreadCount = action.payload;
        state.countError = null;
      })
      .addCase(fetchUnreadCount.rejected, (state, action) => {
        state.countLoading = false;
        state.countError = action.payload ?? "Sayı alınamadı.";
      })
      .addCase(markNotificationRead.pending, (state, action) => {
        state.actionError = null;
        if (!state.markingIds.includes(action.meta.arg)) state.markingIds.push(action.meta.arg);
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.markingIds = state.markingIds.filter((id) => id !== action.payload);
        if (state.onlyUnread) {
          state.notifications = state.notifications.filter((item) => item.id !== action.payload);
        } else {
          const item = state.notifications.find((n) => n.id === action.payload);
          if (item) item.isRead = true;
        }
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        state.markingIds = state.markingIds.filter((id) => id !== action.meta.arg);
        state.actionError = action.payload ?? "Okundu işlemi başarısız.";
      });
  },
});

export const { clearNotifications, clearNotificationActionError } = notificationSlice.actions;
export default notificationSlice.reducer;

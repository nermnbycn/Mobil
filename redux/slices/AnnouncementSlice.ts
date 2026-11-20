import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../../services/api";

// Swagger: /api/Announcement/getList ve /api/Announcement/getById
export interface Announcement {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  imageUrl: string | null;
  publishedAt: string;
  expiresAt: string | null;
  isPinned: boolean;
  companyId: string | null;
  hit: number;
}

interface AnnouncementState {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  selectedAnnouncement: Announcement | null;
  detailLoading: boolean;
  detailError: string | null;
}

const initialState: AnnouncementState = {
  announcements: [],
  loading: false,
  error: null,
  selectedAnnouncement: null,
  detailLoading: false,
  detailError: null,
};

async function fetchWithAuth(endpoint: string, body: object): Promise<unknown> {
  const token = await SecureStore.getItemAsync("authToken");
  if (!token) throw new Error("Oturum bulunamadı. Tekrar giriş yapın.");

  const url = `${BASE_URL.replace(/\/+$/, "")}${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let result: unknown = null;
  if (text.trim()) {
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(`Sunucu geçerli JSON döndürmedi (HTTP ${response.status}).`);
    }
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error("Oturum süresi dolmuş veya token geçersiz.");
    if (response.status === 403) throw new Error("Duyurulara erişim yetkiniz yok.");
    if (response.status === 404) throw new Error("Duyuru endpoint'i veya kayıt bulunamadı.");
    const obj = result && typeof result === "object" ? result as Record<string, unknown> : null;
    const message = typeof obj?.message === "string" ? obj.message : `HTTP ${response.status}`;
    throw new Error(`Duyuru isteği başarısız: ${message}`);
  }
  return result;
}

function isAnnouncement(value: unknown): value is Announcement {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const a = value as Record<string, unknown>;
  return typeof a.id === "string" && typeof a.title === "string";
}

function readList(result: unknown): Announcement[] {
  if (!result || typeof result !== "object") {
    throw new Error("API geçersiz duyuru listesi döndürdü.");
  }
  const root = result as Record<string, unknown>;
  const data = Array.isArray(result) ? result : root.data;
  let items: unknown = data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const wrapper = data as Record<string, unknown>;
    items = wrapper.items ?? wrapper.results;
  }
  if (!Array.isArray(items) || !items.every(isAnnouncement)) {
    throw new Error("API yanıtındaki duyuru listesi beklenen formatta değil.");
  }
  return items;
}

function readDetail(result: unknown, id: string): Announcement {
  if (!result || typeof result !== "object") {
    throw new Error("API geçersiz duyuru detayı döndürdü.");
  }
  const root = result as Record<string, unknown>;
  const data = root.data ?? result;
  // Bazı sunucular getById sonucunu {data: {...}}, bazıları {data: [{...}]} döndürebilir.
  const item = Array.isArray(data) ? data.find((entry) => isAnnouncement(entry) && entry.id === id) : data;
  if (!isAnnouncement(item) || item.id !== id) {
    throw new Error("İstenen duyuru detayı bulunamadı.");
  }
  return item;
}

// Mevcut listeleme işlemi aynen kullanılmaya devam ediyor.
export const fetchAnnouncements = createAsyncThunk<
  Announcement[],
  void,
  { rejectValue: string }
>("announcement/fetchAnnouncements", async (_, { rejectWithValue }) => {
  try {
    const result = await fetchWithAuth("/api/Announcement/getList", {
      kind: 0,
      page: 1,
      pageSize: 20,
    });
    return readList(result);
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Duyurular yüklenemedi.");
  }
});

// Swagger: POST /api/Announcement/getById body {"id": "UUID"}
export const fetchAnnouncementById = createAsyncThunk<
  Announcement,
  string,
  { rejectValue: string }
>("announcement/fetchAnnouncementById", async (announcementId, { rejectWithValue }) => {
  try {
    if (!announcementId.trim()) throw new Error("Duyuru ID bilgisi eksik.");
    const result = await fetchWithAuth("/api/Announcement/getById", {
      id: announcementId,
    });
    return readDetail(result, announcementId);
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Duyuru detayı yüklenemedi.");
  }
});

const announcementSlice = createSlice({
  name: "announcement",
  initialState,
  reducers: {
    clearAnnouncements: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnnouncements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements = action.payload;
        state.error = null;
      })
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Duyurular yüklenemedi.";
      })
      .addCase(fetchAnnouncementById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
        state.selectedAnnouncement = null;
      })
      .addCase(fetchAnnouncementById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selectedAnnouncement = action.payload;
        state.detailError = null;
      })
      .addCase(fetchAnnouncementById.rejected, (state, action) => {
        state.detailLoading = false;
        state.selectedAnnouncement = null;
        state.detailError = action.payload ?? "Duyuru detayı yüklenemedi.";
      });
  },
});

export const { clearAnnouncements } = announcementSlice.actions;
export default announcementSlice.reducer;

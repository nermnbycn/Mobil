
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../../services/api";

// =====================================================
// DUYURU MODELİ
// =====================================================
export interface Announcement {
  id: number;
  tenantId: number | null;
  createTime: string | null;
  createdBy: string | null;
  updateTime: string | null;
  updatedBy: string | null;
  isDeleted: boolean;
  deleteTime: string | null;
  deletedBy: string | null;
  title: string;
  content: string | null;
  imageUrl: string | null;
  hit: number;
}

// =====================================================
// REDUX STATE
// =====================================================
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

// =====================================================
// API İSTEK YARDIMCISI
// =====================================================
async function fetchWithAuth(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: object
): Promise<unknown> {
  const token = await SecureStore.getItemAsync("authToken");

  if (!token) {
    throw new Error("Oturum bulunamadı. Tekrar giriş yapın.");
  }

  const url = `${BASE_URL}${endpoint}`;

  console.log("[ANNOUNCEMENT] İstek:", method, url);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  console.log("[ANNOUNCEMENT] HTTP:", response.status);

  const responseText = await response.text();

  let result: unknown = null;

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error("API geçerli JSON döndürmedi.");
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Oturum süresi dolmuş veya token geçersiz.");
    }

    if (response.status === 403) {
      throw new Error("Duyurulara erişim yetkiniz yok.");
    }

    if (response.status === 404) {
      throw new Error("Duyuru endpoint'i veya kayıt bulunamadı.");
    }

    const errorData =
      result && typeof result === "object"
        ? (result as Record<string, unknown>)
        : null;

    const message =
      typeof errorData?.message === "string"
        ? errorData.message
        : `HTTP ${response.status}`;

    throw new Error(`Duyurular alınamadı: ${message}`);
  }

  return result;
}

// =====================================================
// LİSTE RESPONSE DİZİSİNİ ÇIKAR
// =====================================================
function extractAnnouncements(result: unknown): Announcement[] {
  if (Array.isArray(result)) {
    return result as Announcement[];
  }

  if (!result || typeof result !== "object") {
    throw new Error("API geçersiz duyuru yanıtı döndürdü.");
  }

  const response = result as Record<string, unknown>;
  const data = response.data;

  // { data: [...] }
  if (Array.isArray(data)) {
    return data as Announcement[];
  }

  // { data: { items: [...] } }
  // { data: { results: [...] } }
  if (data && typeof data === "object") {
    const pagination = data as Record<string, unknown>;

    if (Array.isArray(pagination.items)) {
      return pagination.items as Announcement[];
    }

    if (Array.isArray(pagination.results)) {
      return pagination.results as Announcement[];
    }
  }

  console.error(
    "[ANNOUNCEMENT] Beklenmeyen response alanları:",
    Object.keys(response)
  );

  throw new Error("API yanıtında duyuru listesi bulunamadı.");
}

// =====================================================
// DUYURULARI GETİR
// POST /api/Announcement/getList
// =====================================================
export const fetchAnnouncements = createAsyncThunk<
  Announcement[],
  void,
  { rejectValue: string }
>(
  "announcement/fetchAnnouncements",
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchWithAuth(
        "/api/Announcement/getList",
        "POST",
        {
          kind: 0,
          page: 1,
          pageSize: 20,
        }
      );

      const announcements = extractAnnouncements(result);

      console.log(
        "[ANNOUNCEMENT] Gelen duyuru sayısı:",
        announcements.length
      );

      return announcements;
    } catch (error) {
      console.error("[ANNOUNCEMENT] Liste hatası:", error);

      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Duyurular yüklenirken bir hata oluştu."
      );
    }
  }
);

// =====================================================
// DUYURU DETAYINI GETİR
// Mevcut endpoint korunuyor.
// =====================================================
export const fetchAnnouncementById = createAsyncThunk<
  Announcement,
  number,
  { rejectValue: string }
>(
  "announcement/fetchAnnouncementById",
  async (announcementId, { rejectWithValue }) => {
    try {
      const result = await fetchWithAuth(
        `/api/Announcement/${announcementId}`
      );

      const response = result as {
        data?: Announcement;
      } & Announcement;

      // Yeni API data nesnesi döndürüyorsa onu kullan.
      // Eski API doğrudan nesne döndürüyorsa onu kullan.
      const announcement = response?.data ?? response;

      if (!announcement || !announcement.id) {
        throw new Error("Duyuru detayı bulunamadı.");
      }

      return announcement;
    } catch (error) {
      console.error("[ANNOUNCEMENT] Detay hatası:", error);

      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Duyuru getirilemedi."
      );
    }
  }
);

// =====================================================
// REDUX SLICE
// =====================================================
const announcementSlice = createSlice({
  name: "announcement",
  initialState,

  reducers: {
    clearAnnouncements: () => initialState,
  },

  extraReducers: (builder) => {
    builder

      // DUYURU LİSTESİ YÜKLENİYOR
      .addCase(fetchAnnouncements.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.announcements = [];
      })

      // DUYURU LİSTESİ BAŞARILI
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements = action.payload;
        state.error = null;
      })

      // DUYURU LİSTESİ HATALI
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        state.loading = false;
        state.announcements = [];
        state.error =
          action.payload ??
          "Duyurular yüklenirken bir hata oluştu.";
      })

      // DUYURU DETAYI YÜKLENİYOR
      .addCase(fetchAnnouncementById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
        state.selectedAnnouncement = null;
      })

      // DUYURU DETAYI BAŞARILI
      .addCase(fetchAnnouncementById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selectedAnnouncement = action.payload;
        state.detailError = null;
      })

      // DUYURU DETAYI HATALI
      .addCase(fetchAnnouncementById.rejected, (state, action) => {
        state.detailLoading = false;
        state.selectedAnnouncement = null;
        state.detailError =
          action.payload ?? "Duyuru getirilemedi.";
      });
  },
});

export const { clearAnnouncements } = announcementSlice.actions;

export default announcementSlice.reducer;

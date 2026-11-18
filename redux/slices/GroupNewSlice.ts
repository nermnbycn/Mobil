
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../../services/api";

// =====================================================
// HABER MODELİ
// =====================================================
export interface GroupNew {
  id: number;
  tenantId: number | null;
  createTime: string | null;
  createdBy: string | null;
  updateTime: string | null;
  updatedBy: string | null;
  isDeleted: boolean;
  deleteTime: string | null;
  deletedBy: string | null;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  hit: number;
}

// =====================================================
// REDUX STATE
// =====================================================
interface GroupNewState {
  news: GroupNew[];
  loading: boolean;
  error: string | null;

  selectedGroupNew: GroupNew | null;
  detailLoading: boolean;
  detailError: string | null;
}

const initialState: GroupNewState = {
  news: [],
  loading: false,
  error: null,

  selectedGroupNew: null,
  detailLoading: false,
  detailError: null,
};

// =====================================================
// JWT İLE API İSTEĞİ
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

  console.log("[GROUP NEW] İstek:", method, url);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  console.log("[GROUP NEW] HTTP:", response.status);

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
      throw new Error("Haberlere erişim yetkiniz yok.");
    }

    if (response.status === 404) {
      throw new Error("Haber endpoint'i veya kayıt bulunamadı.");
    }

    const errorData =
      result && typeof result === "object"
        ? (result as Record<string, unknown>)
        : null;

    const message =
      typeof errorData?.message === "string"
        ? errorData.message
        : `HTTP ${response.status}`;

    throw new Error(`Haberler alınamadı: ${message}`);
  }

  return result;
}

// =====================================================
// HABER LİSTESİNİ RESPONSE İÇİNDEN ÇIKAR
// =====================================================
function extractGroupNews(result: unknown): GroupNew[] {
  if (Array.isArray(result)) {
    return result as GroupNew[];
  }

  if (!result || typeof result !== "object") {
    throw new Error("API geçersiz haber yanıtı döndürdü.");
  }

  const response = result as Record<string, unknown>;
  const data = response.data;

  // { data: [...] }
  if (Array.isArray(data)) {
    return data as GroupNew[];
  }

  // { data: { items: [...] } }
  // { data: { results: [...] } }
  if (data && typeof data === "object") {
    const pagination = data as Record<string, unknown>;

    if (Array.isArray(pagination.items)) {
      return pagination.items as GroupNew[];
    }

    if (Array.isArray(pagination.results)) {
      return pagination.results as GroupNew[];
    }
  }

  console.error(
    "[GROUP NEW] Beklenmeyen response alanları:",
    Object.keys(response)
  );

  throw new Error("API yanıtında haber listesi bulunamadı.");
}

// =====================================================
// HABERLERİ GETİR
// POST /api/GroupNew/getList
// =====================================================
export const fetchGroupNews = createAsyncThunk<
  GroupNew[],
  void,
  { rejectValue: string }
>(
  "groupNew/fetchGroupNews",
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchWithAuth(
        "/api/News/getList",
        "POST",
        {
          page: 1,
          pageSize: 20,
        }
      );

      const news = extractGroupNews(result);

      console.log("[GROUP NEW] Gelen haber sayısı:", news.length);

      return news;
    } catch (error) {
      console.error("[GROUP NEW] Liste hatası:", error);

      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Haberler yüklenirken bir hata oluştu."
      );
    }
  }
);

// =====================================================
// HABER DETAYINI GETİR
// Mevcut GET endpoint'i korundu.
// =====================================================
export const fetchGroupNewById = createAsyncThunk<
  GroupNew,
  number,
  { rejectValue: string }
>(
  "groupNew/fetchGroupNewById",
  async (newsId, { rejectWithValue }) => {
    try {
      const result = await fetchWithAuth(
        `/api/GroupNew/${newsId}`
      );

      const response = result as {
        data?: GroupNew;
      } & GroupNew;

      // Yeni API data nesnesi döndürüyorsa onu kullan.
      // Eski API doğrudan haber nesnesi döndürüyorsa onu kullan.
      const news = response?.data ?? response;

      if (!news || !news.id) {
        throw new Error("Haber detayı bulunamadı.");
      }

      return news;
    } catch (error) {
      console.error("[GROUP NEW] Detay hatası:", error);

      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Haber getirilemedi."
      );
    }
  }
);

// =====================================================
// REDUX SLICE
// =====================================================
const groupNewSlice = createSlice({
  name: "groupNew",
  initialState,

  reducers: {
    clearGroupNews: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      // HABERLER YÜKLENİYOR
      .addCase(fetchGroupNews.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.news = [];
      })

      // HABERLER BAŞARIYLA YÜKLENDİ
      .addCase(fetchGroupNews.fulfilled, (state, action) => {
        state.loading = false;
        state.news = action.payload;
        state.error = null;
      })

      // HABERLER YÜKLENEMEDİ
      .addCase(fetchGroupNews.rejected, (state, action) => {
        state.loading = false;
        state.news = [];
        state.error =
          action.payload ??
          "Haberler yüklenirken bir hata oluştu.";
      })

      // HABER DETAYI YÜKLENİYOR
      .addCase(fetchGroupNewById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
        state.selectedGroupNew = null;
      })

      // HABER DETAYI BAŞARILI
      .addCase(fetchGroupNewById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selectedGroupNew = action.payload;
        state.detailError = null;
      })

      // HABER DETAYI HATALI
      .addCase(fetchGroupNewById.rejected, (state, action) => {
        state.detailLoading = false;
        state.selectedGroupNew = null;
        state.detailError =
          action.payload ?? "Haber getirilemedi.";
      });
  },
});

export const { clearGroupNews } = groupNewSlice.actions;

export default groupNewSlice.reducer;

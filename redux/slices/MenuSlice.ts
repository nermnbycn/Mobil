
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../../services/api";

// =====================================================
// YEMEK MENÜSÜ MODELİ
// =====================================================
export interface FoodMenu {
  id: string;
  companyId: number | null;
  date: string;
  food1: string;
  food2: string;
  food3: string;
  food4: string;
  calorie1: number;
  calorie2: number;
  calorie3: number;
  calorie4: number;
}

interface MenuState {
  menus: FoodMenu[];
  loading: boolean;
  error: string | null;
}

const initialState: MenuState = {
  menus: [],
  loading: false,
  error: null,
};

// YENİ API ENDPOINT
const API_URL = `${BASE_URL}/api/Menu/getRemainingWeek`;

// =====================================================
// JWT İLE YEMEK MENÜLERİNİ GETİR
// Response: { data: [...] }
// =====================================================
export const fetchRemainingWeekMenus = createAsyncThunk<
  FoodMenu[],
  void,
  { rejectValue: string }
>(
  "menu/fetchRemainingWeekMenus",
  async (_, { rejectWithValue, signal }) => {
    try {
      const token = await SecureStore.getItemAsync("authToken");

      if (!token) {
        return rejectWithValue(
          "Oturum bulunamadı. Tekrar giriş yapın."
        );
      }

      console.log("[MENU] İstek:", API_URL);

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal,
      });

      console.log("[MENU] HTTP Status:", response.status);

      // Yanıtı JSON olarak al
      const result = await response.json();

      // =================================================
      // HTTP HATA KONTROLÜ
      // =================================================
      if (!response.ok) {
        console.error("[MENU] API hatası:", {
          status: response.status,
          message: result?.message,
        });

        if (response.status === 401) {
          return rejectWithValue(
            "Oturum süresi dolmuş veya token geçersiz."
          );
        }

        if (response.status === 403) {
          return rejectWithValue(
            "Yemek menülerine erişim yetkiniz yok."
          );
        }

        return rejectWithValue(
          result?.message ??
            `Yemek menüleri getirilemedi. HTTP ${response.status}`
        );
      }

      // =================================================
      // YENİ API RESPONSE YAPISI
      //
      // {
      //   "data": [
      //     { "id": 1, "menuDate": "...", ... },
      //     { "id": 2, "menuDate": "...", ... }
      //   ]
      // }
      // =================================================

      const menus = result?.data;

      // data alanının array olduğunu kontrol et
      if (!Array.isArray(menus)) {
        console.error(
          "[MENU] Beklenmeyen response yapısı:",
          result
        );

        return rejectWithValue(
          "API data alanında yemek listesi döndürmedi."
        );
      }

      console.log("[MENU] Gelen menü sayısı:", menus.length);

      return menus as FoodMenu[];
    } catch (error) {
      console.error("[MENU] API HATASI:", error);

      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "API bağlantısı kurulamadı."
      );
    }
  }
);

// =====================================================
// REDUX SLICE
// =====================================================
const menuSlice = createSlice({
  name: "menu",
  initialState,

  reducers: {
    clearMenus: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchRemainingWeekMenus.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.menus = [];
      })

      .addCase(fetchRemainingWeekMenus.fulfilled, (state, action) => {
        state.loading = false;
        state.menus = action.payload;
        state.error = null;
      })

      .addCase(fetchRemainingWeekMenus.rejected, (state, action) => {
        state.loading = false;
        state.menus = [];
        state.error =
          action.payload ?? "Yemek menüleri getirilemedi.";
      });
  },
});

export const { clearMenus } = menuSlice.actions;

export default menuSlice.reducer;

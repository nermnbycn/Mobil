
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../../services/api";

// =====================================================
// KULLANICI MODELİ
// =====================================================
export interface User {
  id: string;
  nameSurname: string;
  email?: string | null;
  dateofBirth?: string | null;
  startDate?: string | null;
  imageUrl?: string | null;
  daysUntilBirthday?: number;
  daysUntilAnniversary?: number;
}

type RequestStatus =
  | "idle"
  | "loading"
  | "succeeded"
  | "failed";

interface UserState {
  birthdayUsers: User[];
  anniversaryUsers: User[];
  weeklyBirthdays: User[];
  weeklyAnniversaries: User[];

  birthdayStatus: RequestStatus;
  anniversaryStatus: RequestStatus;
  weeklyBirthdayStatus: RequestStatus;
  weeklyAnniversaryStatus: RequestStatus;

  birthdayError: string | null;
  anniversaryError: string | null;
  weeklyBirthdayError: string | null;
  weeklyAnniversaryError: string | null;
}

// =====================================================
// BAŞLANGIÇ STATE
// =====================================================
const initialState: UserState = {
  birthdayUsers: [],
  anniversaryUsers: [],
  weeklyBirthdays: [],
  weeklyAnniversaries: [],

  birthdayStatus: "idle",
  anniversaryStatus: "idle",
  weeklyBirthdayStatus: "idle",
  weeklyAnniversaryStatus: "idle",

  birthdayError: null,
  anniversaryError: null,
  weeklyBirthdayError: null,
  weeklyAnniversaryError: null,
};

// =====================================================
// JWT İLE API İSTEĞİ
// =====================================================
async function fetchUsers(endpoint: string): Promise<User[]> {
  const token = await SecureStore.getItemAsync("authToken");

  if (!token) {
    throw new Error("Oturum bulunamadı. Tekrar giriş yapın.");
  }

  const url = `${BASE_URL}${endpoint}`;

  console.log("[Celebration] İstek:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  console.log("[Celebration] HTTP Status:", response.status);

  // Yanıtı tek sefer oku
  const responseText = await response.text();

  let result: unknown;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    console.error("[Celebration] Geçersiz JSON:", endpoint);
    throw new Error("API geçerli JSON döndürmedi.");
  }

  // =====================================================
  // HTTP HATA KONTROLÜ
  // =====================================================
  if (!response.ok) {
    const errorData =
      result !== null && typeof result === "object"
        ? (result as Record<string, unknown>)
        : null;

    const message =
      typeof errorData?.message === "string"
        ? errorData.message
        : typeof errorData?.detail === "string"
          ? errorData.detail
          : typeof errorData?.title === "string"
            ? errorData.title
            : `HTTP ${response.status}`;

    console.error("[Celebration] API Hatası:", {
      endpoint,
      status: response.status,
      message,
    });

    throw new Error(`Kullanıcılar getirilemedi: ${message}`);
  }

  // =====================================================
  // YENİ API RESPONSE KONTROLÜ
  //
  // Desteklenen yapılar:
  //
  // 1) [ { ... }, { ... } ]
  //
  // 2) {
  //      "data": [
  //        { ... },
  //        { ... }
  //      ]
  //    }
  // =====================================================

  let users: unknown;

  if (Array.isArray(result)) {
    users = result;
  } else if (
    result !== null &&
    typeof result === "object" &&
    "data" in result
  ) {
    users = result.data;
  }

  if (!Array.isArray(users)) {
    console.error(
      "[Celebration] Beklenmeyen response yapısı:",
      result !== null && typeof result === "object"
        ? Object.keys(result)
        : typeof result
    );

    throw new Error(
      "API beklenen kullanıcı listesini döndürmedi."
    );
  }

  console.log("[Celebration] Kullanıcı sayısı:", users.length);

  return users as User[];
}

// =====================================================
// BUGÜNKÜ DOĞUM GÜNLERİ
// GET /api/Celebration/getTodayBirthdays
// =====================================================
export const fetchBirthdayUsers = createAsyncThunk<User[], void>(
  "user/fetchBirthdayUsers",
  async () => {
    return fetchUsers("/api/Celebration/getTodayBirthdays");
  }
);

// =====================================================
// BUGÜNKÜ İŞ YIL DÖNÜMLERİ
// GET /api/Celebration/getTodayAnniversaries
// =====================================================
export const fetchAnniversaryUsers = createAsyncThunk<User[], void>(
  "user/fetchAnniversaryUsers",
  async () => {
    return fetchUsers("/api/Celebration/getTodayAnniversaries");
  }
);

// =====================================================
// HAFTALIK DOĞUM GÜNLERİ
// GET /api/Celebration/getWeekBirthdays
// =====================================================
export const fetchWeeklyBirthdays = createAsyncThunk<User[], void>(
  "user/fetchWeeklyBirthdays",
  async () => {
    return fetchUsers("/api/Celebration/getWeekBirthdays");
  }
);

// =====================================================
// HAFTALIK İŞ YIL DÖNÜMLERİ
// GET /api/Celebration/getWeekAnniversaries
// =====================================================
export const fetchWeeklyAnniversaries = createAsyncThunk<User[], void>(
  "user/fetchWeeklyAnniversaries",
  async () => {
    return fetchUsers("/api/Celebration/getWeekAnniversaries");
  }
);

// =====================================================
// REDUX SLICE
// =====================================================
const userSlice = createSlice({
  name: "user",
  initialState,

  reducers: {
    clearCelebrationUsers: () => initialState,
  },

  extraReducers: (builder) => {
    builder

      // =================================================
      // BUGÜNKÜ DOĞUM GÜNLERİ
      // =================================================
      .addCase(fetchBirthdayUsers.pending, (state) => {
        state.birthdayStatus = "loading";
        state.birthdayError = null;
        state.birthdayUsers = [];
      })
      .addCase(fetchBirthdayUsers.fulfilled, (state, action) => {
        state.birthdayStatus = "succeeded";
        state.birthdayUsers = action.payload;
        state.birthdayError = null;
      })
      .addCase(fetchBirthdayUsers.rejected, (state, action) => {
        state.birthdayStatus = "failed";
        state.birthdayError =
          action.error.message ?? "Doğum günleri getirilemedi.";
      })

      // =================================================
      // BUGÜNKÜ İŞ YIL DÖNÜMLERİ
      // =================================================
      .addCase(fetchAnniversaryUsers.pending, (state) => {
        state.anniversaryStatus = "loading";
        state.anniversaryError = null;
        state.anniversaryUsers = [];
      })
      .addCase(fetchAnniversaryUsers.fulfilled, (state, action) => {
        state.anniversaryStatus = "succeeded";
        state.anniversaryUsers = action.payload;
        state.anniversaryError = null;
      })
      .addCase(fetchAnniversaryUsers.rejected, (state, action) => {
        state.anniversaryStatus = "failed";
        state.anniversaryError =
          action.error.message ?? "İş yıl dönümleri getirilemedi.";
      })

      // =================================================
      // HAFTALIK DOĞUM GÜNLERİ
      // =================================================
      .addCase(fetchWeeklyBirthdays.pending, (state) => {
        state.weeklyBirthdayStatus = "loading";
        state.weeklyBirthdayError = null;
        state.weeklyBirthdays = [];
      })
      .addCase(fetchWeeklyBirthdays.fulfilled, (state, action) => {
        state.weeklyBirthdayStatus = "succeeded";
        state.weeklyBirthdays = action.payload;
        state.weeklyBirthdayError = null;
      })
      .addCase(fetchWeeklyBirthdays.rejected, (state, action) => {
        state.weeklyBirthdayStatus = "failed";
        state.weeklyBirthdayError =
          action.error.message ?? "Haftalık doğum günleri getirilemedi.";
      })

      // =================================================
      // HAFTALIK İŞ YIL DÖNÜMLERİ
      // =================================================
      .addCase(fetchWeeklyAnniversaries.pending, (state) => {
        state.weeklyAnniversaryStatus = "loading";
        state.weeklyAnniversaryError = null;
        state.weeklyAnniversaries = [];
      })
      .addCase(fetchWeeklyAnniversaries.fulfilled, (state, action) => {
        state.weeklyAnniversaryStatus = "succeeded";
        state.weeklyAnniversaries = action.payload;
        state.weeklyAnniversaryError = null;
      })
      .addCase(fetchWeeklyAnniversaries.rejected, (state, action) => {
        state.weeklyAnniversaryStatus = "failed";
        state.weeklyAnniversaryError =
          action.error.message ??
          "Haftalık iş yıl dönümleri getirilemedi.";
      });
  },
});

export const { clearCelebrationUsers } = userSlice.actions;

export default userSlice.reducer;

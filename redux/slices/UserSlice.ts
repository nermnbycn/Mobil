import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../../services/api";

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

type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

interface UserState {
  birthdayUsers: User[];
  anniversaryUsers: User[];
  weeklyBirthdays: User[];
  weeklyAnniversaries: User[];
  newJoiners: User[];

  birthdayStatus: RequestStatus;
  anniversaryStatus: RequestStatus;
  weeklyBirthdayStatus: RequestStatus;
  weeklyAnniversaryStatus: RequestStatus;
  newJoinersStatus: RequestStatus;

  birthdayError: string | null;
  anniversaryError: string | null;
  weeklyBirthdayError: string | null;
  weeklyAnniversaryError: string | null;
  newJoinersError: string | null;
}

const initialState: UserState = {
  birthdayUsers: [],
  anniversaryUsers: [],
  weeklyBirthdays: [],
  weeklyAnniversaries: [],
  newJoiners: [],

  birthdayStatus: "idle",
  anniversaryStatus: "idle",
  weeklyBirthdayStatus: "idle",
  weeklyAnniversaryStatus: "idle",
  newJoinersStatus: "idle",

  birthdayError: null,
  anniversaryError: null,
  weeklyBirthdayError: null,
  weeklyAnniversaryError: null,
  newJoinersError: null,
};

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
  const responseText = await response.text();
  let result: unknown;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    console.error("[Celebration] Geçersiz JSON:", endpoint);
    throw new Error("API geçerli JSON döndürmedi.");
  }

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

    throw new Error("API beklenen kullanıcı listesini döndürmedi.");
  }

  console.log("[Celebration] Kullanıcı sayısı:", users.length);
  return users as User[];
}

export const fetchBirthdayUsers = createAsyncThunk<User[], void>(
  "user/fetchBirthdayUsers",
  async () => fetchUsers("/api/Celebration/getTodayBirthdays")
);

export const fetchAnniversaryUsers = createAsyncThunk<User[], void>(
  "user/fetchAnniversaryUsers",
  async () => fetchUsers("/api/Celebration/getTodayAnniversaries")
);

export const fetchWeeklyBirthdays = createAsyncThunk<User[], void>(
  "user/fetchWeeklyBirthdays",
  async () => fetchUsers("/api/Celebration/getWeekBirthdays")
);

export const fetchWeeklyAnniversaries = createAsyncThunk<User[], void>(
  "user/fetchWeeklyAnniversaries",
  async () => fetchUsers("/api/Celebration/getWeekAnniversaries")
);

// Yeni çalışanlar: backend'de bu endpoint oluşturulacak.
export const fetchNewJoiners = createAsyncThunk<User[], void>(
  "user/fetchNewJoiners",
  async () => fetchUsers("/api/Celebration/getNewJoiners")
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearCelebrationUsers: () => initialState,
  },
  extraReducers: (builder) => {
    builder
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
          action.error.message ?? "Haftalık iş yıl dönümleri getirilemedi.";
      })
      .addCase(fetchNewJoiners.pending, (state) => {
        state.newJoinersStatus = "loading";
        state.newJoinersError = null;
        state.newJoiners = [];
      })
      .addCase(fetchNewJoiners.fulfilled, (state, action) => {
        state.newJoinersStatus = "succeeded";
        state.newJoiners = action.payload;
        state.newJoinersError = null;
      })
      .addCase(fetchNewJoiners.rejected, (state, action) => {
        state.newJoinersStatus = "failed";
        state.newJoinersError =
          action.error.message ?? "Yeni çalışanlar getirilemedi.";
      });
  },
});

export const { clearCelebrationUsers } = userSlice.actions;
export default userSlice.reducer;

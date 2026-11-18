
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

// =====================================================
// YENİ API LOGIN RESPONSE KULLANICI MODELİ
// =====================================================
export interface LoginUser {
  id: string;
  username: string;
  nameSurname: string;
  name: string;
  surname: string;
  eMail: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
  startDate: string | null;
  photo: string | null;

  activeModules?: string[];
  managedModules?: string[];

  domainName?: string | null;
  title?: string | null;
  registryNo?: string | null;
  managerRegistryNo?: string | null;
  roleName?: string | null;

  isManager?: boolean;
  isManagement?: boolean;

  tenant?: {
    id: string;
    name: string;
  } | null;

  company?: {
    id: string;
    name: string;
    logo?: string | null;
    color?: string | null;
  } | null;

  department?: {
    id: string;
    name: string;
  } | null;

  unit?: {
    id: string;
    name: string;
  } | null;

  position?: {
    id: string;
    name: string;
  } | null;

  level?: {
    id: string;
    name: string;
  } | null;

  role?: {
    id: string;
    name: string;
  } | null;

  seniority?: number;
  seniorityFormatted?: string | null;
}

// =====================================================
// UYGULAMANIN KULLANDIĞI PROFİL MODELİ
// =====================================================
export interface Profile {
  id: string;
  username: string;
  nameSurname: string;
  name: string;
  surname: string;

  email: string | null;
  phoneNumber: string | null;

  // Eski ekranlarla uyumluluk
  DateofBirth: string | null;
  StartDate: string | null;
  imageUrl: string | null;

  // Yeni API alanları
  birthDate: string | null;
  startDate: string | null;
  photo: string | null;

  activeModules: string[];
  managedModules: string[];

  roleName: string | null;
  isManager: boolean;
  isManagement: boolean;

  tenant: LoginUser["tenant"];
  company: LoginUser["company"];
  department: LoginUser["department"];
  unit: LoginUser["unit"];
  position: LoginUser["position"];
  level: LoginUser["level"];
  role: LoginUser["role"];

  title: string | null;
  registryNo: string | null;
  seniority: number;
  seniorityFormatted: string | null;
}

// =====================================================
// API KULLANICISINI PROFILE MODELİNE DÖNÜŞTÜR
// =====================================================
function mapLoginUserToProfile(user: LoginUser): Profile {
  return {
    id: user.id,
    username: user.username,
    nameSurname: user.nameSurname,
    name: user.name,
    surname: user.surname,

    email: user.eMail,
    phoneNumber: user.phoneNumber,

    DateofBirth: user.birthDate,
    StartDate: user.startDate,
    imageUrl: user.photo,

    birthDate: user.birthDate,
    startDate: user.startDate,
    photo: user.photo,

    activeModules: user.activeModules ?? [],
    managedModules: user.managedModules ?? [],

    roleName: user.roleName ?? null,
    isManager: user.isManager ?? false,
    isManagement: user.isManagement ?? false,

    tenant: user.tenant ?? null,
    company: user.company ?? null,
    department: user.department ?? null,
    unit: user.unit ?? null,
    position: user.position ?? null,
    level: user.level ?? null,
    role: user.role ?? null,

    title: user.title ?? null,
    registryNo: user.registryNo ?? null,
    seniority: user.seniority ?? 0,
    seniorityFormatted: user.seniorityFormatted ?? null,
  };
}

// =====================================================
// REDUX STATE
// =====================================================
interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
};

// =====================================================
// KAYDEDİLMİŞ LOGIN KULLANICISINI GETİR
// Artık API'ye GET /api/Profile/me isteği atılmaz.
// =====================================================
export const fetchMyProfile = createAsyncThunk<
  Profile,
  void,
  { rejectValue: string }
>(
  "profile/fetchMyProfile",
  async (_, { rejectWithValue }) => {
    try {
      const savedUser = await SecureStore.getItemAsync(
        "authUser"
      );

      if (!savedUser) {
        return rejectWithValue(
          "Kaydedilmiş kullanıcı bilgisi bulunamadı."
        );
      }

      const user: LoginUser = JSON.parse(savedUser);

      if (!user?.id) {
        return rejectWithValue(
          "Kullanıcı bilgileri geçersiz."
        );
      }

      return mapLoginUserToProfile(user);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Profil bilgileri okunamadı."
      );
    }
  }
);

// =====================================================
// PROFILE SLICE
// =====================================================
const profileSlice = createSlice({
  name: "profile",
  initialState,

  reducers: {
    // Login response'undan profili doğrudan Redux'a aktar
    setProfileFromLogin: (
      state,
      action: PayloadAction<LoginUser>
    ) => {
      state.profile = mapLoginUserToProfile(
        action.payload
      );
      state.loading = false;
      state.error = null;
    },

    // Logout sırasında profili temizle
    clearProfile: (state) => {
      state.profile = null;
      state.loading = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
      })

      .addCase(fetchMyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ?? "Profil bilgileri okunamadı.";
      });
  },
});

export const {
  setProfileFromLogin,
  clearProfile,
} = profileSlice.actions;

export default profileSlice.reducer;

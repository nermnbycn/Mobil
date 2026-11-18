
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

export interface Blog {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  categoryId: number | null;
  authorId: number | null;
  createdAt: string;
  viewCount: number;
  isActive: boolean;
}

export interface BlogCategory {
  id: number;
  name: string;
}

interface BlogState {
  blogs: Blog[];
  categories: BlogCategory[];
  loading: boolean;
  error: string | null;
  selectedBlog: Blog | null;
  detailLoading: boolean;
  detailError: string | null;
}

const initialState: BlogState = {
  blogs: [],
  categories: [],
  loading: false,
  error: null,
  selectedBlog: null,
  detailLoading: false,
  detailError: null,
};

const API_URL="https://hr-test-api.bi360.com.tr/";

// JWT TOKEN İLE API İSTEĞİ
async function fetchWithAuth<T>(endpoint: string): Promise<T> {
  const token = await SecureStore.getItemAsync("authToken");

  if (!token) {
    throw new Error("Oturum bulunamadı. Tekrar giriş yapın.");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API hatası: HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

// BLOG KATEGORİLERİ
export const fetchBlogCategories = createAsyncThunk<
  BlogCategory[],
  void,
  { rejectValue: string }
>("blog/fetchBlogCategories", async (_, { rejectWithValue }) => {
  try {
    return await fetchWithAuth<BlogCategory[]>(
      "/api/Blog/categories"
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Blog kategorileri getirilemedi."
    );
  }
});

// BLOG LİSTESİ
export const fetchBlogs = createAsyncThunk<
  Blog[],
  void,
  { rejectValue: string }
>("blog/fetchBlogs", async (_, { rejectWithValue }) => {
  try {
    return await fetchWithAuth<Blog[]>("/api/Blog");
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Bloglar getirilemedi."
    );
  }
});

// BLOG DETAYI
export const fetchBlogById = createAsyncThunk<
  Blog,
  number,
  { rejectValue: string }
>("blog/fetchBlogById", async (blogId, { rejectWithValue }) => {
  try {
    return await fetchWithAuth<Blog>(
      `/api/Blog/${blogId}`
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Blog getirilemedi."
    );
  }
});

const blogSlice = createSlice({
  name: "blog",
  initialState,

  reducers: {
    clearBlogData: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      // BLOG LİSTESİ
      .addCase(fetchBlogs.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.blogs = [];
      })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.loading = false;
        state.blogs = action.payload;
        state.error = null;
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Bloglar getirilemedi.";
      })

      // KATEGORİLER
      .addCase(fetchBlogCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.categories = [];
      })
      .addCase(fetchBlogCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchBlogCategories.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ?? "Blog kategorileri getirilemedi.";
      })

      // BLOG DETAYI
      .addCase(fetchBlogById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
        state.selectedBlog = null;
      })
      .addCase(fetchBlogById.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selectedBlog = action.payload;
        state.detailError = null;
      })
      .addCase(fetchBlogById.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError =
          action.payload ?? "Blog getirilemedi.";
      });
  },
});

export const { clearBlogData } = blogSlice.actions;

export default blogSlice.reducer;

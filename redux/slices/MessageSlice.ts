
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

const API_URL = "http://10.90.111.26:5277/api/Message";

// =====================================================
// MODELLER
// =====================================================

export type CelebrationType =
  | "birthday"
  | "anniversary"
  | "welcome";

export interface CelebrationMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderImageUrl: string | null;
  message: string;
  type: CelebrationType;
  createdAt: string;
  isRead: boolean;
  reactionEmoji: string | null;
}

export interface SendMessageRequest {
  senderId: string;
  receiverId: string;
  message: string;
  type: CelebrationType;
}

interface MessageActionRequest {
  messageId: string;
  userId: string;
}

interface ReactionRequest extends MessageActionRequest {
  emoji: string;
}

interface MessageState {
  messages: CelebrationMessage[];
  unreadCount: number;
  loading: boolean;
  sending: boolean;
  error: string | null;
}

const initialState: MessageState = {
  messages: [],
  unreadCount: 0,
  loading: false,
  sending: false,
  error: null,
};

// =====================================================
// API YARDIMCI FONKSİYONLARI
// =====================================================

async function getToken(): Promise<string> {
  const token = await SecureStore.getItemAsync("authToken");

  if (!token) {
    throw new Error("Oturum bulunamadı. Tekrar giriş yapın.");
  }

  return token;
}

async function checkResponse(response: Response): Promise<void> {
  if (response.ok) return;

  const errorText = await response.text();

  let message = errorText;

  try {
    const parsed = JSON.parse(errorText);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.message === "string"
    ) {
      message = parsed.message;
    }
  } catch {
    // JSON değilse sunucunun metin yanıtını kullan.
  }

  if (response.status === 401) {
    throw new Error("Oturum süresi dolmuş veya token geçersiz.");
  }

  if (response.status === 403) {
    throw new Error("Bu işlem için yetkiniz bulunmuyor.");
  }

  throw new Error(message || `HTTP ${response.status}`);
}

async function authorizedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  await checkResponse(response);

  return response;
}

// =====================================================
// KULLANICIYA GELEN MESAJLARI GETİR
// =====================================================

export const fetchMessages = createAsyncThunk<
  CelebrationMessage[],
  string,
  { rejectValue: string }
>(
  "message/fetchMessages",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await authorizedFetch(
        `${API_URL}?userId=${encodeURIComponent(userId)}`
      );

      return (await response.json()) as CelebrationMessage[];
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Mesajlar alınamadı."
      );
    }
  }
);

// =====================================================
// OKUNMAMIŞ MESAJ SAYISINI GETİR
// =====================================================

export const fetchUnreadCount = createAsyncThunk<
  number,
  string,
  { rejectValue: string }
>(
  "message/fetchUnreadCount",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await authorizedFetch(
        `${API_URL}/unread-count?userId=${encodeURIComponent(userId)}`
      );

      const data = (await response.json()) as {
        unreadCount: number;
      };

      return data.unreadCount;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Okunmamış mesaj sayısı alınamadı."
      );
    }
  }
);

// =====================================================
// KUTLAMA MESAJI GÖNDER
// birthday / anniversary / welcome
// =====================================================

export const sendMessage = createAsyncThunk<
  CelebrationMessage,
  SendMessageRequest,
  { rejectValue: string }
>(
  "message/sendMessage",
  async (data, { rejectWithValue }) => {
    try {
      const response = await authorizedFetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: data.senderId,
          receiverId: data.receiverId,
          message: data.message,
          type: data.type,
        }),
      });

      return (await response.json()) as CelebrationMessage;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Mesaj gönderilemedi."
      );
    }
  }
);

// =====================================================
// KUTLAMA YAPILMIŞ MI KONTROL ET
// birthday / anniversary / welcome
// =====================================================

export const checkHasCelebrated = createAsyncThunk<
  boolean,
  {
    receiverId: string;
    type: CelebrationType;
  },
  { rejectValue: string }
>(
  "message/checkHasCelebrated",
  async ({ receiverId, type }, { rejectWithValue }) => {
    try {
      const url =
        `${API_URL}/celebrated` +
        `?receiverId=${encodeURIComponent(receiverId)}` +
        `&type=${encodeURIComponent(type)}`;

      const response = await authorizedFetch(url);

      const result: unknown = await response.json();

      if (typeof result === "boolean") {
        return result;
      }

      if (result && typeof result === "object") {
        const data = result as {
          hasCelebrated?: boolean;
          data?: boolean | { hasCelebrated?: boolean };
        };

        return (
          data.hasCelebrated === true ||
          data.data === true ||
          (typeof data.data === "object" &&
            data.data?.hasCelebrated === true)
        );
      }

      return false;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Kutlama durumu kontrol edilemedi."
      );
    }
  }
);

// =====================================================
// MESAJI OKUNDU OLARAK İŞARETLE
// =====================================================

export const markMessageAsRead = createAsyncThunk<
  string,
  MessageActionRequest,
  { rejectValue: string }
>(
  "message/markAsRead",
  async (data, { rejectWithValue }) => {
    try {
      await authorizedFetch(
        `${API_URL}/${data.messageId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: data.userId,
          }),
        }
      );

      return data.messageId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Mesaj okundu olarak işaretlenemedi."
      );
    }
  }
);

// =====================================================
// MESAJI EMOJİ İLE YANITLA
// =====================================================

export const reactToMessage = createAsyncThunk<
  { messageId: string; emoji: string },
  ReactionRequest,
  { rejectValue: string }
>(
  "message/reactToMessage",
  async (data, { rejectWithValue }) => {
    try {
      await authorizedFetch(
        `${API_URL}/${data.messageId}/reaction`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: data.userId,
            emoji: data.emoji,
          }),
        }
      );

      return {
        messageId: data.messageId,
        emoji: data.emoji,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Emoji yanıtı gönderilemedi."
      );
    }
  }
);

// =====================================================
// REDUX SLICE
// =====================================================

const messageSlice = createSlice({
  name: "message",
  initialState,

  reducers: {
    clearMessages: (state) => {
      state.messages = [];
      state.unreadCount = 0;
      state.loading = false;
      state.sending = false;
      state.error = null;
    },

    clearMessageError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // MESAJLARI GETİR
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;

        state.unreadCount = action.payload.filter(
          (message) => !message.isRead
        ).length;
      })

      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Mesajlar alınamadı.";
      })

      // OKUNMAMIŞ MESAJ SAYISI
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })

      .addCase(fetchUnreadCount.rejected, (state, action) => {
        state.error =
          action.payload ||
          "Okunmamış mesaj sayısı alınamadı.";
      })

      // MESAJ GÖNDER
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
        state.error = null;
      })

      .addCase(sendMessage.fulfilled, (state) => {
        state.sending = false;
      })

      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error =
          action.payload || "Mesaj gönderilemedi.";
      })

      // OKUNDU OLARAK İŞARETLE
      .addCase(markMessageAsRead.fulfilled, (state, action) => {
        const message = state.messages.find(
          (item) => item.id === action.payload
        );

        if (message && !message.isRead) {
          message.isRead = true;

          state.unreadCount = Math.max(
            0,
            state.unreadCount - 1
          );
        }
      })

      .addCase(markMessageAsRead.rejected, (state, action) => {
        state.error =
          action.payload ||
          "Mesaj okundu olarak işaretlenemedi.";
      })

      // EMOJİ YANITI
      .addCase(reactToMessage.fulfilled, (state, action) => {
        const message = state.messages.find(
          (item) => item.id === action.payload.messageId
        );

        if (message) {
          if (!message.isRead) {
            state.unreadCount = Math.max(
              0,
              state.unreadCount - 1
            );
          }

          message.reactionEmoji = action.payload.emoji;
          message.isRead = true;
        }
      })

      .addCase(reactToMessage.rejected, (state, action) => {
        state.error =
          action.payload ||
          "Emoji yanıtı gönderilemedi.";
      });
  },
});

export const {
  clearMessages,
  clearMessageError,
} = messageSlice.actions;

export default messageSlice.reducer;

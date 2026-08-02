import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  loginStatus: boolean;
  authLoading: boolean;
  user: User | null;
};

const storedUser = JSON.parse(localStorage.getItem("user") || "null");

const initialState: AuthState = {
  loginStatus: Boolean(storedUser?.id),
  authLoading: false,
  user: storedUser ?? null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoginStatus: (state, action: PayloadAction<boolean>) => {
      state.loginStatus = action.payload;
    },
    setAuthLoading: (state) => {
      state.authLoading = true;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.authLoading = false;
      state.loginStatus = Boolean(action.payload?.id);
    },
  },
});

export const { setLoginStatus, setAuthLoading, setUser } = authSlice.actions;

export default authSlice.reducer;

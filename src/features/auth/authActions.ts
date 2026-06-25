import customFetch from "../../axios/custom";
import { store } from "../../store";
import { setAuthLoading, setUser } from "./authSlice";

export async function fetchCurrentUser(): Promise<void> {
  store.dispatch(setAuthLoading());
  try {
    const response = await customFetch.get<User>("/auth/me");
    store.dispatch(setUser(response.data));
  } catch {
    store.dispatch(setUser(null));
  }
}

export async function logout(): Promise<void> {
  try {
    await customFetch.post("/auth/logout");
  } finally {
    store.dispatch(setUser(null));
  }
}

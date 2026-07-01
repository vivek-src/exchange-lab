import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
});

export async function pingApiNewUser(userId: string) {
  try {
    const response = await api.post("/api/v1/newUser/", { userId });
    return {
      success: true,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

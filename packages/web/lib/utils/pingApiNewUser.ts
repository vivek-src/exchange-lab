import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_REST_API_URL ?? "http://localhost:3001/api/v1",
});

export async function pingApiNewUser(userId: string) {
  try {
    const response = await api.post("/newUser/", { userId });
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

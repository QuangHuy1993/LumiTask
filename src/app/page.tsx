import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token");

  if (sessionToken) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }

  // This will never be rendered but is needed for the component structure
  return null;
}

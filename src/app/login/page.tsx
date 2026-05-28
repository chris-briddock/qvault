import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await verifySession();
  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}

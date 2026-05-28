import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";

export default async function RegisterPage() {
  const session = await verifySession();
  if (session) {
    redirect("/dashboard");
  }

  return <RegisterForm />;
}

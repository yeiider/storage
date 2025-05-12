import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import RegisterForm from "@/components/register-form"

export default async function RegisterPage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Crear cuenta</h1>
          <p className="mt-2 text-gray-600">Regístrese para comenzar a usar S3 Manager</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}

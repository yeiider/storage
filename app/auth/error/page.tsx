import { redirect } from "next/navigation"

export default function AuthError() {
  // Redirigir a la página principal con un parámetro de error
  redirect("/?error=auth")
}

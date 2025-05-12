import type React from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import AdminSidebar from "@/components/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  // Solo permitir acceso a usuarios con rol owner o superadmin
  if (session.user.role !== "owner" && session.user.role !== "superadmin") {
    redirect("/dashboard")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar
        userRole={session.user.role}
        userName={session.user.name || ""}
        userEmail={session.user.email || ""}
        organizationName={session.user.organizationName || ""}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

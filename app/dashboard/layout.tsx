import type React from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import AdminSidebar from "@/components/admin-sidebar"
import DashboardHeader from "@/components/dashboard-header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const isAdmin = session.user.role === "owner" || session.user.role === "superadmin"

  return (
    <div className="flex h-screen bg-gray-50">
      {isAdmin && (
        <AdminSidebar
          userRole={session.user.role}
          userName={session.user.name || ""}
          userEmail={session.user.email || ""}
          organizationName={session.user.organizationName || ""}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader user={session.user} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users, HardDrive, FolderOpen, LayoutDashboard, Settings, LogOut, ChevronRight, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { signOut } from "next-auth/react"

interface AdminSidebarProps {
  userRole: string
  userName: string
  userEmail: string
  organizationName: string
}

export default function AdminSidebar({ userRole, userName, userEmail, organizationName }: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isOwnerOrAdmin = userRole === "owner" || userRole === "superadmin"

  const menuItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      title: "Archivos",
      href: "/dashboard",
      icon: FolderOpen,
      active: pathname === "/dashboard" && pathname.includes("prefix"),
    },
    {
      title: "Usuarios",
      href: "/admin/users",
      icon: Users,
      active: pathname === "/admin/users",
      adminOnly: true,
    },
    {
      title: "Bucket",
      href: "/admin/bucket",
      icon: HardDrive,
      active: pathname === "/admin/bucket",
      adminOnly: true,
    },
    {
      title: "Configuración",
      href: "/admin/settings",
      icon: Settings,
      active: pathname === "/admin/settings",
      adminOnly: true,
    },
  ]

  return (
    <aside
      className={cn(
        "bg-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out h-screen sticky top-0 z-30",
        collapsed ? "w-[70px]" : "w-[260px]",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className={cn("flex items-center", collapsed && "justify-center w-full")}>
          {!collapsed && (
            <div className="font-bold text-lg truncate mr-2">
              <span className="text-primary">S3</span> Manager
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 border-b border-slate-700">
          <div className="flex flex-col">
            <span className="font-medium truncate">{userName}</span>
            <span className="text-xs text-slate-400 truncate">{userEmail}</span>
            <div className="mt-2 px-2 py-1 bg-slate-700 rounded text-xs inline-block">
              {userRole === "superadmin"
                ? "Administrador"
                : userRole === "owner"
                  ? "Propietario"
                  : userRole === "write"
                    ? "Editor"
                    : "Lector"}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4">
        <div className={cn("px-3", collapsed && "px-2")}>
          {!collapsed && (
            <div className="mb-4 px-3">
              <h3 className="text-xs uppercase text-slate-500 font-semibold">Organización</h3>
              <p className="text-sm truncate mt-1 text-slate-300">{organizationName}</p>
            </div>
          )}

          <div className="space-y-1">
            {menuItems.map((item) => {
              // Si el elemento es solo para admin y el usuario no es admin, no mostrar
              if (item.adminOnly && !isOwnerOrAdmin) {
                return null
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                    item.active
                      ? "bg-slate-700 text-white font-medium"
                      : "text-slate-400 hover:bg-slate-700 hover:text-white",
                    collapsed && "justify-center px-2",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3")} />
                  {!collapsed && <span>{item.title}</span>}
                  {!collapsed && item.active && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-slate-400 hover:text-white hover:bg-slate-700",
            collapsed && "justify-center",
          )}
          onClick={() => signOut()}
        >
          <LogOut className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3")} />
          {!collapsed && <span>Cerrar sesión</span>}
        </Button>
      </div>
    </aside>
  )
}

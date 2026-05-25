"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "./auth-provider"
import { BarChart3, Users, CreditCard, Receipt, Home, LogOut, Settings, Menu, X, UserCheck } from "lucide-react"
import { useState } from "react"
import { useMobile } from "@/hooks/use-mobile"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  adminOnly?: boolean
}

function SoccerBallIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 6.5 2.4L12 8.5 5.5 4.4A10 10 0 0 1 12 2z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 8.5l6.5-4.1a10 10 0 0 1 3.5 8.5l-7 2.1-3-6.5z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 8.5l-6.5-4.1A10 10 0 0 0 2 13l7 2 3-6.5z" fill="currentColor" fillOpacity="0.15" />
      <path d="M9 15l-7-2a10 10 0 0 0 4.5 7.6L9 15z" fill="currentColor" fillOpacity="0.15" />
      <path d="M15 15l7-2a10 10 0 0 1-4.5 7.6L15 15z" fill="currentColor" fillOpacity="0.15" />
      <path d="M9 15l3 6.5 3-6.5-3-2-3 2z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  )
}

export function SideNav() {
  const pathname = usePathname()
  const { isLoggedIn, user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useMobile()

  if (pathname === "/login" || !isLoggedIn) {
    return null
  }

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/",
      icon: <Home className="mr-2 h-5 w-5" />,
    },
    {
      title: "Players",
      href: "/players",
      icon: <Users className="mr-2 h-5 w-5" />,
    },
    {
      title: "Payments",
      href: "/payments",
      icon: <CreditCard className="mr-2 h-5 w-5" />,
    },
    {
      title: "Expenses",
      href: "/expenses",
      icon: <Receipt className="mr-2 h-5 w-5" />,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: <BarChart3 className="mr-2 h-5 w-5" />,
    },
    {
      title: "Users",
      href: "/users",
      icon: <UserCheck className="mr-2 h-5 w-5" />,
      adminOnly: true,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <Settings className="mr-2 h-5 w-5" />,
    },
  ]

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const isAdmin = () => {
    return user?.role?.toLowerCase() === "admin"
  }

  const getVisibleNavItems = () => {
    return navItems.filter(item => {
      if (item.adminOnly) {
        return isAdmin()
      }
      return true
    })
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const BrandingHeader = ({ compact = false }: { compact?: boolean }) => (
    <div className="flex items-center gap-2">
      <div className={cn(
        "rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0",
        compact ? "h-8 w-8" : "h-9 w-9"
      )}>
        <SoccerBallIcon className="h-5 w-5 text-white" />
      </div>
      <h2 className={cn(
        "font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent leading-tight",
        compact ? "text-base" : "text-lg"
      )}>
        Munyonyo SC
      </h2>
    </div>
  )

  const MobileHeader = () => (
    <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white z-30 border-b flex items-center justify-between px-4">
      <BrandingHeader compact />
      <Button variant="ghost" size="icon" onClick={toggleMenu} className="lg:hidden">
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <MobileHeader />
        <div
          className={cn(
            "fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-20 w-72 bg-white shadow-xl transition-transform duration-300 ease-in-out",
              isOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="p-6 border-b">
              <BrandingHeader />
              {user && (
                <div className="mt-3 flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-700">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role || 'user'}</p>
                  </div>
                </div>
              )}
            </div>
            <ScrollArea className="flex-1 h-[calc(100vh-8rem)]">
              <div className="flex flex-col gap-1 py-4 px-3">
                {getVisibleNavItems().map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start py-6 text-base transition-all duration-150",
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
                          : "hover:bg-blue-50 hover:text-blue-600",
                      )}
                    >
                      {item.icon}
                      {item.title}
                      {item.adminOnly && (
                        <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Admin
                        </span>
                      )}
                      {isActive(item.href) && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                    </Button>
                  </Link>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start py-6 text-base hover:bg-red-50 hover:text-red-600 transition-all duration-150"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Logout
              </Button>
            </div>
          </div>
        </div>
        <div className="pt-16 lg:pt-0"></div>
      </>
    )
  }

  return (
    <div className="hidden lg:flex flex-col h-screen border-r bg-white shadow-sm">
      <div className="p-6 border-b">
        <BrandingHeader />
        {user && (
          <div className="mt-4 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name || 'Unknown User'}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role || 'user'}</p>
            </div>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="flex flex-col gap-1 py-4">
          {getVisibleNavItems().map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start py-6 text-base transition-all duration-150",
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700 font-medium hover:bg-blue-100"
                    : "hover:bg-blue-50 hover:text-blue-600",
                )}
              >
                {item.icon}
                {item.title}
                {item.adminOnly && (
                  <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Admin
                  </span>
                )}
                {isActive(item.href) && !item.adminOnly && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start py-6 text-base hover:bg-red-50 hover:text-red-600 transition-all duration-150"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  )
}

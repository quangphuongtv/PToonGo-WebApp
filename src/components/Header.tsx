import React from "react";
import { Film, User, LogOut, ShieldAlert, Compass } from "lucide-react";
import { UserProfile } from "../types";

interface HeaderProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
}

export default function Header({ currentPage, setCurrentPage, currentUser, onLogout }: HeaderProps) {
  const menuItems = [
    { id: "home", label: "Trang chủ" },
    { id: "cartoon", label: "Phim hoạt hình" },
    { id: "travel", label: "Du lịch trải nghiệm" },
    { id: "ai", label: "Trao đổi công nghệ AI" },
  ];

  const adminItems = [
    { id: "manage_videos", label: "Quản lý Video", isDoc: true },
    { id: "manage_users", label: "Quản lý & Liên hệ" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-header py-[20px] px-4 md:px-8 transition-all duration-300">
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div 
          onClick={() => setCurrentPage("home")}
          className="flex items-center cursor-pointer group active-scale"
          id="header-logo-container"
        >
          <img 
            src="/assets/Logo-PToonGo.png" 
            alt="PToonGo" 
            className="h-10 md:h-12 w-auto object-contain transition-all duration-300 hover:scale-[1.01] hover:brightness-110 hover:drop-shadow-[0_0_15px_rgba(84,152,70,0.6)] cursor-pointer"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // If image is empty or fails to load, dynamically fallback to the CSS design
              e.currentTarget.style.display = "none";
              const fallback = document.getElementById("header-logo-fallback");
              if (fallback) {
                fallback.classList.remove("hidden");
                fallback.classList.add("flex");
              }
            }}
          />
          {/* Elegant fallback to retain premium branding if assets/Logo-PToonGo.png is empty or corrupt */}
          <div id="header-logo-fallback" className="hidden items-center gap-3">
            <div className="relative w-11 h-11 flex items-center justify-center bg-gradient-to-br from-[#244895] to-[#08142E] rounded-xl border border-white/20 shadow-lg shadow-black/40 overflow-hidden group-hover:border-[#549846]/50 transition-colors">
              <div className="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none" />
              <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(84,152,70,0.5)]">
                <polygon 
                  points="30,20 85,50 30,80" 
                  fill="none" 
                  stroke="#549846" 
                  strokeWidth="8" 
                  strokeLinejoin="round"
                />
                <polygon 
                  points="38,32 73,50 38,68" 
                  fill="#E9672E" 
                />
                <path 
                  d="M 15 25 Q 5 50 15 75" 
                  fill="none" 
                  stroke="#244895" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-bold text-2xl tracking-wider bg-gradient-to-r from-white via-slate-100 to-[#549846] bg-clip-text text-transparent">
                PToon<span className="text-[#E9672E]">Go</span>
              </span>
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#549846]">Video Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation Menus */}
        <nav className="flex flex-wrap items-center justify-center gap-2 md:gap-3" id="header-nav-menu">
          {menuItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setCurrentPage(item.id)}
                className={`px-4 py-2 rounded-full font-sans font-semibold text-sm transition-all duration-300 active-scale
                  ${isActive 
                    ? "bg-[#E9672E] text-white shadow-[0_0_15px_rgba(233,103,46,0.3)] hover:shadow-[0_0_20px_#E9672E] scale-[1.01]" 
                    : "text-white/80 hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_#549846]/30 hover:scale-[1.01]"
                  }
                `}
              >
                {item.label}
              </button>
            );
          })}

          {/* Admin features or Restricted pages */}
          {adminItems.map((item) => {
            const isActive = currentPage === item.id;
            const isAdminOnly = item.id === "manage_videos";
            const hasAccess = !isAdminOnly || (currentUser && currentUser.role === "admin");

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  if (hasAccess) {
                    setCurrentPage(item.id);
                  } else {
                    // Redirect to login page and show message
                    setCurrentPage("manage_users");
                  }
                }}
                className={`relative px-4 py-2 rounded-full font-sans font-semibold text-sm transition-all duration-300 active-scale
                  ${isActive 
                    ? "bg-[#549846] text-white shadow-[0_0_15px_rgba(84,152,70,0.3)] hover:shadow-[0_0_20px_#549846] scale-[1.01]" 
                    : "text-white/80 hover:text-white hover:bg-white/10 hover:scale-[1.01]"
                  }
                  ${!hasAccess ? "opacity-60 cursor-not-allowed hover:opacity-80" : ""}
                `}
              >
                <span className="flex items-center gap-1.5">
                  {isAdminOnly && <ShieldAlert className="w-4 h-4 text-[#E9672E]" />}
                  {item.label}
                  {isAdminOnly && !hasAccess && (
                    <span className="text-[9px] bg-[#E9672E]/20 text-[#E9672E] px-1.5 py-0.5 rounded border border-[#E9672E]/30 uppercase">
                      Admin
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* User profile controls */}
        <div className="flex items-center gap-3" id="header-user-controls">
          {currentUser ? (
            <div className="flex items-center gap-2.5 bg-[#08142E]/60 px-3.5 py-1.5 rounded-xl border border-white/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#244895] to-[#549846] flex items-center justify-center text-white font-bold text-sm shadow">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight">{currentUser.name}</span>
                <span className={`text-[9px] uppercase tracking-wider font-mono leading-none
                  ${currentUser.role === "admin" ? "text-[#E9672E]" : "text-[#549846]"}
                `}>
                  {currentUser.role === "admin" ? "🛡️ Quản trị viên" : "Thành viên"}
                </span>
              </div>
              <button 
                onClick={onLogout}
                title="Đăng xuất"
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-[#E9672E] transition-colors active-scale"
                id="btn-signout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCurrentPage("manage_users")}
              className="flex items-center gap-2 bg-gradient-to-r from-[#244895] to-[#08142E] hover:from-[#549846] hover:to-[#244895] text-white px-5 py-2 rounded-xl text-sm font-semibold tracking-wide shadow-lg hover:shadow-[#549846]/20 transition-all duration-300 active-scale border border-white/10"
              id="btn-login-navigation"
            >
              <User className="w-4 h-4" />
              Đăng nhập / Đăng ký
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

import React, { useState, useEffect } from "react";
import { 
  Video, 
  UserProfile, 
  ChatMessage, 
  ContactMessage 
} from "./types";
import { DEFAULT_VIDEOS } from "./data/defaultVideos";
// Helper to load from localStorage or fallback
// Synchronous cleanup of huge or invalid keys from localStorage on startup to prevent QuotaExceededError
try {
  const keysToClean = [
    "ptoongo_video_url",
    "ptoongo_thumbnail_url",
    "ptoongo_video_preview_url",
    "ptoongo_thumbnail_preview_url"
  ];
  keysToClean.forEach(key => {
    try {
      const val = localStorage.getItem(key);
      if (val && (val.startsWith("data:") || val.startsWith("blob:") || val.length > 2000)) {
        localStorage.removeItem(key);
        console.log(`[Storage Cleanup] Purged large or invalid key to free up quota: ${key}`);
      }
    } catch (innerErr) {
      console.warn(`[Storage Cleanup] Error checking key "${key}":`, innerErr);
    }
  });
} catch (e) {
  console.warn("[Storage Cleanup] Global cleanup error:", e);
}

const getLocalData = <T,>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const setLocalData = <T,>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save local storage data for key:", key, e);
  }
};

// Components & Views
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomeView from "./views/HomeView";
import CategoryView from "./views/CategoryView";
import ManageVideosView from "./views/ManageVideosView";
import ManageUsersView from "./views/ManageUsersView";

import { Loader2 } from "lucide-react";

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>(() => getLocalData<string>("ptoongo_current_page", "home"));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getLocalData<UserProfile | null>("ptoongo_user", null));
  const [videos, setVideos] = useState<Video[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Persist current page for system recovery mode
  useEffect(() => {
    setLocalData("ptoongo_current_page", currentPage);
  }, [currentPage]);

  // --- API FETCH FUNCTIONS ---
  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/videos");
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      }
    } catch (e) {
      console.warn("Error fetching videos:", e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUserProfiles(data);
      }
    } catch (e) {
      console.warn("Error fetching users:", e);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (e) {
      console.warn("Error fetching chats:", e);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContactMessages(data);
      }
    } catch (e) {
      console.warn("Error fetching contacts:", e);
    }
  };

  // 1. Initial Data Load and Listening
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchVideos(),
        fetchUsers(),
        fetchChats(),
        fetchContacts()
      ]);
      setIsLoading(false);
    };

    initData();

    // Poll for chat messages every 5 seconds for a dynamic real-time room discussion feel
    const chatInterval = setInterval(fetchChats, 5000);
    return () => clearInterval(chatInterval);
  }, []);

  // --- ACTIONS ---

  // Register
  const handleRegister = async (email: string, pass: string, name: string, role: "admin" | "user") => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, name, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Đăng ký không thành công.");
    }
    const newUser = await res.json();
    setCurrentUser(newUser);
    setLocalData("ptoongo_user", newUser);
    await fetchUsers();
  };

  // Login
  const handleLogin = async (email: string, pass: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Sai tài khoản hoặc mật khẩu đăng nhập.");
    }
    const userProf = await res.json();
    setCurrentUser(userProf);
    setLocalData("ptoongo_user", userProf);
  };

  // Logout
  const handleLogout = async () => {
    localStorage.removeItem("ptoongo_user");
    localStorage.removeItem("ptoongo_current_page");
    setCurrentUser(null);
    setCurrentPage("home");
  };

  // Submit Contact Form
  const handleSubmitContact = async (name: string, email: string, message: string) => {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message })
    });
    if (res.ok) {
      await fetchContacts();
    }
  };

  // Add Video
  const handleAddVideo = async (newVid: Omit<Video, "id" | "views">) => {
    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVid)
    });
    if (res.ok) {
      await fetchVideos();
    }
  };

  // Update Video
  const handleUpdateVideo = async (id: string, updatedFields: Partial<Video>) => {
    const res = await fetch(`/api/videos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedFields)
    });
    if (res.ok) {
      await fetchVideos();
    }
  };

  // Delete Video
  const handleDeleteVideo = async (id: string) => {
    const res = await fetch(`/api/videos/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await fetchVideos();
    }
  };

  // Delete User (Admin only)
  const handleDeleteUser = async (id: string) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await fetchUsers();
    }
  };

  // Change user role (Admin only)
  const handleChangeUserRole = async (id: string, newRole: "admin" | "user") => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole })
    });
    if (res.ok) {
      await fetchUsers();
    }
  };

  // Delete Contact Message (Admin only)
  const handleDeleteContact = async (id: string) => {
    const res = await fetch(`/api/contacts/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await fetchContacts();
    }
  };

  // Send Chat message
  const handleSendMessage = async (text: string) => {
    if (!currentUser) return;
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        userName: currentUser.name,
        message: text
      })
    });
    if (res.ok) {
      await fetchChats();
    }
  };

  // Manual Trigger sync/refresh (kept for compatibility)
  const handleForceRefresh = async () => {
    await Promise.all([
      fetchVideos(),
      fetchUsers(),
      fetchChats(),
      fetchContacts()
    ]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#112037] text-slate-100 selection:bg-[#549846] selection:text-white font-sans">
      
      {/* Sticky Glassmorphic Header */}
      <Header 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-[1920px] mx-auto px-4 py-8 md:px-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-12 h-12 text-[#549846] animate-spin" />
            <p className="font-display font-medium text-slate-300 animate-pulse">
              Đang đồng bộ dữ liệu hệ thống cục bộ...
            </p>
          </div>
        ) : (
          <div className="w-full">

            {/* View switching */}
            {currentPage === "home" && (
              <HomeView 
                videos={videos} 
                onSelectPage={setCurrentPage} 
              />
            )}

            {currentPage === "cartoon" && (
              <CategoryView
                category="Phim hoạt hình"
                slogan="Thế giới tuổi thơ vui nhộn, những câu chuyện sắc màu và bài học cuộc sống bổ ích."
                videos={videos}
                currentUser={currentUser}
              />
            )}

            {currentPage === "travel" && (
              <CategoryView
                category="Du lịch trải nghiệm"
                slogan="Vượt qua giới hạn, chiêm ngưỡng thế giới bao la và lưu giữ khoảnh khắc kỳ thú."
                videos={videos}
                currentUser={currentUser}
              />
            )}

            {currentPage === "ai" && (
              <CategoryView
                category="Trao đổi công nghệ AI"
                slogan="Nơi chia sẻ kiến thức Trí Tuệ Nhân Tạo, Machine Learning và các đột phá công nghệ tương lai."
                videos={videos}
                chatMessages={chatMessages}
                onSendMessage={handleSendMessage}
                currentUser={currentUser}
              />
            )}

            {currentPage === "manage_videos" && (
              <ManageVideosView
                videos={videos}
                onAddVideo={handleAddVideo}
                onUpdateVideo={handleUpdateVideo}
                onDeleteVideo={handleDeleteVideo}
                onRefresh={handleForceRefresh}
              />
            )}

            {currentPage === "manage_users" && (
              <ManageUsersView
                currentUser={currentUser}
                onLogin={handleLogin}
                onRegister={handleRegister}
                onLogout={handleLogout}
                onSubmitContact={handleSubmitContact}
                userProfiles={userProfiles}
                contactMessages={contactMessages}
                onDeleteUser={handleDeleteUser}
                onChangeUserRole={handleChangeUserRole}
                onDeleteContact={handleDeleteContact}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

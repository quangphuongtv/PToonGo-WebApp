import React, { useState } from "react";
import { UserProfile, ContactMessage } from "../types";
import { 
  User, 
  Lock, 
  Mail, 
  Send, 
  ShieldCheck, 
  Users, 
  Trash2, 
  MessageSquare,
  ShieldAlert,
  Calendar,
  Contact,
  Database,
  Download
} from "lucide-react";

// Safe LocalStorage helpers to avoid QuotaExceededError
const safeGetLocalStorage = (key: string, fallback: string = ""): string => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[Storage Warning] Failed to write key "${key}" to localStorage:`, e);
  }
};

const safeRemoveLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[Storage Warning] Failed to remove key "${key}" from localStorage:`, e);
  }
};

interface ManageUsersViewProps {
  currentUser: UserProfile | null;
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (email: string, pass: string, name: string, role: "admin" | "user") => Promise<void>;
  onLogout: () => void;
  onSubmitContact: (name: string, email: string, message: string) => Promise<void>;
  
  // Admin only collections
  userProfiles: UserProfile[];
  contactMessages: ContactMessage[];
  onDeleteUser: (id: string) => Promise<void>;
  onChangeUserRole: (id: string, newRole: "admin" | "user") => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
}

export default function ManageUsersView({
  currentUser,
  onLogin,
  onRegister,
  onLogout,
  onSubmitContact,
  userProfiles,
  contactMessages,
  onDeleteUser,
  onChangeUserRole,
  onDeleteContact
}: ManageUsersViewProps) {
  
  // Tabs: "auth" | "contact" for users, "users" | "contacts" for admins (restored for recovery mode)
  const [activeTab, setActiveTab] = useState<string>(() => safeGetLocalStorage("ptoongo_users_active_tab") || "auth");
  
  // Auth Form State (restored for recovery mode)
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(() => safeGetLocalStorage("ptoongo_is_register_mode") === "true");
  const [email, setEmail] = useState(() => safeGetLocalStorage("ptoongo_email") || "");
  const [password, setPassword] = useState(() => safeGetLocalStorage("ptoongo_password") || "");
  const [name, setName] = useState(() => safeGetLocalStorage("ptoongo_name") || "");
  const [role, setRole] = useState<"admin" | "user">(() => (safeGetLocalStorage("ptoongo_role") as "admin" | "user") || "user");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Contact Form State (restored for recovery mode)
  const [contactName, setContactName] = useState(() => safeGetLocalStorage("ptoongo_contact_name") || "");
  const [contactEmail, setContactEmail] = useState(() => safeGetLocalStorage("ptoongo_contact_email") || "");
  const [contactMessage, setContactMessage] = useState(() => safeGetLocalStorage("ptoongo_contact_message") || "");
  const [contactSuccess, setContactSuccess] = useState("");
  const [contactError, setContactError] = useState("");
  const [isContactLoading, setIsContactLoading] = useState(false);

  // Auto-persist input values on changes for recovery mode
  React.useEffect(() => {
    safeSetLocalStorage("ptoongo_users_active_tab", activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    safeSetLocalStorage("ptoongo_is_register_mode", String(isRegisterMode));
  }, [isRegisterMode]);

  React.useEffect(() => {
    safeSetLocalStorage("ptoongo_email", email);
  }, [email]);

  React.useEffect(() => {
    safeSetLocalStorage("ptoongo_password", password);
  }, [password]);

  React.useEffect(() => {
    safeSetLocalStorage("ptoongo_name", name);
  }, [name]);

  React.useEffect(() => {
    safeSetLocalStorage("ptoongo_role", role);
  }, [role]);

  React.useEffect(() => {
    safeSetLocalStorage("ptoongo_contact_name", contactName);
  }, [contactName]);

  React.useEffect(() => {
    safeSetLocalStorage("ptoongo_contact_email", contactEmail);
  }, [contactEmail]);

  React.useEffect(() => {
    safeSetLocalStorage("ptoongo_contact_message", contactMessage);
  }, [contactMessage]);

  // Set default tab when auth state changes (respecting saved tab if valid)
  React.useEffect(() => {
    const savedTab = safeGetLocalStorage("ptoongo_users_active_tab");
    if (currentUser) {
      if (currentUser.role === "admin") {
        if (savedTab && ["users", "contacts", "database"].includes(savedTab)) {
          setActiveTab(savedTab);
        } else {
          setActiveTab("users");
        }
      } else {
        if (savedTab && ["contact"].includes(savedTab)) {
          setActiveTab(savedTab);
        } else {
          setActiveTab("contact");
        }
      }
    } else {
      setActiveTab("auth");
    }
    setAuthError("");
    setAuthSuccess("");
  }, [currentUser]);

  // Handle Login or Register submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!email.trim() || !password.trim()) {
      setAuthError("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    if (isRegisterMode && !name.trim()) {
      setAuthError("Vui lòng nhập họ và tên.");
      return;
    }

    setIsAuthLoading(true);

    try {
      if (isRegisterMode) {
        // Auto-assign admin if owner's email
        const finalRole = email.trim().toLowerCase() === "pdigitalmotion@gmail.com" ? "admin" : role;
        await onRegister(email.trim(), password.trim(), name.trim(), finalRole);
        setAuthSuccess("TẠO TÀI KHOẢN THÀNH CÔNG! Đã tự động đăng nhập.");
      } else {
        await onLogin(email.trim(), password.trim());
        setAuthSuccess("ĐĂNG NHẬP THÀNH CÔNG!");
      }
      
      // Reset forms and clean up persisted fields
      setEmail("");
      setPassword("");
      setName("");
      safeRemoveLocalStorage("ptoongo_email");
      safeRemoveLocalStorage("ptoongo_password");
      safeRemoveLocalStorage("ptoongo_name");
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "Xác thực không thành công. Vui lòng kiểm tra lại.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Contact Submit
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError("");
    setContactSuccess("");

    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError("Vui lòng điền đầy đủ thông tin liên hệ.");
      return;
    }

    setIsContactLoading(true);

    try {
      await onSubmitContact(contactName.trim(), contactEmail.trim(), contactMessage.trim());
      setContactSuccess("Gửi thông tin liên hệ thành công! Ban quản trị sẽ sớm phản hồi.");
      setContactName("");
      setContactEmail("");
      setContactMessage("");
      safeRemoveLocalStorage("ptoongo_contact_name");
      safeRemoveLocalStorage("ptoongo_contact_email");
      safeRemoveLocalStorage("ptoongo_contact_message");
    } catch (err: any) {
      console.error(err);
      setContactError("Gửi liên hệ thất bại. Hãy thử lại sau.");
    } finally {
      setIsContactLoading(false);
    }
  };

  const isAdmin = currentUser && currentUser.role === "admin";

  return (
    <div className="flex flex-col gap-8 text-left max-w-6xl mx-auto" id="user-management-and-contact-view">
      
      {/* Dynamic Tab Switchers based on Roles */}
      <div className="flex border-b border-white/10" id="users-tabs-header">
        {!isAdmin ? (
          <>
            {!currentUser && (
              <button
                onClick={() => setActiveTab("auth")}
                className={`py-3 px-6 font-display font-bold text-sm uppercase tracking-wide border-b-2 transition-colors active-scale
                  ${activeTab === "auth" 
                    ? "border-[#549846] text-white bg-white/5" 
                    : "border-transparent text-slate-400 hover:text-white"
                  }
                `}
              >
                Cổng tài khoản
              </button>
            )}

            <button
              onClick={() => setActiveTab("contact")}
              className={`py-3 px-6 font-display font-bold text-sm uppercase tracking-wide border-b-2 transition-colors active-scale flex items-center gap-1.5
                ${activeTab === "contact" 
                  ? "border-[#E9672E] text-white bg-white/5" 
                  : "border-transparent text-slate-400 hover:text-white"
                }
              `}
            >
              <Contact className="w-4 h-4 text-[#E9672E]" />
              Liên hệ chúng tôi
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab("users")}
              className={`py-3 px-6 font-display font-bold text-sm uppercase tracking-wide border-b-2 transition-colors active-scale flex items-center gap-1.5
                ${activeTab === "users" 
                  ? "border-[#549846] text-white bg-white/5" 
                  : "border-transparent text-slate-400 hover:text-white"
                }
              `}
            >
              <Users className="w-4.5 h-4.5 text-[#549846]" />
              Quản trị người dùng ({userProfiles.length})
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`py-3 px-6 font-display font-bold text-sm uppercase tracking-wide border-b-2 transition-colors active-scale flex items-center gap-1.5
                ${activeTab === "contacts" 
                  ? "border-[#E9672E] text-white bg-white/5" 
                  : "border-transparent text-slate-400 hover:text-white"
                }
              `}
            >
              <MessageSquare className="w-4.5 h-4.5 text-[#E9672E]" />
              Danh sách hòm thư liên hệ ({contactMessages.length})
            </button>
            <button
              onClick={() => setActiveTab("database")}
              className={`py-3 px-6 font-display font-bold text-sm uppercase tracking-wide border-b-2 transition-colors active-scale flex items-center gap-1.5
                ${activeTab === "database" 
                  ? "border-[#244895] text-white bg-white/5" 
                  : "border-transparent text-slate-400 hover:text-white"
                }
              `}
            >
              <Database className="w-4.5 h-4.5 text-[#244895]" />
              Dữ liệu Hệ thống (JSON)
            </button>
          </>
        )}
      </div>

      {/* VIEW PANEL ROUTING */}
      <div className="bg-[#08142E]/30 rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl" id="users-tab-content-panel">
        
        {/* TAB A: PORTAL ACCOUNT (LOGIN / REGISTER) */}
        {!currentUser && activeTab === "auth" && (
          <div className="max-w-md mx-auto flex flex-col gap-6" id="auth-form-block">
            <div className="text-center">
              <h2 className="font-display font-extrabold text-2xl text-white uppercase tracking-wide">
                {isRegisterMode ? "Tạo tài khoản thành viên" : "Đăng nhập hệ thống"}
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-1">
                {isRegisterMode 
                  ? "Đăng ký thành viên để xem phim, bình luận và trải nghiệm AI" 
                  : "Đăng nhập để xem đầy đủ nội dung bảo mật"
                }
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold">
                {authError}
              </div>
            )}
            {authSuccess && (
              <div className="p-3 bg-[#549846]/10 border border-[#549846]/30 text-emerald-400 rounded-xl text-xs font-semibold">
                {authSuccess}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              {isRegisterMode && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase text-slate-400">Họ và tên</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#549846] transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-slate-400">Địa chỉ Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#549846] transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-slate-400">Mật khẩu bảo mật</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#549846] transition-colors"
                  />
                </div>
              </div>

              {isRegisterMode && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase text-slate-400">Phân quyền Đăng ký</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "user")}
                    className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-[#549846] transition-colors"
                  >
                    <option value="user" className="bg-[#08142E]">Thành viên thường (User)</option>
                    <option value="admin" className="bg-[#08142E]">Quản trị viên (Admin)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-[#244895] to-[#08142E] hover:from-[#549846] hover:to-[#244895] text-white font-bold rounded-xl text-sm tracking-wide shadow-md transition-all duration-300 active-scale border border-white/10"
              >
                {isAuthLoading ? "Đang xác thực..." : isRegisterMode ? "ĐĂNG KÝ NGAY" : "ĐĂNG NHẬP"}
              </button>
            </form>

            <div className="text-center text-xs text-slate-400">
              {isRegisterMode ? (
                <span>
                  Đã có tài khoản?{" "}
                  <button 
                    onClick={() => setIsRegisterMode(false)} 
                    className="text-[#549846] hover:underline font-bold"
                  >
                    Đăng nhập tại đây
                  </button>
                </span>
              ) : (
                <span>
                  Chưa có tài khoản?{" "}
                  <button 
                    onClick={() => setIsRegisterMode(true)} 
                    className="text-[#E9672E] hover:underline font-bold"
                  >
                    Đăng ký tài khoản mới
                  </button>
                </span>
              )}
            </div>

            {/* Quick Demo Assist */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-[11px] text-yellow-400 leading-relaxed text-left">
              💡 <strong>HƯỚNG DẪN TRẢI NGHIỆM ĐỂ TEST:</strong><br />
              - Đăng ký mới dưới quyền <strong>Quản trị viên (Admin)</strong> để được toàn quyền thao tác trang Quản lý Video & Người dùng.<br />
              - Hoặc đăng ký/đăng nhập bằng email <strong>pdigitalmotion@gmail.com</strong> để hệ thống tự cấp quyền Admin tối cao!
            </div>
          </div>
        )}

        {/* TAB B: CONTACT FORM FOR GUEST OR REGULAR USER */}
        {activeTab === "contact" && (
          <div className="max-w-2xl mx-auto flex flex-col gap-6" id="contact-form-block">
            <div className="text-center">
              <h2 className="font-display font-extrabold text-2xl text-white uppercase tracking-wide flex items-center justify-center gap-2">
                GỬI THƯ LIÊN HỆ & GÓP Ý
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-1">
                Hãy để lại lời nhắn cho NGUYEN QUANG PHUONG. Ý kiến đóng góp của bạn là động lực để PToonGo hoàn thiện.
              </p>
            </div>

            {contactError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold">
                {contactError}
              </div>
            )}
            {contactSuccess && (
              <div className="p-3 bg-[#549846]/10 border border-[#549846]/30 text-emerald-400 rounded-xl text-xs font-semibold">
                {contactSuccess}
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase text-slate-400">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#E9672E] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono uppercase text-slate-400">Địa chỉ Email</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="nguyenvana@gmail.com"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#E9672E] transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-slate-400">Nội dung thư góp ý</label>
                <textarea
                  rows={5}
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Ý kiến thảo luận, báo lỗi hoặc gửi lời nhắn liên hệ tới Ban Quản trị PToonGo..."
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-[#E9672E] transition-colors resize-none font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isContactLoading}
                className="w-full py-3.5 bg-gradient-to-r from-[#E9672E] to-[#244895] hover:from-[#549846] hover:to-[#E9672E] text-white font-bold rounded-xl text-sm tracking-wide shadow-md hover:shadow-[#E9672E]/20 transition-all duration-300 active-scale border border-white/10 flex items-center justify-center gap-2"
              >
                {isContactLoading ? "Đang gửi..." : "GỬI LIÊN HỆ NGAY"}
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB C: ADMIN ONLY - USERS ADMINISTRATION */}
        {isAdmin && activeTab === "users" && (
          <div className="flex flex-col gap-6" id="admin-user-management-block">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-white uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#549846]" />
                  Danh sách thành viên đăng ký
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Quản lý quyền hành viên, phân quyền Admin và bảo mật dữ liệu.
                </p>
              </div>
            </div>

            {/* User database table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20" id="users-records-table">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#08142E]/80 border-b border-white/10 text-[11px] font-mono uppercase tracking-widest text-slate-400">
                    <th className="py-3.5 px-4 font-semibold">Tên người dùng</th>
                    <th className="py-3.5 px-4 font-semibold">Địa chỉ Email</th>
                    <th className="py-3.5 px-4 font-semibold">Phân quyền</th>
                    <th className="py-3.5 px-4 font-semibold">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {userProfiles.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    return (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{user.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">{user.email}</td>
                        <td className="py-3 px-4">
                          <select
                            value={user.role}
                            disabled={isSelf}
                            onChange={(e) => onChangeUserRole(user.id, e.target.value as "admin" | "user")}
                            className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-black/40 border border-white/10 text-slate-200 focus:outline-none
                              ${user.role === "admin" ? "text-[#E9672E] border-[#E9672E]/30" : "text-[#549846] border-[#549846]/30"}
                              ${isSelf ? "opacity-60 cursor-not-allowed" : ""}
                            `}
                          >
                            <option value="user">Thành viên (User)</option>
                            <option value="admin">Quản trị viên (Admin)</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => !isSelf && onDeleteUser(user.id)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg bg-red-500/10 hover:bg-[#E9672E] text-slate-400 hover:text-white transition-all duration-300 active-scale
                              ${isSelf ? "opacity-30 cursor-not-allowed" : ""}
                            `}
                            title={isSelf ? "Không thể xóa chính mình" : "Xóa tài khoản vĩnh viễn khỏi Firebase"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {userProfiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 font-mono">
                        Chưa có dữ liệu thành viên nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB D: ADMIN ONLY - CONTACT MESSAGE COLLECTION */}
        {isAdmin && activeTab === "contacts" && (
          <div className="flex flex-col gap-6" id="admin-contact-messages-block">
            <div className="border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#E9672E]" />
                Hòm thư liên hệ & Đóng góp ý kiến
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Xem phản hồi trực tuyến gửi từ người dùng và khách hàng của PToonGo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="contacts-messages-grid">
              {contactMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className="bg-black/20 p-5 rounded-2xl border border-white/10 relative group hover:border-[#E9672E]/40 transition-colors"
                  id={`contact-msg-card-${msg.id}`}
                >
                  <button
                    onClick={() => onDeleteContact(msg.id)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#E9672E]/10 hover:bg-[#E9672E] text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    title="Xóa thư liên hệ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E9672E] to-[#244895] flex items-center justify-center text-white text-xs font-bold font-display uppercase shadow-md">
                        {msg.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{msg.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{msg.email}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                      <p className="text-xs md:text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                        {msg.message}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono self-end">
                      <Calendar className="w-3 h-3" />
                      {new Date(msg.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}

              {contactMessages.length === 0 && (
                <div className="col-span-full py-16 text-center bg-[#08142E]/20 rounded-2xl border border-dashed border-white/5 text-slate-400 flex flex-col items-center gap-2">
                  <span className="text-sm">Hòm thư liên hệ trống.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB E: ADMIN ONLY - SYSTEM DATA FILE DOWNLOADS */}
        {isAdmin && activeTab === "database" && (
          <div className="flex flex-col gap-6" id="admin-database-files-block">
            <div className="border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-lg text-white uppercase tracking-wide flex items-center gap-2">
                <Database className="w-5 h-5 text-[#244895]" />
                Quản lý & Tải về dữ liệu hệ thống
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Các file dữ liệu .json được lưu trữ trực tiếp cục bộ trên máy chủ. Bạn có thể tải trực tiếp các bản ghi này để sao lưu hoặc chỉnh sửa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="database-files-grid">
              {/* Card 1: Video.json */}
              <div className="bg-black/20 p-6 rounded-2xl border border-white/10 hover:border-[#549846]/40 transition-colors flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#549846]/10 border border-[#549846]/20 flex items-center justify-center text-[#549846]">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-display font-bold text-base text-white">Video.json</span>
                    <span className="text-xs text-slate-400 mt-1">Lưu trữ dữ liệu danh sách video, lượt xem, tóm tắt và danh mục.</span>
                    <span className="text-[10px] font-mono text-[#549846] mt-2 bg-[#549846]/10 px-2 py-0.5 rounded-md w-max">
                      Dữ liệu phim hoạt hình & trải nghiệm AI
                    </span>
                  </div>
                </div>
                <a 
                  href="/Video.json" 
                  download="Video.json"
                  className="w-full py-2.5 rounded-xl bg-[#549846] hover:bg-[#549846]/85 text-white font-semibold text-sm flex items-center justify-center gap-2 active-scale transition-colors shadow-lg shadow-[#549846]/20"
                >
                  <Download className="w-4 h-4" />
                  Tải về Video.json
                </a>
              </div>

              {/* Card 2: UserProfile.json */}
              <div className="bg-black/20 p-6 rounded-2xl border border-white/10 hover:border-[#244895]/40 transition-colors flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#244895]/10 border border-[#244895]/20 flex items-center justify-center text-[#244895]">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-display font-bold text-base text-white">UserProfile.json</span>
                    <span className="text-xs text-slate-400 mt-1">Lưu trữ danh sách người dùng, vai trò (admin/user) và ngày khởi tạo.</span>
                    <span className="text-[10px] font-mono text-[#244895] mt-2 bg-[#244895]/10 px-2 py-0.5 rounded-md w-max">
                      Số lượng tài khoản: {userProfiles.length}
                    </span>
                  </div>
                </div>
                <a 
                  href="/UserProfile.json" 
                  download="UserProfile.json"
                  className="w-full py-2.5 rounded-xl bg-[#244895] hover:bg-[#244895]/85 text-white font-semibold text-sm flex items-center justify-center gap-2 active-scale transition-colors shadow-lg shadow-[#244895]/20"
                >
                  <Download className="w-4 h-4" />
                  Tải về UserProfile.json
                </a>
              </div>

              {/* Card 3: ChatMessage.json */}
              <div className="bg-black/20 p-6 rounded-2xl border border-white/10 hover:border-[#E9672E]/40 transition-colors flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#E9672E]/10 border border-[#E9672E]/20 flex items-center justify-center text-[#E9672E]">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-display font-bold text-base text-white">ChatMessage.json</span>
                    <span className="text-xs text-slate-400 mt-1">Danh sách tin nhắn thảo luận nhóm trực tiếp trong hòm chat.</span>
                    <span className="text-[10px] font-mono text-[#E9672E] mt-2 bg-[#E9672E]/10 px-2 py-0.5 rounded-md w-max">
                      Nhật ký phòng thảo luận công nghệ
                    </span>
                  </div>
                </div>
                <a 
                  href="/ChatMessage.json" 
                  download="ChatMessage.json"
                  className="w-full py-2.5 rounded-xl bg-[#E9672E] hover:bg-[#E9672E]/85 text-white font-semibold text-sm flex items-center justify-center gap-2 active-scale transition-colors shadow-lg shadow-[#E9672E]/20"
                >
                  <Download className="w-4 h-4" />
                  Tải về ChatMessage.json
                </a>
              </div>

              {/* Card 4: ContactMessage.json */}
              <div className="bg-black/20 p-6 rounded-2xl border border-white/10 hover:border-pink-500/40 transition-colors flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <Contact className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-display font-bold text-base text-white">ContactMessage.json</span>
                    <span className="text-xs text-slate-400 mt-1">Phản hồi đóng góp ý kiến và thư liên hệ được nhận từ biểu mẫu.</span>
                    <span className="text-[10px] font-mono text-pink-400 mt-2 bg-pink-500/10 px-2 py-0.5 rounded-md w-max">
                      Số lượng thư: {contactMessages.length}
                    </span>
                  </div>
                </div>
                <a 
                  href="/ContactMessage.json" 
                  download="ContactMessage.json"
                  className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-600/85 text-white font-semibold text-sm flex items-center justify-center gap-2 active-scale transition-colors shadow-lg shadow-pink-500/20"
                >
                  <Download className="w-4 h-4" />
                  Tải về ContactMessage.json
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

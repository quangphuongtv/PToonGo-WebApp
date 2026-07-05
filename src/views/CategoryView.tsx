import React, { useState, useEffect, useRef } from "react";
import { Video, ChatMessage, UserProfile } from "../types";
import VideoPlayer from "../components/VideoPlayer";
import VideoCard from "../components/VideoCard";
import { Play, Film, MapPin, Sparkles, Send, MessageSquare, Clock, Eye, AlertCircle } from "lucide-react";

interface CategoryViewProps {
  category: "Phim hoạt hình" | "Du lịch trải nghiệm" | "Trao đổi công nghệ AI";
  slogan: string;
  videos: Video[];
  chatMessages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  currentUser: UserProfile | null;
}

export default function CategoryView({
  category,
  slogan,
  videos,
  chatMessages = [],
  onSendMessage,
  currentUser
}: CategoryViewProps) {
  // Filter videos for the current category
  const categoryVideos = videos.filter(v => v.category === category);
  
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

  // Local state for active video in player, restored from local storage
  const [activeVideo, setActiveVideo] = useState<Video | null>(() => {
    const savedId = safeGetLocalStorage(`ptoongo_active_video_${category}`);
    if (savedId && videos.length > 0) {
      const found = videos.find(v => v.id === savedId && v.category === category);
      if (found) return found;
    }
    return null;
  });
  const [chatInput, setChatInput] = useState(() => safeGetLocalStorage(`ptoongo_chat_input_${category}`) || "");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Set the first video as active initially or when category changes
  useEffect(() => {
    if (categoryVideos.length > 0) {
      const savedId = safeGetLocalStorage(`ptoongo_active_video_${category}`);
      const found = savedId ? categoryVideos.find(v => v.id === savedId) : null;
      setActiveVideo(found || categoryVideos[0]);
    } else {
      setActiveVideo(null);
    }
  }, [category, videos]);

  useEffect(() => {
    if (activeVideo) {
      safeSetLocalStorage(`ptoongo_active_video_${category}`, activeVideo.id);
    } else {
      safeRemoveLocalStorage(`ptoongo_active_video_${category}`);
    }
  }, [activeVideo, category]);

  useEffect(() => {
    safeSetLocalStorage(`ptoongo_chat_input_${category}`, chatInput);
  }, [chatInput, category]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !onSendMessage) return;
    onSendMessage(chatInput.trim());
    setChatInput("");
    safeRemoveLocalStorage(`ptoongo_chat_input_${category}`);
  };

  const isAI = category === "Trao đổi công nghệ AI";

  return (
    <div className="flex flex-col gap-10" id={`category-view-${category.replace(/\s+/g, '-').toLowerCase()}`}>
      
      {/* KHUNG BANNER (NẰM DƯỚI HEADER) */}
      <div className="relative w-full rounded-3xl overflow-hidden py-12 px-6 md:px-12 bg-gradient-to-r from-[#08142E] via-[#244895] to-[#112037] border border-white/10 shadow-xl text-left">
        <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {category === "Phim hoạt hình" && <Film className="w-6 h-6 text-[#549846]" />}
            {category === "Du lịch trải nghiệm" && <MapPin className="w-6 h-6 text-[#E9672E]" />}
            {category === "Trao đổi công nghệ AI" && <Sparkles className="w-6 h-6 text-blue-400" />}
            <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#549846] uppercase">Phân vùng nội dung</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl text-white tracking-wide uppercase">
            {category}
          </h1>
          <p className="font-sans text-slate-300 text-sm md:text-lg italic font-light tracking-wide max-w-2xl">
            "{slogan}"
          </p>
        </div>
      </div>

      {/* SESSION 1: GIỚI THIỆU (ACTIVE MOVIE VIEW) */}
      <section className="frosted-card-premium rounded-3xl p-6 md:p-8" id="category-session-intro">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
          <div className="w-2.5 h-6 bg-[#549846] rounded-full shadow-[0_0_10px_#549846]" />
          <h2 className="font-display font-bold text-xl text-white tracking-wide uppercase">
            Hệ thống chiếu chính & Thông tin chi tiết
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột trái: Khung trình chiếu video 16:9 */}
          <div className="lg:col-span-2 flex flex-col gap-4" id="category-player-pane">
            {activeVideo ? (
              <VideoPlayer 
                videoUrl={activeVideo.videoUrl} 
                thumbnailUrl={activeVideo.thumbnailUrl} 
                title={activeVideo.title}
                autoPlay={true} /* Auto plays when clicked from main cards */
              />
            ) : (
              <div className="aspect-video bg-black/60 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-400 gap-3">
                <AlertCircle className="w-10 h-10 text-[#E9672E]" />
                <p className="text-sm">Chưa có video nào trong danh mục này.</p>
              </div>
            )}
          </div>

          {/* Cột phải: Khung Thông tin chi tiết */}
          <div className="flex flex-col justify-between bg-[#08142E]/50 backdrop-blur-sm p-6 rounded-2xl border border-white/10 text-left h-full min-h-[300px]" id="category-info-pane">
            {activeVideo ? (
              <div className="flex flex-col gap-4 h-full">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#244895] text-slate-200 uppercase rounded border border-white/10 inline-block w-fit">
                    {activeVideo.category}
                  </span>
                  <h3 className="font-display font-bold text-xl text-white leading-snug uppercase">
                    {activeVideo.title}
                  </h3>
                </div>

                <div className="flex-grow">
                  <h4 className="text-xs font-mono tracking-wider text-slate-400 uppercase mb-1">Tóm tắt nội dung</h4>
                  <p className="text-sm text-slate-300 leading-relaxed font-light text-justify">
                    {activeVideo.summary}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-auto">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4 text-[#549846]" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Thời lượng</span>
                      <span className="text-xs font-mono font-semibold text-slate-200">{activeVideo.duration}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Eye className="w-4 h-4 text-[#E9672E]" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Lượt xem</span>
                      <span className="text-xs font-mono font-semibold text-slate-200">{activeVideo.views?.toLocaleString()} lượt</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                <p className="text-sm">Chọn một video bên dưới để xem chi tiết.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SESSION 2: CHỦ ĐỀ CHÍNH (GRID OF SMALLER VIDEO CARDS) */}
      <section className="flex flex-col gap-6" id="category-session-grid">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <div className="w-2.5 h-6 bg-[#E9672E] rounded-full shadow-[0_0_10px_#E9672E]" />
          <h2 className="font-display font-bold text-xl text-white tracking-wide uppercase">
            Danh mục video: {category} ({categoryVideos.length})
          </h2>
        </div>

        {/* Dynamic wrapping grid (up to 4 per row) using flex or responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="category-cards-grid">
          {categoryVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onSelect={(selectedVid) => {
                setActiveVideo(selectedVid);
                // Scroll page smoothly to main player
                const playerElement = document.getElementById("category-session-intro");
                if (playerElement) {
                  playerElement.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              isSelected={activeVideo?.id === video.id}
            />
          ))}

          {categoryVideos.length === 0 && (
            <div className="col-span-full py-16 text-center bg-[#08142E]/20 rounded-2xl border border-dashed border-white/5 text-slate-400 flex flex-col items-center gap-2">
              <span className="text-sm">Chưa có dữ liệu phim cho danh mục này.</span>
            </div>
          )}
        </div>
      </section>

      {/* CHAT EXCHANGE SECTION (ONLY FOR AI TECH PAGE) */}
      {isAI && (
        <section className="bg-[#08142E]/40 rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl mt-4 text-left" id="category-chat-section">
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h2 className="font-display font-bold text-xl text-white tracking-wide uppercase">
              Phòng Thảo Luận Công Nghệ AI
            </h2>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded border border-blue-500/20 font-mono uppercase ml-2">
              Real-time
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[450px]">
            {/* Left sidebar: Guidelines and User list / info */}
            <div className="bg-[#08142E]/50 p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">Chào mừng</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  Không gian trao đổi, chia sẻ sáng kiến khoa học, kỹ thuật học máy, xử lý ngôn ngữ tự nhiên và các giải pháp AI đột phá thế giới cùng cộng đồng PToonGo.
                </p>
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-[11px] text-blue-300 font-mono leading-relaxed">
                  ⚠️ Lưu ý: Vui lòng duy trì môi trường trao đổi lịch sự, tôn trọng bản quyền và tính an toàn công nghệ.
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Đang đăng nhập dưới tên:</span>
                <span className="text-sm font-semibold text-slate-200">
                  {currentUser ? currentUser.name : "Khách ẩn danh"}
                </span>
              </div>
            </div>

            {/* Right container: Message box & sending input */}
            <div className="lg:col-span-3 flex flex-col h-full bg-black/30 rounded-2xl border border-white/5 overflow-hidden">
              {/* Message scroll container */}
              <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4">
                {chatMessages.map((msg) => {
                  const isOwnMessage = currentUser && msg.userId === currentUser.id;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${isOwnMessage ? "self-end items-end" : "self-start items-start"}`}
                    >
                      {/* Message author label */}
                      <span className="text-[10px] text-slate-500 font-mono mb-1 px-1">
                        {msg.userName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {/* Message bubble */}
                      <div className={`p-3 rounded-2xl text-xs md:text-sm shadow border
                        ${isOwnMessage 
                          ? "bg-[#244895] text-white border-white/10 rounded-tr-none" 
                          : "bg-[#08142E] text-slate-200 border-white/5 rounded-tl-none"
                        }
                      `}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })}

                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                    <MessageSquare className="w-8 h-8 opacity-30" />
                    <p className="text-xs">Chưa có thảo luận nào. Hãy bắt đầu câu chuyện ngay!</p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input action bar */}
              <form onSubmit={handleSendChat} className="p-3 bg-[#08142E]/50 border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={currentUser ? "Nhập tin nhắn thảo luận..." : "Đăng nhập để tham gia trò chuyện..."}
                  disabled={!currentUser}
                  className="flex-grow px-4 py-2.5 rounded-xl bg-black/30 text-slate-100 text-sm border border-white/10 focus:outline-none focus:border-[#549846] transition-colors font-sans placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || !currentUser}
                  className="px-4 py-2.5 rounded-xl bg-[#549846] hover:bg-[#244895] disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-1.5 transition-all duration-300 active-scale shadow-md hover:shadow-[#549846]/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

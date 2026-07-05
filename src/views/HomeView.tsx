import React, { useState, useEffect } from "react";
import { Video } from "../types";
import VideoPlayer from "../components/VideoPlayer";
import VideoCard from "../components/VideoCard";
import ResolvedImage from "../components/ResolvedImage";
import { Play, Flame, Film, Sparkles, MapPin, MonitorPlay, MessageSquare } from "lucide-react";

interface HomeViewProps {
  videos: Video[];
  onSelectPage: (page: string) => void;
}

export default function HomeView({ videos, onSelectPage }: HomeViewProps) {
  // Get introductory videos
  const introVideos = videos.filter(v => v.category === "Giới thiệu");
  
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

  // Set first introductory video as active initially or restore from local storage
  const [activeIntroVideo, setActiveIntroVideo] = useState<Video | null>(() => {
    const savedId = safeGetLocalStorage("ptoongo_active_intro_video_id");
    if (savedId && videos.length > 0) {
      const found = videos.find(v => v.id === savedId && v.category === "Giới thiệu");
      if (found) return found;
    }
    return null;
  });

  useEffect(() => {
    if (activeIntroVideo) {
      safeSetLocalStorage("ptoongo_active_intro_video_id", activeIntroVideo.id);
    } else {
      safeRemoveLocalStorage("ptoongo_active_intro_video_id");
    }
  }, [activeIntroVideo]);

  useEffect(() => {
    if (introVideos.length > 0) {
      const isStillExists = activeIntroVideo ? introVideos.some(v => v.id === activeIntroVideo.id) : false;
      if (!isStillExists) {
        const savedId = safeGetLocalStorage("ptoongo_active_intro_video_id");
        const found = savedId ? introVideos.find(v => v.id === savedId) : null;
        setActiveIntroVideo(found || introVideos[0]);
      }
    } else {
      setActiveIntroVideo(null);
    }
  }, [videos, introVideos, activeIntroVideo]);

  // Get representative video for each category to show in Session 2
  const categories = [
    { name: "Phim hoạt hình", icon: <Film className="w-4 h-4 text-[#549846]" />, page: "cartoon" },
    { name: "Du lịch trải nghiệm", icon: <MapPin className="w-4 h-4 text-[#E9672E]" />, page: "travel" },
    { name: "Trao đổi công nghệ AI", icon: <Sparkles className="w-4 h-4 text-blue-400" />, page: "ai" },
    { name: "Giới thiệu", icon: <MonitorPlay className="w-4 h-4 text-slate-300" />, page: "home" }
  ];

  // Get the latest/first video of each category for the 4 Cards in Session 2
  const mainCardsVideos = categories.map(cat => {
    const catVideos = videos.filter(v => v.category === cat.name);
    return catVideos.length > 0 ? catVideos[0] : null;
  }).filter((v): v is Video => v !== null);

  return (
    <div className="flex flex-col gap-12" id="home-view-container">
      
      {/* SECTION 1: GIỚI THIỆU (INTRO SECTION) */}
      <section className="frosted-card-premium rounded-3xl p-6 md:p-8" id="home-session-intro">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
          <div className="w-2.5 h-6 bg-[#549846] rounded-full shadow-[0_0_10px_#549846]" />
          <h2 className="font-display font-bold text-2xl text-white tracking-wide uppercase">
            Hệ Thống Trình Chiếu Giới Thiệu
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột trái: Khung trình chiếu video 16:9 chính */}
          <div className="lg:col-span-2 flex flex-col gap-4" id="home-intro-player-pane">
            {activeIntroVideo ? (
              <>
                <VideoPlayer 
                  videoUrl={activeIntroVideo.videoUrl} 
                  thumbnailUrl={activeIntroVideo.thumbnailUrl} 
                  title={activeIntroVideo.title}
                  autoPlay={false}
                />
                <div className="p-4 bg-[#08142E]/50 backdrop-blur-sm rounded-2xl border border-white/10">
                  <span className="text-xs font-mono px-2.5 py-1 bg-[#549846]/20 text-[#549846] font-semibold uppercase rounded-full tracking-wider border border-[#549846]/30 inline-block mb-2">
                    {activeIntroVideo.category}
                  </span>
                  <h3 className="font-display font-bold text-lg md:text-xl text-white mb-2 uppercase">
                    {activeIntroVideo.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {activeIntroVideo.summary}
                  </p>
                </div>
              </>
            ) : (
              <div className="aspect-video bg-black/50 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center text-slate-400 gap-2">
                <p>Đang tải video giới thiệu...</p>
              </div>
            )}
          </div>

          {/* Cột phải: Danh sách video giới thiệu gồm nhiều dòng */}
          <div className="flex flex-col gap-4 h-[450px] overflow-y-auto pr-1" id="home-intro-list-pane">
            <h3 className="font-display font-semibold text-sm text-[#549846] uppercase tracking-wider mb-1">
              Danh Sách Giới Thiệu ({introVideos.length})
            </h3>
            
            <div className="flex flex-col gap-3">
              {introVideos.map((video) => {
                const isSelected = activeIntroVideo?.id === video.id;
                return (
                  <div
                    key={video.id}
                    id={`intro-item-${video.id}`}
                    onClick={() => setActiveIntroVideo(video)}
                    className={`flex gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-300 active-scale group/item
                      ${isSelected 
                        ? "bg-[#244895]/80 border-white/20 shadow-[0_0_15px_rgba(233,103,46,0.3)] scale-[1.01]" 
                        : "bg-[#08142E]/50 border-white/10 hover:bg-[#244895] hover:scale-[1.01]"
                      }
                    `}
                  >
                    {/* Left: small aspect-16:9 thumbnail */}
                    <div className="w-24 aspect-video bg-[#0a1b3d] rounded-lg overflow-hidden relative flex-shrink-0 border border-white/5">
                      <ResolvedImage 
                        src={video.thumbnailUrl} 
                        alt={video.title} 
                        className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white opacity-80 group-hover/item:opacity-100 transition-opacity" />
                      </div>
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/70 px-1 py-0.5 rounded text-white">
                        {video.duration}
                      </span>
                    </div>

                    {/* Right: tóm tắt, tiêu đề */}
                    <div className="flex-grow flex flex-col justify-center min-w-0 pl-1 text-left">
                      <h4 className={`text-xs md:text-sm font-bold truncate leading-tight transition-colors uppercase
                        ${isSelected ? "text-white" : "text-slate-100 group-hover/item:text-[#549846]"}
                      `}>
                        {video.title}
                      </h4>
                      <p className="text-[10px] text-white/50 line-clamp-2 mt-1 leading-snug text-justify">
                        {video.summary}
                      </p>
                    </div>
                  </div>
                );
              })}

              {introVideos.length === 0 && (
                <div className="p-8 text-center bg-[#08142E]/20 rounded-xl border border-dashed border-white/10 text-slate-400">
                  Chưa có video giới thiệu nào được tải lên.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CHỦ ĐỀ CHÍNH (MAIN SUBJECTS SECTION) */}
      <section className="flex flex-col gap-6" id="home-session-subjects">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-6 bg-[#E9672E] rounded-full shadow-[0_0_10px_#E9672E]" />
            <h2 className="font-display font-bold text-2xl text-white tracking-wide uppercase">
              Bản Tin Trình Chiếu Chủ Đề
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Xem nhanh hoạt động của 4 phân vùng chính
          </span>
        </div>

        {/* 4 Cards laid out beautifully in 1 row (flex/grid responsive) representing the 4 categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="home-subjects-grid">
          {categories.map((cat, idx) => {
            const videoForCat = mainCardsVideos.find(v => v.category === cat.name) || videos.find(v => v.category === cat.name);
            
            return (
              <div 
                key={cat.name} 
                className="bg-[#08142E] p-3 rounded-2xl border border-white/5 flex flex-col gap-3 group transition-all hover:scale-[1.01] hover:bg-[#1a3b83] text-left"
              >
                {/* Category header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 tracking-wide uppercase">
                    {cat.icon}
                    {cat.name}
                  </span>
                  <button 
                    onClick={() => onSelectPage(cat.page)}
                    className="text-[10px] text-slate-400 hover:text-[#549846] uppercase font-bold tracking-widest transition-colors"
                  >
                    Xem tất cả →
                  </button>
                </div>

                {videoForCat ? (
                  /* Render the specific 4-section vertical structure for the video card */
                  <div className="flex flex-col h-full gap-3">
                    {/* 1. Static Video Thumbnail with Play Button */}
                    <div 
                      className="aspect-video w-full rounded-xl overflow-hidden shadow-md relative cursor-pointer group/thumb border border-white/5"
                      onClick={() => onSelectPage(cat.page)}
                    >
                      <ResolvedImage 
                        src={videoForCat.thumbnailUrl} 
                        alt={videoForCat.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/50 flex items-center justify-center transition-all duration-300">
                        <div className="w-10 h-10 rounded-full bg-[#E9672E]/95 group-hover/thumb:bg-[#549846] flex items-center justify-center shadow-lg transition-all duration-300 transform group-hover/thumb:scale-110 border border-white/10">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    {/* 2. Tiêu đề dòng */}
                    <h4 className="font-display font-bold text-white text-sm uppercase leading-tight line-clamp-1 group-hover/subject:text-[#549846] transition-colors">
                      {videoForCat.title}
                    </h4>
                    {/* 3. Tóm tắt nội dung */}
                    <p className="text-[10px] text-white/50 font-sans leading-relaxed line-clamp-2 flex-grow text-justify">
                      {videoForCat.summary}
                    </p>
                    {/* 4. Action button */}
                    <button 
                      onClick={() => onSelectPage(cat.page)}
                      className="w-full mt-1 py-1.5 rounded-full bg-[#E9672E] shadow-[0_0_15px_rgba(233,103,46,0.3)] hover:shadow-[0_0_20px_#E9672E] text-white text-xs font-semibold transition-all duration-300 active-scale flex items-center justify-center gap-1"
                    >
                      <span>Mở Trang {cat.name}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center p-8 bg-black/20 rounded-xl border border-dashed border-white/5 text-slate-500 gap-2">
                    <span className="text-xs">Chưa có video chủ đề này</span>
                    <button 
                      onClick={() => onSelectPage("manage_videos")}
                      className="text-[10px] text-white bg-[#244895] px-2.5 py-1 rounded"
                    >
                      + Tải lên ngay
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

import React from "react";
import { Video } from "../types";
import ResolvedImage from "./ResolvedImage";
import { Play, Eye, Clock, ArrowUpRight } from "lucide-react";

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  isSelected?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect, isSelected = false }) => {
  return (
    <div 
      id={`video-card-${video.id}`}
      className={`flex flex-col rounded-2xl bg-[#08142E] border transition-all duration-300 overflow-hidden group/card text-left
        ${isSelected 
          ? "border-[#549846] ring-1 ring-[#549846]/40 shadow-xl shadow-[#549846]/10" 
          : "border-white/10 hover:border-[#244895] hover:shadow-lg hover:shadow-black/30"
        }
      `}
    >
      {/* Khung 1: Video Thumbnail (Tỉ lệ 16:9) */}
      <div 
        className="w-full relative aspect-video cursor-pointer overflow-hidden group/thumb border-b border-white/5" 
        id={`card-media-player-${video.id}`}
        onClick={() => onSelect(video)}
      >
        <ResolvedImage 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
        />
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/50 flex items-center justify-center transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-[#E9672E]/90 group-hover/thumb:bg-[#549846] flex items-center justify-center shadow-lg transition-all duration-300 transform group-hover/thumb:scale-110 border border-white/10">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Khung 2: Tiêu đề video */}
      <div className="p-4 pb-2" id={`card-title-container-${video.id}`}>
        <h4 className="font-display font-bold text-slate-100 text-sm md:text-base leading-snug line-clamp-1 group-hover/card:text-[#549846] transition-colors uppercase">
          {video.title}
        </h4>
      </div>

      {/* Khung 3: Tóm tắt nội dung phim */}
      <div className="px-4 pb-2 flex-grow" id={`card-summary-container-${video.id}`}>
        <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-2 text-justify">
          {video.summary}
        </p>
      </div>

      {/* Khung 4: Thẻ thông tin bổ trợ / Nút điều khiển trình chiếu chính */}
      <div className="p-4 pt-1 border-t border-white/5 bg-black/10 flex items-center justify-between" id={`card-footer-container-${video.id}`}>
        <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#549846]" />
            {video.duration}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            {video.views?.toLocaleString()}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(video);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 active-scale
            ${isSelected 
              ? "bg-[#549846] text-white shadow-md shadow-[#549846]/20" 
              : "bg-[#244895] hover:bg-[#549846] text-white border border-white/10"
            }
          `}
        >
          <span>Trình chiếu</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default VideoCard;

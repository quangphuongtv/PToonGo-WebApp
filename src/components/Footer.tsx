import React from "react";
import { Youtube, Facebook, MessageCircle, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full glass-footer py-6 px-4 md:px-8 mt-auto">
      <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left copyright section */}
        <div className="text-center sm:text-left" id="footer-left-copyright">
          <p className="italic text-slate-400 text-sm tracking-wide font-light">
            Copyright by <span className="font-semibold text-slate-200 not-italic uppercase tracking-wider">NGUYEN QUANG PHUONG</span>
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            Hệ thống giải trí & Đào tạo công nghệ PToonGo © 2026
          </p>
        </div>

        {/* Brand visual accent */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <span>Phát triển bằng</span>
          <Heart className="w-3.5 h-3.5 text-[#E9672E] fill-[#E9672E]" />
          <span>cho trải nghiệm điện ảnh tối ưu</span>
        </div>

        {/* Right social icons */}
        <div className="flex items-center gap-4" id="footer-social-links">
          {/* Youtube */}
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-red-600 flex items-center justify-center text-slate-300 hover:text-white transition-all duration-300 active-scale shadow-md hover:shadow-red-600/30 group"
            title="Kênh Youtube PToonGo"
          >
            <Youtube className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </a>

          {/* Facebook */}
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center text-slate-300 hover:text-white transition-all duration-300 active-scale shadow-md hover:shadow-blue-600/30 group"
            title="Trang Facebook PToonGo"
          >
            <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </a>

          {/* Zalo */}
          <a
            href="https://zalo.me"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-[#244895] flex items-center justify-center text-slate-300 hover:text-white transition-all duration-300 active-scale shadow-md hover:shadow-[#244895]/30 group"
            title="Zalo NGUYEN QUANG PHUONG"
          >
            {/* Custom Chat/Zalo icon */}
            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  );
}

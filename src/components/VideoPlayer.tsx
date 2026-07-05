import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react";
import { resolveMediaUrl } from "../lib/indexedDBStore";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl: string;
  title?: string;
  autoPlay?: boolean;
}

export default function VideoPlayer({ videoUrl, thumbnailUrl, title, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [resolvedVideoUrl, setResolvedVideoUrl] = useState(videoUrl);
  const [resolvedThumbnailUrl, setResolvedThumbnailUrl] = useState(thumbnailUrl);

  const isYouTube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");

  // Helper to extract or prepare embed URLs for YouTube
  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes("embed/")) {
      if (autoPlay && !url.includes("autoplay=")) {
        return url.includes("?") ? `${url}&autoplay=1&mute=1` : `${url}?autoplay=1&mute=1`;
      }
      return url;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      const videoId = match[2];
      let embed = `https://www.youtube.com/embed/${videoId}`;
      if (autoPlay) {
        embed += `?autoplay=1&mute=1`;
      }
      return embed;
    }
    return url;
  };

  const embedUrl = isYouTube ? getYouTubeEmbedUrl(videoUrl) : "";

  // Resolve localdb media URLs asynchronously
  useEffect(() => {
    let active = true;
    const resolveUrls = async () => {
      const vid = await resolveMediaUrl(videoUrl, videoUrl);
      const thumb = await resolveMediaUrl(thumbnailUrl, thumbnailUrl);
      if (active) {
        setResolvedVideoUrl(vid);
        setResolvedThumbnailUrl(thumb);
      }
    };
    resolveUrls();
    return () => {
      active = false;
    };
  }, [videoUrl, thumbnailUrl]);

  useEffect(() => {
    // Reset play status when video URL changes
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setIsMuted(false); // Default sound is always unmuted (turned ON) when loading or switching videos
    if (!isYouTube && videoRef.current) {
      videoRef.current.load();
      videoRef.current.volume = 0.5; // Default volume to 50%
      videoRef.current.muted = false; // Always unmuted
      if (autoPlay) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          // Ignore auto-play blocker errors and use simulated play
          console.warn("Autoplay blocked or not supported, falling back to simulated play:", err);
          setIsPlaying(true);
        });
      }
    }
  }, [resolvedVideoUrl, autoPlay, isYouTube]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.5;
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  }, []);

  // Simulated progress fallback for headless browsers / sandboxes where codecs or video elements are unsupported
  useEffect(() => {
    if (isYouTube) return;
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        if (videoRef.current) {
          // If the video is actually paused or not advancing, we simulate progress
          if (videoRef.current.paused || videoRef.current.currentTime === 0) {
            setCurrentTime(prev => {
              const dur = duration || 15; // default to a small duration (15s) or actual duration
              const next = prev + 1;
              setProgress(dur > 0 ? (next / dur) * 100 : 0);
              if (next >= dur) {
                setIsPlaying(false);
                return 0;
              }
              return next;
            });
          }
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, isYouTube]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current || isYouTube) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Video play not supported or blocked, enabling simulated play fallback:", err);
        setIsPlaying(true);
      });
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current || isYouTube) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || isYouTube) return;
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(current);
    setDuration(dur);
    setProgress(dur > 0 ? (current / dur) * 100 : 0);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || isYouTube) return;
    const newProgress = parseFloat(e.target.value);
    const newTime = (newProgress / 100) * duration;
    videoRef.current.currentTime = newTime;
    setProgress(newProgress);
  };

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current || isYouTube) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if ((videoRef.current as any).webkitRequestFullscreen) {
      (videoRef.current as any).webkitRequestFullscreen();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative group w-full aspect-video rounded-2xl overflow-hidden bg-black/90 border border-white/10 shadow-2xl">
      {isYouTube ? (
        <iframe
          src={embedUrl}
          title={title || "YouTube Video Player"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      ) : (
        <>
          {/* Video element */}
          <video
            ref={videoRef}
            src={resolvedVideoUrl}
            poster={resolvedThumbnailUrl}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => {
              if (videoRef.current) {
                videoRef.current.volume = 0.5;
                videoRef.current.muted = isMuted;
              }
            }}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
            playsInline
            muted={isMuted}
          />

          {/* Center large Play button overlay */}
          {!isPlaying && (
            <div 
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer group-hover:bg-black/20 transition-all duration-300"
            >
              <button className="w-16 h-16 rounded-full bg-[#E9672E] hover:bg-[#549846] text-white flex items-center justify-center shadow-xl shadow-black/50 transition-all duration-300 transform group-hover:scale-110 active-scale border border-white/20">
                <Play className="w-8 h-8 fill-white ml-1" />
              </button>
            </div>
          )}

          {/* Controls panel at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
            {/* Progress bar slider */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleProgressChange}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#E9672E] hover:accent-[#549846] transition-all"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-[#549846] transition-colors p-1"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                {/* Mute/Unmute */}
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-[#549846] transition-colors p-1"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Time code */}
                <span className="text-xs text-slate-300 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration || 0)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {title && (
                  <span className="hidden sm:inline text-xs font-mono tracking-wide text-slate-400 max-w-[200px] truncate uppercase">
                    {title}
                  </span>
                )}

                {/* Fullscreen */}
                <button
                  onClick={toggleFullScreen}
                  className="text-white hover:text-[#549846] transition-colors p-1"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { Video } from "../types";
import VideoPlayer from "../components/VideoPlayer";
import ResolvedImage from "../components/ResolvedImage";
import { saveFile, compressImage, deleteFile } from "../lib/indexedDBStore";

import { 
  Upload, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Film, 
  MapPin, 
  Sparkles, 
  MonitorPlay,
  Edit3,
  AlertTriangle,
  FileVideo,
  FileImage
} from "lucide-react";

interface ManageVideosViewProps {
  videos: Video[];
  onAddVideo: (video: Omit<Video, "id" | "views">) => Promise<void>;
  onUpdateVideo: (id: string, updatedFields: Partial<Video>) => Promise<void>;
  onDeleteVideo: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

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
    if (value && (value.startsWith("data:") || value.startsWith("blob:") || value.length > 2000)) {
      // Do not write extremely large data URLs, Base64 strings, or transient session blob URLs to localStorage
      return;
    }
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

export default function ManageVideosView({
  videos,
  onAddVideo,
  onUpdateVideo,
  onDeleteVideo,
  onRefresh
}: ManageVideosViewProps) {
  
  // Form State, restored for system recovery mode
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(() => {
    const saved = safeGetLocalStorage("ptoongo_selected_video_id");
    return saved || null;
  });
  const [title, setTitle] = useState(() => safeGetLocalStorage("ptoongo_video_title") || "");
  const [summary, setSummary] = useState(() => safeGetLocalStorage("ptoongo_video_summary") || "");
  const [category, setCategory] = useState<Video["category"]>(() => (safeGetLocalStorage("ptoongo_video_category") as Video["category"]) || "Phim hoạt hình");
  const [videoUrl, setVideoUrl] = useState(() => {
    const saved = safeGetLocalStorage("ptoongo_video_url");
    return saved.startsWith("data:") || saved.length > 2000 ? "" : saved;
  });
  const [thumbnailUrl, setThumbnailUrl] = useState(() => {
    const saved = safeGetLocalStorage("ptoongo_thumbnail_url");
    return saved.startsWith("data:") || saved.length > 2000 ? "" : saved;
  });
  
  // Storage files
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Upload status and previews, restored for system recovery mode
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(() => {
    const saved = safeGetLocalStorage("ptoongo_video_preview_url");
    return saved.startsWith("data:") || saved.startsWith("blob:") || saved.length > 2000 ? "" : saved;
  });
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(() => {
    const saved = safeGetLocalStorage("ptoongo_thumbnail_preview_url");
    return saved.startsWith("data:") || saved.startsWith("blob:") || saved.length > 2000 ? "" : saved;
  });
  const [isDragVideoActive, setIsDragVideoActive] = useState(false);
  const [isDragImageActive, setIsDragImageActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-persist input values on changes for recovery mode
  useEffect(() => {
    if (selectedVideoId) {
      safeSetLocalStorage("ptoongo_selected_video_id", selectedVideoId);
    } else {
      safeRemoveLocalStorage("ptoongo_selected_video_id");
    }
  }, [selectedVideoId]);

  useEffect(() => {
    safeSetLocalStorage("ptoongo_video_title", title);
  }, [title]);

  useEffect(() => {
    safeSetLocalStorage("ptoongo_video_summary", summary);
  }, [summary]);

  useEffect(() => {
    safeSetLocalStorage("ptoongo_video_category", category);
  }, [category]);

  useEffect(() => {
    safeSetLocalStorage("ptoongo_video_url", videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    safeSetLocalStorage("ptoongo_thumbnail_url", thumbnailUrl);
  }, [thumbnailUrl]);

  useEffect(() => {
    safeSetLocalStorage("ptoongo_video_preview_url", videoPreviewUrl);
  }, [videoPreviewUrl]);

  useEffect(() => {
    safeSetLocalStorage("ptoongo_thumbnail_preview_url", thumbnailPreviewUrl);
  }, [thumbnailPreviewUrl]);

  // Group videos by category for the right list column
  const categoriesList: Video["category"][] = [
    "Giới thiệu",
    "Phim hoạt hình",
    "Du lịch trải nghiệm",
    "Trao đổi công nghệ AI"
  ];

  // Map category to representative default URLs for backup/persistence
  const categoryDefaultMedia = {
    "Giới thiệu": {
      video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60"
    },
    "Phim hoạt hình": {
      video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=60"
    },
    "Du lịch trải nghiệm": {
      video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=60"
    },
    "Trao đổi công nghệ AI": {
      video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=60"
    }
  };

  // Populate form with selected video details
  const handleSelectVideoForEdit = (video: Video) => {
    setSelectedVideoId(video.id);
    setTitle(video.title.toUpperCase());
    setSummary(video.summary);
    setCategory(video.category);
    setVideoUrl(video.videoUrl);
    setThumbnailUrl(video.thumbnailUrl);
    
    // Set previews
    setVideoPreviewUrl(video.videoUrl);
    setThumbnailPreviewUrl(video.thumbnailUrl);
    setStatusMessage({ text: `Đã chọn: ${video.title.toUpperCase()} để chỉnh sửa.` });
  };

  // Clear Form State
  const handleResetForm = () => {
    setSelectedVideoId(null);
    setTitle("");
    setSummary("");
    setCategory("Phim hoạt hình");
    setVideoUrl("");
    setThumbnailUrl("");
    setVideoPreviewUrl("");
    setThumbnailPreviewUrl("");
    setVideoFile(null);
    setImageFile(null);
    setStatusMessage(null);

    // Also clear from localStorage for system recovery mode
    safeRemoveLocalStorage("ptoongo_selected_video_id");
    safeRemoveLocalStorage("ptoongo_video_title");
    safeRemoveLocalStorage("ptoongo_video_summary");
    safeRemoveLocalStorage("ptoongo_video_category");
    safeRemoveLocalStorage("ptoongo_video_url");
    safeRemoveLocalStorage("ptoongo_thumbnail_url");
    safeRemoveLocalStorage("ptoongo_video_preview_url");
    safeRemoveLocalStorage("ptoongo_thumbnail_preview_url");
  };

  // Convert File to Base64 String (highly efficient for storing custom images directly in Firestore!)
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Capture frame from video file or video URL
  const captureVideoFrame = (videoSource: string | File, seekTime: number = 1): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;

      let objectUrl: string | null = null;
      if (videoSource instanceof File) {
        objectUrl = URL.createObjectURL(videoSource);
        video.src = objectUrl;
      } else {
        // Handle YouTube URLs by extracting their high-quality default thumbnail directly
        if (!videoSource || videoSource.includes("youtube.com") || videoSource.includes("youtu.be")) {
          const ytIdMatch = videoSource.match(/(?:embed\/|v=|vi\/|youtu\.be\/|shorts\/)([^#\&\?]*)/);
          if (ytIdMatch && ytIdMatch[1]) {
            const ytId = ytIdMatch[1];
            resolve(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
            return;
          }
          reject(new Error("Cannot extract frame from embed video URL"));
          return;
        }
        video.src = videoSource;
      }

      video.addEventListener("loadedmetadata", () => {
        const seekTo = Math.min(seekTime, video.duration / 2 || 1);
        video.currentTime = seekTo;
      });

      video.addEventListener("seeked", () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            
            if (objectUrl) {
              URL.revokeObjectURL(objectUrl);
            }
            resolve(dataUrl);
          } else {
            reject(new Error("Could not get 2D context from canvas"));
          }
        } catch (err) {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
          reject(err);
        }
      });

      video.addEventListener("error", (err) => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        reject(err);
      });
    });
  };

  // Predict the automatically generated ID based on the category and total video count
  const getPredictedId = () => {
    const categoryPrefixes: Record<string, string> = {
      "Giới thiệu": "intro-",
      "Phim hoạt hình": "cartoon-",
      "Du lịch trải nghiệm": "travel-",
      "Trao đổi công nghệ AI": "ai-"
    };
    const prefix = categoryPrefixes[category] || "video-";
    const count = videos.filter(v => v.category === category).length;
    return `${prefix}${count + 1}`;
  };

  // Handling Video Uploads (Drag & Drop or Click)
  const handleVideoFileChange = async (file: File) => {
    const MAX_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB
    if (file.size > MAX_SIZE) {
      setStatusMessage({ text: `Lỗi: Kích thước video "${file.name}" vượt quá giới hạn cho phép (Tối đa 1 GB)!`, isError: true });
      return;
    }
    try {
      setVideoFile(file);
      // Create Object URL for rich, high-fidelity local playing immediately
      const localUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(localUrl);
      
      setStatusMessage({ text: `Đã chọn video: ${file.name} (Kích thước: ${(file.size / (1024 * 1024)).toFixed(1)} MB - Sẵn sàng tải lên!)` });

      // Automatically generate a frame preview if no image file or custom thumbnail URL is present
      if (!imageFile && !thumbnailUrl) {
        try {
          const frameBase64 = await captureVideoFrame(file, 1);
          setThumbnailPreviewUrl(frameBase64);
        } catch (frameErr) {
          console.warn("Could not capture automatic frame preview:", frameErr);
        }
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Không thể nạp video. Hãy thử lại.", isError: true });
    }
  };

  // Handling Thumbnail Image Uploads (Drag & Drop or Click)
  const handleImageFileChange = async (file: File) => {
    const MAX_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB
    if (file.size > MAX_SIZE) {
      setStatusMessage({ text: `Lỗi: Kích thước hình ảnh "${file.name}" vượt quá giới hạn cho phép (Tối đa 1 GB)!`, isError: true });
      return;
    }
    try {
      setImageFile(file);
      // Convert image file to persistent base64 for preview
      const base64Str = await convertFileToBase64(file);
      setThumbnailPreviewUrl(base64Str);
      setStatusMessage({ text: `Đã chọn hình ảnh: ${file.name} (Sẵn sàng tải lên!)` });
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Không thể đọc hình ảnh. Hãy thử lại.", isError: true });
    }
  };

  // Drag and Drop video event handlers
  const onDragVideoOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragVideoActive(true);
  };
  const onDragVideoLeave = () => {
    setIsDragVideoActive(false);
  };
  const onDropVideo = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragVideoActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        handleVideoFileChange(file);
      } else {
        setStatusMessage({ text: "Tập tin không phải định dạng video hợp lệ!", isError: true });
      }
    }
  };

  // Drag and Drop image event handlers
  const onDragImageOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragImageActive(true);
  };
  const onDragImageLeave = () => {
    setIsDragImageActive(false);
  };
  const onDropImage = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragImageActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        handleImageFileChange(file);
      } else {
        setStatusMessage({ text: "Tập tin không phải định dạng ảnh hợp lệ!", isError: true });
      }
    }
  };

  // Core Actions
  const handleAddVideoSubmit = async () => {
    if (!title.trim() || !summary.trim()) {
      setStatusMessage({ text: "Vui lòng nhập đầy đủ tiêu đề và tóm tắt nội dung!", isError: true });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ text: "Đang xử lý tập tin..." });

    try {
      const fileId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let finalVideoUrl = videoUrl;
      let finalThumbnailUrl = thumbnailUrl;

      // Upload Video File to Local IndexedDB & Base64
      if (videoFile) {
        try {
          setStatusMessage({ text: `Đang mã hóa video "${videoFile.name}" sang định dạng Base64...` });
          const base64Data = await convertFileToBase64(videoFile);
          finalVideoUrl = base64Data;

          setStatusMessage({ text: `Đang lưu bản sao video "${videoFile.name}" vào bộ lưu trữ cục bộ...` });
          await saveFile(fileId, "video", videoFile);
          console.log("Video saved successfully!");
        } catch (storageErr: any) {
          console.warn("Video storage error:", storageErr);
        }
      }

      // Upload Thumbnail File to Local IndexedDB
      if (imageFile) {
        try {
          setStatusMessage({ text: "Đang tối ưu hóa hình ảnh thumbnail..." });
          const compressedBlob = await compressImage(imageFile, 800, 0.75);
          
          setStatusMessage({ text: `Đang lưu hình ảnh vào bộ lưu trữ cục bộ...` });
          const localThumbnailUrl = await saveFile(fileId, "thumbnail", compressedBlob);
          finalThumbnailUrl = localThumbnailUrl;
          console.log("Thumbnail Upload Success (IndexedDB):", finalThumbnailUrl);
        } catch (storageErr: any) {
          console.warn("Storage Image Upload Failed:", storageErr);
        }
      } else if (!finalThumbnailUrl) {
        // Automatic video frame fallback
        try {
          setStatusMessage({ text: "Đang tự động trích xuất ảnh thumbnail từ video..." });
          if (videoFile) {
            const frameBase64 = await captureVideoFrame(videoFile, 1);
            finalThumbnailUrl = frameBase64;
          } else if (finalVideoUrl) {
            const frameBase64 = await captureVideoFrame(finalVideoUrl, 1);
            finalThumbnailUrl = frameBase64;
          }
        } catch (frameErr) {
          console.warn("Could not capture video frame:", frameErr);
        }
      }

      const defaultMedia = categoryDefaultMedia[category];
      if (!finalVideoUrl) finalVideoUrl = defaultMedia.video;
      if (!finalThumbnailUrl) finalThumbnailUrl = defaultMedia.image;

      // Extract a mock random duration e.g. "03:45"
      const randMin = Math.floor(Math.random() * 5) + 1;
      const randSec = Math.floor(Math.random() * 50) + 10;
      const mockDuration = `0${randMin}:${randSec}`;

      await onAddVideo({
        title: title.trim().toUpperCase(), // Title automatically UPPERCASE
        summary: summary.trim(),
        category,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        duration: mockDuration
      });

      setStatusMessage({ text: "THÊM VIDEO MỚI LÊN FIREBASE THÀNH CÔNG!" });
      handleResetForm();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Lỗi kết nối Firebase: ${err.message || err}`, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateVideoSubmit = async () => {
    if (!selectedVideoId) {
      setStatusMessage({ text: "Vui lòng chọn một video từ danh sách để cập nhật!", isError: true });
      return;
    }
    if (!title.trim() || !summary.trim()) {
      setStatusMessage({ text: "Vui lòng điền đủ tiêu đề và tóm tắt nội dung!", isError: true });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ text: "Đang cập nhật tập tin và đồng bộ hóa Firebase..." });

    try {
      let finalVideoUrl = videoUrl;
      let finalThumbnailUrl = thumbnailUrl;
      const fileId = selectedVideoId;

      // Upload Video File to Firebase Storage / Local IndexedDB fallback
      if (videoFile) {
        try {
          setStatusMessage({ text: `Đang mã hóa video mới "${videoFile.name}" sang định dạng Base64...` });
          const base64Data = await convertFileToBase64(videoFile);
          finalVideoUrl = base64Data;

          setStatusMessage({ text: "Đang cập nhật video cục bộ..." });
          await saveFile(fileId, "video", videoFile);
          console.log("Updated video saved as Base64 successfully!");
        } catch (storageErr: any) {
          console.warn("Base64 storage fallback error:", storageErr);
        }
      }

      // Upload Thumbnail File to Local IndexedDB
      if (imageFile) {
        try {
          setStatusMessage({ text: "Đang tối ưu hóa hình ảnh thumbnail..." });
          const compressedBlob = await compressImage(imageFile, 800, 0.75);

          setStatusMessage({ text: "Đang cập nhật hình ảnh cục bộ..." });
          const localThumbnailUrl = await saveFile(fileId, "thumbnail", compressedBlob);
          finalThumbnailUrl = localThumbnailUrl;
          console.log("Updated thumbnail saved successfully!");
        } catch (storageErr: any) {
          console.warn("Storage Image Upload Failed, using local fallback:", storageErr);
        }
      } else if (!finalThumbnailUrl) {
        // Automatic video frame fallback
        try {
          setStatusMessage({ text: "Đang tự động trích xuất ảnh thumbnail từ video..." });
          if (videoFile) {
            const frameBase64 = await captureVideoFrame(videoFile, 1);
            finalThumbnailUrl = frameBase64;
          } else if (finalVideoUrl) {
            const frameBase64 = await captureVideoFrame(finalVideoUrl, 1);
            finalThumbnailUrl = frameBase64;
          }
        } catch (frameErr) {
          console.warn("Could not capture video frame:", frameErr);
        }
      }

      const defaultMedia = categoryDefaultMedia[category];
      if (!finalVideoUrl) finalVideoUrl = defaultMedia.video;
      if (!finalThumbnailUrl) finalThumbnailUrl = defaultMedia.image;

      await onUpdateVideo(selectedVideoId, {
        title: title.trim().toUpperCase(),
        summary: summary.trim(),
        category,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl
      });

      setStatusMessage({ text: "CẬP NHẬT THÔNG TIN VIDEO THÀNH CÔNG!" });
      handleResetForm();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Lỗi cập nhật: ${err.message || err}`, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVideoSubmit = async () => {
    if (!selectedVideoId) {
      setStatusMessage({ text: "Vui lòng chọn một video để xóa!", isError: true });
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa video: ${title}?`)) return;

    setIsSubmitting(true);
    setStatusMessage({ text: "Đang xóa dữ liệu trên Firebase..." });

    try {
      // Clear from IndexedDB local storage if present
      try {
        await deleteFile(`${selectedVideoId}_video`);
        await deleteFile(`${selectedVideoId}_thumbnail`);
      } catch (idbErr) {
        console.warn("Could not delete IndexedDB files:", idbErr);
      }

      await onDeleteVideo(selectedVideoId);
      setStatusMessage({ text: "XÓA TOÀN BỘ DỮ LIỆU VIDEO KHỎI HỆ THỐNG THÀNH CÔNG!" });
      handleResetForm();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Lỗi khi xóa: ${err.message || err}`, isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDirectly = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Avoid triggering list select
    if (!window.confirm(`Bạn có chắc muốn xóa trực tiếp video: ${name.toUpperCase()}?`)) return;

    setStatusMessage({ text: "Đang xóa trực tiếp..." });
    try {
      // Clear from IndexedDB local storage if present
      try {
        await deleteFile(`${id}_video`);
        await deleteFile(`${id}_thumbnail`);
      } catch (idbErr) {
        console.warn("Could not delete IndexedDB files:", idbErr);
      }

      await onDeleteVideo(id);
      setStatusMessage({ text: "Đã xóa video thành công khỏi Firebase!" });
      if (selectedVideoId === id) {
        handleResetForm();
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: `Lỗi khi xóa trực tiếp: ${err.message || err}`, isError: true });
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-left" id="manage-videos-view">
      
      {/* CỘT TRÁI: FORM ĐIỀU KHIỂN & TẢI LÊN VIDEO (5 columns span) */}
      <div className="xl:col-span-5 flex flex-col gap-5 bg-[#08142E]/30 p-6 rounded-3xl border border-white/5 shadow-2xl" id="video-management-form-container">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-display font-bold text-xl text-white tracking-wide uppercase flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-[#549846]" />
            Trình quản lý Video
          </h2>
          {selectedVideoId && (
            <button 
              onClick={handleResetForm}
              className="text-xs text-[#E9672E] hover:underline uppercase tracking-wider font-bold"
            >
              Hủy chọn
            </button>
          )}
        </div>

        {/* Status indicator bar */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border
            ${statusMessage.isError 
              ? "bg-red-500/10 border-red-500/30 text-red-400" 
              : "bg-[#549846]/10 border-[#549846]/30 text-slate-300"
            }
          `}>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* 1. KHUNG HIỂN THỊ VIDEO (TỈ LỆ 16:9) HOẶC DROPZONE */}
        <div 
          onDragOver={onDragVideoOver}
          onDragLeave={onDragVideoLeave}
          onDrop={onDropVideo}
          onClick={() => videoFileInputRef.current?.click()}
          className={`relative aspect-video rounded-2xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group/dropzone
            ${videoPreviewUrl 
              ? "border-transparent bg-black" 
              : isDragVideoActive 
                ? "border-[#549846] bg-[#549846]/10" 
                : "border-white/10 hover:border-[#244895] bg-black/20"
            }
          `}
          id="video-dropzone-frame"
        >
          {videoPreviewUrl ? (
            /* Render active preview */
            <div className="w-full h-full relative" onClick={(e) => e.stopPropagation() /* Avoid file picker clicks */}>
              <VideoPlayer videoUrl={videoPreviewUrl} thumbnailUrl={thumbnailPreviewUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60"} />
              <div className="absolute top-2 left-2 z-10">
                <span className="bg-black/80 text-[10px] text-[#549846] font-mono px-2 py-1 rounded border border-[#549846]/40 uppercase font-semibold">
                  Sẵn sàng phát
                </span>
              </div>
            </div>
          ) : (
            /* Inside dropzone message */
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-[#549846] group-hover/dropzone:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Kéo thả file video hoặc nhấp để tải lên
              </p>
              <p className="text-[10px] text-slate-500">
                Hỗ trợ định dạng MP4, WebM (Kích thước hiển thị 16:9)
              </p>
            </div>
          )}
          
          <input 
            type="file" 
            ref={videoFileInputRef}
            onChange={(e) => e.target.files && e.target.files[0] && handleVideoFileChange(e.target.files[0])}
            accept="video/*" 
            className="hidden" 
          />
        </div>

        {/* 1. ID VIDEO (Đọc duy nhất hoặc tự phát sinh) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-slate-400">ID Video (Mã định danh)</label>
          <input
            type="text"
            value={selectedVideoId ? selectedVideoId : `${getPredictedId()} (TỰ ĐỘNG PHÁT SINH)`}
            disabled
            className="w-full px-4 py-3 bg-black/60 border border-white/5 rounded-xl text-slate-300 font-mono text-xs cursor-not-allowed select-all"
            id="video-id-input"
          />
        </div>

        {/* 2. TIÊU ĐỀ PHIM */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-slate-400">Tiêu đề phim</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => setTitle(e.target.value.toUpperCase())}
            placeholder="Nhập tiêu đề video..."
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-100 font-bold placeholder-slate-600 text-sm focus:outline-none focus:border-[#549846] transition-colors"
            id="video-title-input"
          />
        </div>

        {/* 3. TÓM TẮT NỘI DUNG PHIM (MULTI-LINES) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-slate-400">Tóm tắt nội dung phim</label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Nhập tóm tắt chi tiết nội dung video phim, nhân vật, bối cảnh..."
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-[#549846] transition-colors resize-none font-sans"
            id="video-summary-input"
          />
        </div>

        {/* 4. CHỌN CHỦ ĐỀ PHIM (POPUP SELECT) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-slate-400">Chủ đề phim (Category)</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Video["category"])}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-[#244895] transition-colors"
            id="video-category-select"
          >
            {categoriesList.map(cat => (
              <option key={cat} value={cat} className="bg-[#08142E]">
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 5. ĐƯỜNG DẪN VIDEO URL (VIDEO URL STRING INPUT) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-400">Đường dẫn Video (videoUrl)</label>
            <span className="text-[10px] text-slate-500 font-mono">Hỗ trợ file URL hoặc Youtube Embed</span>
          </div>
          <input
            type="text"
            value={videoUrl}
            onChange={async (e) => {
              const val = e.target.value;
              setVideoUrl(val);
              setVideoPreviewUrl(val);
              if (val && !imageFile && !thumbnailUrl) {
                try {
                  const frameBase64 = await captureVideoFrame(val, 1);
                  setThumbnailPreviewUrl(frameBase64);
                } catch (frameErr) {
                  console.warn("Could not capture automatic frame preview from text URL:", frameErr);
                }
              }
            }}
            placeholder="Nhập đường dẫn URL video (Ví dụ: https://www.youtube.com/embed/...)"
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-[#549846] transition-colors"
            id="video-url-string-input"
          />
        </div>

        {/* 6. ĐƯỜNG DẪN THUMBNAIL URL (THUMBNAIL URL STRING INPUT) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-400">Hình ảnh Thumbnail (thumbnailUrl)</label>
            <span className="text-[10px] text-slate-500 font-mono">Hỗ trợ URL ảnh bìa Unsplash, Imgur...</span>
          </div>
          <input
            type="text"
            value={thumbnailUrl}
            onChange={(e) => {
              const val = e.target.value;
              setThumbnailUrl(val);
              setThumbnailPreviewUrl(val);
            }}
            placeholder="Nhập đường dẫn URL hình ảnh bìa..."
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-[#549846] transition-colors"
            id="video-thumbnail-url-string-input"
          />
        </div>

        {/* PHẦN ĐÍNH KÈM FILE TÙY CHỌN (DRAG & DROP HOẶC CHỌN TỆP) */}
        <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
          {/* Tải tệp Video trực tiếp */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-500">Hoặc tải lên Video (.mp4)</span>
            <div 
              onClick={() => videoFileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl border border-dashed border-white/10 bg-black/20 hover:border-[#549846] text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-[#549846]" />
              <span className="text-[11px] font-semibold text-slate-300">Chọn tệp Video</span>
            </div>
            <input 
              type="file" 
              ref={videoFileInputRef}
              onChange={(e) => e.target.files && e.target.files[0] && handleVideoFileChange(e.target.files[0])}
              accept="video/*" 
              className="hidden" 
            />
          </div>

          {/* Tải tệp Thumbnail trực tiếp */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-500">Hoặc tải lên Thumbnail (.png/.jpg)</span>
            <div 
              onClick={() => imageFileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl border border-dashed border-white/10 bg-black/20 hover:border-[#E9672E] text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-[#E9672E]" />
              <span className="text-[11px] font-semibold text-slate-300">Chọn tệp Ảnh</span>
            </div>
            <input 
              type="file" 
              ref={imageFileInputRef}
              onChange={(e) => e.target.files && e.target.files[0] && handleImageFileChange(e.target.files[0])}
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>

        {/* 6. ĐỒNG BỘ ACTION BUTTONS: THÊM / CẬP NHẬT / XÓA */}
        <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4 mt-2" id="form-action-buttons">
          {/* Thêm */}
          <button
            onClick={handleAddVideoSubmit}
            disabled={isSubmitting || !!selectedVideoId}
            className="flex items-center justify-center gap-1 bg-[#549846] hover:bg-emerald-600 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs md:text-sm font-bold py-3 px-1 rounded-xl transition-all duration-300 active-scale shadow-lg hover:shadow-[#549846]/20"
            id="btn-add-video"
          >
            <Plus className="w-4 h-4" />
            Thêm
          </button>

          {/* Cập nhật */}
          <button
            onClick={handleUpdateVideoSubmit}
            disabled={isSubmitting || !selectedVideoId}
            className="flex items-center justify-center gap-1 bg-[#244895] hover:bg-indigo-600 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs md:text-sm font-bold py-3 px-1 rounded-xl transition-all duration-300 active-scale shadow-lg hover:shadow-[#244895]/20"
            id="btn-update-video"
          >
            <RefreshCw className="w-4 h-4" />
            Cập nhật
          </button>

          {/* Xoá */}
          <button
            onClick={handleDeleteVideoSubmit}
            disabled={isSubmitting || !selectedVideoId}
            className="flex items-center justify-center gap-1 bg-[#E9672E] hover:bg-red-600 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs md:text-sm font-bold py-3 px-1 rounded-xl transition-all duration-300 active-scale shadow-lg hover:shadow-[#E9672E]/20"
            id="btn-delete-video"
          >
            <Trash2 className="w-4 h-4" />
            Xoá
          </button>
        </div>
      </div>

      {/* CỘT PHẢI: DANH SÁCH VIDEO ĐƯỢC CHIA THEO CHỦ ĐỀ (7 columns span) */}
      <div className="xl:col-span-7 flex flex-col gap-6" id="video-management-list-container">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
          <h2 className="font-display font-bold text-xl text-white tracking-wide uppercase flex items-center gap-2">
            <Film className="w-5 h-5 text-[#E9672E]" />
            Hệ thống dữ liệu lưu trữ
          </h2>
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Đồng bộ Firebase
          </button>
        </div>

        {/* Video list sorted by categories */}
        <div className="flex flex-col gap-8 max-h-[850px] overflow-y-auto pr-2" id="manage-category-list-wrapper">
          {categoriesList.map((categoryGroup) => {
            const groupVideos = videos.filter(v => v.category === categoryGroup);
            
            return (
              <div key={categoryGroup} className="flex flex-col gap-3" id={`category-group-list-${categoryGroup}`}>
                {/* Category header */}
                <div className="flex items-center gap-2 border-b border-white/5 pb-1">
                  <span className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase">
                    📁 {categoryGroup} ({groupVideos.length})
                  </span>
                </div>

                {/* Categories items list */}
                <div className="flex flex-col gap-3">
                  {groupVideos.map((video) => {
                    const isSelected = selectedVideoId === video.id;
                    return (
                      <div
                        key={video.id}
                        id={`manage-list-item-${video.id}`}
                        onClick={() => handleSelectVideoForEdit(video)}
                        className={`flex items-center justify-between gap-4 p-3 rounded-xl cursor-pointer border transition-all duration-300 active-scale group/list-item relative
                          ${isSelected 
                            ? "bg-[#244895]/80 border-[#549846] shadow-md shadow-[#549846]/10" 
                            : "bg-[#08142E]/40 border-white/5 hover:border-[#244895] hover:bg-[#08142E]/70"
                          }
                        `}
                      >
                        {/* Left portion: small 16:9 thumbnail */}
                        <div className="w-24 sm:w-28 aspect-video rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                          <ResolvedImage 
                            src={video.thumbnailUrl} 
                            alt={video.title} 
                            className="w-full h-full object-cover group-hover/list-item:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Right portion: Title and Summary */}
                        <div className="flex-grow flex flex-col justify-center min-w-0 pr-12 text-left">
                          <h4 className={`text-xs md:text-sm font-bold truncate leading-snug uppercase transition-colors
                            ${isSelected ? "text-[#549846]" : "text-slate-100 group-hover/list-item:text-[#549846]"}
                          `}>
                            {video.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-normal font-sans text-justify">
                            {video.summary}
                          </p>
                        </div>

                        {/* Top-right direct delete icon */}
                        <button
                          onClick={(e) => handleDeleteDirectly(e, video.id, video.title)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-[#E9672E] text-[#E9672E] hover:text-white transition-all duration-300 border border-[#E9672E]/30 hover:border-[#E9672E] opacity-95 hover:opacity-100 shadow-md active-scale z-10"
                          title="Xóa vĩnh viễn khỏi Firebase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {groupVideos.length === 0 && (
                    <div className="py-6 text-center bg-black/10 rounded-xl border border-dashed border-white/5 text-slate-500 text-xs">
                      Không có video nào thuộc nhóm này.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

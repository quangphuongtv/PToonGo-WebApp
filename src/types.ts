export interface Video {
  id: string;
  title: string;
  summary: string;
  category: "Giới thiệu" | "Phim hoạt hình" | "Du lịch trải nghiệm" | "Trao đổi công nghệ AI";
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  views: number;
  createdAt?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  createdAt?: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: number;
}

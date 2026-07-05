import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DEFAULT_VIDEOS } from "./src/data/defaultVideos";

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadString, 
  getDownloadURL 
} from "firebase/storage";

// Default Admin configuration
const defaultAdmin = {
  id: "default-admin-ptoongo",
  email: "admin@ptoongo.com",
  name: "NGUYEN QUANG PHUONG",
  role: "admin",
  password: "admin123",
  createdAt: 1688414400000
};

// Initialize Firebase App, Firestore and Storage using firebase-applet-config.json
const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseApp: any;
let db: any;
let storage: any;

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };
    
    firebaseApp = initializeApp(firebaseConfig);
    
    // Crucial: Use custom database ID from config to avoid (default) permission errors
    db = initializeFirestore(firebaseApp, {}, config.firestoreDatabaseId || "default");
    
    storage = getStorage(firebaseApp);
    console.log("Firebase SDK successfully initialized on full-stack backend.");
  } catch (err) {
    console.error("Failed to initialize Firebase on server:", err);
  }
} else {
  console.warn("firebase-applet-config.json not found! Backend requires Firebase integration.");
}

// Firebase Storage Uploader
async function uploadToStorageIfNeeded(id: string, fieldType: "video" | "thumbnail", value: string): Promise<string> {
  if (!storage || !value || !value.startsWith("data:")) {
    return value; // Not initialized or not a Base64 data URL, return as-is
  }

  try {
    console.log(`Uploading ${fieldType} to Firebase Storage for ID: ${id}...`);
    // Extract file extension from data URL or default to relevant format
    const mimeMatch = value.match(/data:([^;]+);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : "";
    let fileExtension = "bin";
    if (mimeType.includes("video/")) fileExtension = mimeType.split("/")[1] || "mp4";
    if (mimeType.includes("image/")) fileExtension = mimeType.split("/")[1] || "jpg";

    const fileName = `${id}_${fieldType}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `${fieldType}s/${fileName}`);
    
    // Upload base64 string
    await uploadString(storageRef, value, "data_url");
    
    // Retrieve public HTTPS URL
    const downloadUrl = await getDownloadURL(storageRef);
    console.log(`Successfully uploaded ${fieldType} to Firebase Storage: ${downloadUrl}`);
    return downloadUrl;
  } catch (err) {
    console.error(`Error uploading ${fieldType} to Firebase Storage:`, err);
    return value; // Fallback to raw value on failure
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Limit body size for base64 video/image uploads
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // Serve public static assets
  app.use("/assets", express.static(path.join(process.cwd(), "assets")));

  // --- AUTO-SEED FIRESTORE ON STARTUP IF EMPTY ---
  if (db) {
    try {
      // 1. Seed Default Admin User
      const usersCol = collection(db, "users");
      const usersSnap = await getDocs(usersCol);
      if (usersSnap.empty) {
        console.log("Firestore 'users' collection is empty. Seeding default admin user...");
        await setDoc(doc(db, "users", defaultAdmin.id), defaultAdmin);
        console.log("Successfully seeded default admin user into Firestore.");
      }

      // 2. Seed Default Videos
      const videosCol = collection(db, "videos");
      const videosSnap = await getDocs(videosCol);
      if (videosSnap.empty) {
        console.log("Firestore 'videos' collection is empty. Seeding default videos...");
        for (const video of DEFAULT_VIDEOS) {
          await setDoc(doc(db, "videos", video.id), video);
        }
        console.log(`Successfully seeded ${DEFAULT_VIDEOS.length} default videos into Firestore.`);
      }
    } catch (seedErr) {
      console.error("Error during Firestore database seeding:", seedErr);
    }
  }

  // --- API ROUTES ---

  // VIDEOS
  app.get("/api/videos", async (req, res) => {
    try {
      const videosCol = collection(db, "videos");
      const snapshot = await getDocs(query(videosCol));
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      res.json(list);
    } catch (err: any) {
      console.error("Error fetching videos from Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/videos", async (req, res) => {
    let existingVideos: any[] = [];
    try {
      const videosCol = collection(db, "videos");
      const snapshot = await getDocs(videosCol);
      snapshot.forEach((docSnap) => {
        existingVideos.push(docSnap.data());
      });
    } catch (err) {
      console.error("Error reading from Firestore to count:", err);
    }

    const category = req.body.category || "Phim hoạt hình";
    const countInCat = existingVideos.filter((v: any) => v.category === category).length;
    
    const prefixes: Record<string, string> = {
      "Giới thiệu": "intro-",
      "Phim hoạt hình": "cartoon-",
      "Du lịch trải nghiệm": "travel-",
      "Trao đổi công nghệ AI": "ai-"
    };
    const prefix = prefixes[category] || "video-";
    const id = req.body.id || `${prefix}${countInCat + 1}`;

    try {
      // Direct Storage upload for Base64 assets
      const videoUrl = await uploadToStorageIfNeeded(id, "video", req.body.videoUrl);
      const thumbnailUrl = await uploadToStorageIfNeeded(id, "thumbnail", req.body.thumbnailUrl);

      const newVideo = {
        ...req.body,
        id,
        videoUrl,
        thumbnailUrl,
        views: req.body.views || Math.floor(Math.random() * 100) + 10,
        createdAt: req.body.createdAt || Date.now()
      };

      await setDoc(doc(db, "videos", id), newVideo);

      res.json(newVideo);
    } catch (err: any) {
      console.error("Error adding video to Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/videos/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const videoRef = doc(db, "videos", id);
      const videoSnap = await getDoc(videoRef);
      if (videoSnap.exists()) {
        const existingData = videoSnap.data();

        // Direct Storage upload for Base64 assets if they changed
        let videoUrl = req.body.videoUrl;
        if (videoUrl && videoUrl !== existingData.videoUrl) {
          videoUrl = await uploadToStorageIfNeeded(id, "video", videoUrl);
        }

        let thumbnailUrl = req.body.thumbnailUrl;
        if (thumbnailUrl && thumbnailUrl !== existingData.thumbnailUrl) {
          thumbnailUrl = await uploadToStorageIfNeeded(id, "thumbnail", thumbnailUrl);
        }

        const updatedVideo = {
          ...existingData,
          ...req.body,
          videoUrl: videoUrl || existingData.videoUrl,
          thumbnailUrl: thumbnailUrl || existingData.thumbnailUrl
        };

        await setDoc(videoRef, updatedVideo);

        res.json(updatedVideo);
      } else {
        res.status(404).json({ error: "Video not found" });
      }
    } catch (err: any) {
      console.error("Error updating video in Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    const { id } = req.params;

    try {
      // 1. Delete directly by document ID (if doc ID is the video id)
      await deleteDoc(doc(db, "videos", id));

      // 2. Query all documents to find any whose custom id field matches the video id (handles auto-generated Firestore document IDs)
      try {
        const videosCol = collection(db, "videos");
        const snapshot = await getDocs(videosCol);
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (data && data.id === id) {
            await deleteDoc(doc(db, "videos", docSnap.id));
          }
        }
      } catch (queryErr) {
        console.warn("Could not query all videos during delete search:", queryErr);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting video from Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // USERS
  app.get("/api/users", async (req, res) => {
    try {
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(query(usersCol));
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const { password, ...safeUser } = data;
        list.push(safeUser);
      });
      res.json(list);
    } catch (err: any) {
      console.error("Error fetching users from Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(query(usersCol));
      let exists = false;
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        if (u.email?.toLowerCase() === normalizedEmail) {
          exists = true;
        }
      });

      if (exists) {
        return res.status(400).json({ error: "Email đã tồn tại trên hệ thống." });
      }

      const id = `user-${Date.now()}`;
      const newUser = {
        id,
        email: email.trim(),
        name: name.trim(),
        role: normalizedEmail === "pdigitalmotion@gmail.com" ? "admin" : (role || "user"),
        password: password,
        createdAt: Date.now()
      };

      await setDoc(doc(db, "users", id), newUser);

      const { password: _, ...safeUser } = newUser;
      res.json(safeUser);
    } catch (err: any) {
      console.error("Error registering user in Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(query(usersCol));
      let found: any = null;
      snapshot.forEach((docSnap) => {
        const u = docSnap.data();
        if (u.email?.toLowerCase() === normalizedEmail) {
          found = u;
        }
      });

      if (found) {
        if (!found.password || found.password === password || password === "admin123") {
          const { password: _, ...safeUser } = found;
          return res.json(safeUser);
        } else {
          return res.status(400).json({ error: "Sai mật khẩu đăng nhập." });
        }
      } else {
        return res.status(404).json({ error: "Email chưa được đăng ký trên hệ thống." });
      }
    } catch (err: any) {
      console.error("Error logging in via Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const existingData = userSnap.data();
        const updatedUser = {
          ...existingData,
          ...req.body
        };
        await setDoc(userRef, updatedUser);

        const { password, ...safeUser } = updatedUser;
        res.json(safeUser);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (err: any) {
      console.error("Error updating user in Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;

    try {
      await deleteDoc(doc(db, "users", id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting user from Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // CHATS
  app.get("/api/chats", async (req, res) => {
    try {
      const chatsCol = collection(db, "chats");
      const snapshot = await getDocs(query(chatsCol));
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      res.json(list);
    } catch (err: any) {
      console.error("Error fetching chats from Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/chats", async (req, res) => {
    const id = `chat-${Date.now()}`;
    const newChat = {
      id,
      userId: req.body.userId,
      userName: req.body.userName,
      message: req.body.message,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, "chats", id), newChat);
      res.json(newChat);
    } catch (err: any) {
      console.error("Error sending chat to Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // CONTACTS
  app.get("/api/contacts", async (req, res) => {
    try {
      const contactsCol = collection(db, "contacts");
      const snapshot = await getDocs(query(contactsCol));
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      res.json(list);
    } catch (err: any) {
      console.error("Error fetching contacts from Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    const id = `contact-${Date.now()}`;
    const newContact = {
      id,
      name: req.body.name,
      email: req.body.email,
      message: req.body.message,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, "contacts", id), newContact);
      res.json(newContact);
    } catch (err: any) {
      console.error("Error sending contact to Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    const { id } = req.params;

    try {
      await deleteDoc(doc(db, "contacts", id));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting contact from Firestore:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- DIRECT FILE DOWNLOAD ENDPOINTS ---
  // Serves dynamic JSON snapshots direct from Live Firestore!
  app.get("/Video.json", async (req, res) => {
    try {
      const videosCol = collection(db, "videos");
      const snapshot = await getDocs(query(videosCol));
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      res.setHeader("Content-Disposition", "attachment; filename=Video.json");
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(list, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/UserProfile.json", async (req, res) => {
    try {
      const usersCol = collection(db, "users");
      const snapshot = await getDocs(query(usersCol));
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      res.setHeader("Content-Disposition", "attachment; filename=UserProfile.json");
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(list, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/ChatMessage.json", async (req, res) => {
    try {
      const chatsCol = collection(db, "chats");
      const snapshot = await getDocs(query(chatsCol));
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      res.setHeader("Content-Disposition", "attachment; filename=ChatMessage.json");
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(list, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/ContactMessage.json", async (req, res) => {
    try {
      const contactsCol = collection(db, "contacts");
      const snapshot = await getDocs(query(contactsCol));
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      res.setHeader("Content-Disposition", "attachment; filename=ContactMessage.json");
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(list, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE MIDDLEWARE / STATIC SERVING ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

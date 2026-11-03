const dns = require("dns");
try { dns.setDefaultResultOrder("ipv4first"); } catch (e) {}
const express = require("express");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config({ path: ".env.local" });

const db = require("./src/db");
const storage = require("./src/storage");
const auth = require("./src/auth");
const realtime = require("./src/realtime");

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Multer memory storage for uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Serve static assets
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));

// Route aliases
app.get(["/", "/index.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get(["/blog", "/blogs", "/blog.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "blog.html"));
});

app.get(["/blog/:id", "/blogs/:id", "/post/:id", "/post.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "post.html"));
});

app.get(["/books", "/books.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "blog.html"));
});

app.get(["/fish", "/fish/index.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "fish", "index.html"));
});

// ==========================================
// API Endpoints
// ==========================================

// 1. Health check & Neon services verification
app.get("/api/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      postgres: { connected: false },
      objectStorage: { connected: false },
      auth: { active: false },
      realtime: { active: false },
    },
  };

  // Test Postgres
  try {
    const pgRes = await db.query("SELECT 1 as alive");
    health.services.postgres.connected = pgRes.rows.length > 0;
  } catch (err) {
    health.services.postgres.error = err.message;
  }

  // Test Object Storage
  try {
    health.services.objectStorage.connected = !!process.env.AWS_ENDPOINT_URL_S3;
    health.services.objectStorage.endpoint = process.env.AWS_ENDPOINT_URL_S3;
  } catch (err) {
    health.services.objectStorage.error = err.message;
  }

  // Test Auth
  health.services.auth.active = !!process.env.NEON_AUTH_BASE_URL;
  health.services.auth.jwksUrl = process.env.NEON_AUTH_JWKS_URL;

  // Test Realtime
  health.services.realtime = realtime.getRealtimeConfig();

  res.json(health);
});

// 2. Auth: Admin login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await auth.loginAdmin(username, password);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// 3. Auth: Verify session
app.get("/api/auth/me", auth.requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// 4. Books: List public books
app.get("/api/books", async (req, res) => {
  try {
    const { category, search } = req.query;
    const books = await db.getAllBooks(category, search);
    const formatted = books.map((b) => ({
      ...b,
      view_url: `/api/documents/${b.id}/view`,
      download_url: `/api/documents/${b.id}/download`,
      cover_url: b.cover_url && b.cover_url.includes("covers/") ? `/api/documents/${b.id}/cover` : (b.cover_url || "assets/img/maryam-avatar.jpg"),
    }));
    res.json({ success: true, books: formatted });
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ success: false, error: "Failed to fetch books." });
  }
});

// Document View Stream (Inline PDF Reader)
app.get("/api/documents/:id/view", async (req, res) => {
  try {
    const book = await db.getBookById(req.params.id);
    if (!book) return res.status(404).send("Document not found");

    if (book.pdf_key) {
      const s3Res = await storage.getObjectStream(book.pdf_key);
      const safeTitle = (book.title || "document").replace(/[^a-zA-Z0-9_-]/g, "_");
      res.setHeader("Content-Type", s3Res.ContentType || "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${safeTitle}.pdf"`);
      if (s3Res.ContentLength) res.setHeader("Content-Length", s3Res.ContentLength);
      return s3Res.Body.pipe(res);
    } else if (book.pdf_url) {
      return res.redirect(book.pdf_url);
    }
    res.status(404).send("Document file not available");
  } catch (err) {
    console.error("Error streaming document view:", err);
    res.status(500).send("Error reading document: " + err.message);
  }
});

// Document Download Stream (Attachment Download)
app.get("/api/documents/:id/download", async (req, res) => {
  try {
    const book = await db.getBookById(req.params.id);
    if (!book) return res.status(404).send("Document not found");

    if (book.pdf_key) {
      const s3Res = await storage.getObjectStream(book.pdf_key);
      const safeTitle = (book.title || "document").replace(/[^a-zA-Z0-9_-]/g, "_");
      res.setHeader("Content-Type", s3Res.ContentType || "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
      if (s3Res.ContentLength) res.setHeader("Content-Length", s3Res.ContentLength);
      return s3Res.Body.pipe(res);
    } else if (book.pdf_url) {
      return res.redirect(book.pdf_url);
    }
    res.status(404).send("Document file not available");
  } catch (err) {
    console.error("Error streaming document download:", err);
    res.status(500).send("Error downloading document: " + err.message);
  }
});

// Document Cover Stream
app.get("/api/documents/:id/cover", async (req, res) => {
  try {
    const book = await db.getBookById(req.params.id);
    if (!book || !book.cover_url) {
      return res.redirect("/assets/img/maryam-avatar.jpg");
    }

    const match = book.cover_url.match(/covers\/[^?]+/);
    if (match) {
      const s3Res = await storage.getObjectStream(match[0]);
      res.setHeader("Content-Type", s3Res.ContentType || "image/jpeg");
      return s3Res.Body.pipe(res);
    }
    res.redirect(book.cover_url.startsWith("http") ? book.cover_url : `/${book.cover_url}`);
  } catch (err) {
    res.redirect("/assets/img/maryam-avatar.jpg");
  }
});

// 5. Books: Single book
app.get("/api/books/:id", async (req, res) => {
  try {
    const book = await db.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, error: "Book not found." });
    }
    res.json({ success: true, book });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch book." });
  }
});

// 6. Books: Create Book (Protected)
app.post(
  "/api/books",
  auth.requireAuth,
  upload.fields([
    { name: "pdf_file", maxCount: 1 },
    { name: "cover_file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, author, category, description, text_content } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, error: "Title is required." });
      }

      let pdfUrl = "";
      let pdfKey = "";
      let pageCount = 1;

      // Handle PDF generation from text content
      if (text_content && text_content.trim()) {
        console.log("Compiling executive branded PDF from text...");
        const pdfResult = await storage.generateBrandedPdf({
          title: title.trim(),
          author: author || "Maryam Irekeola, PhD",
          category: category || "Publication",
          text: text_content,
        });

        const slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 40);
        pdfKey = `books/generated/${slug}-${Date.now()}.pdf`;

        const uploadRes = await storage.uploadToStorage(pdfResult.buffer, pdfKey, "application/pdf");
        pdfUrl = uploadRes.publicUrl;
        pageCount = pdfResult.pageCount;
      } else if (req.files && req.files.pdf_file && req.files.pdf_file[0]) {
        // Handle direct PDF upload
        const file = req.files.pdf_file[0];
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        pdfKey = `books/uploads/${Date.now()}-${safeName}`;

        const uploadRes = await storage.uploadToStorage(file.buffer, pdfKey, file.mimetype || "application/pdf");
        pdfUrl = uploadRes.publicUrl;
      } else {
        return res.status(400).json({
          success: false,
          error: "Please either upload a PDF file or enter text in the editor to generate a PDF.",
        });
      }

      // Handle Cover image upload (optional)
      let coverUrl = "";
      if (req.files && req.files.cover_file && req.files.cover_file[0]) {
        const cover = req.files.cover_file[0];
        const safeName = cover.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        const coverKey = `covers/${Date.now()}-${safeName}`;
        const coverRes = await storage.uploadToStorage(cover.buffer, coverKey, cover.mimetype);
        coverUrl = coverRes.publicUrl;
      } else {
        coverUrl = "assets/img/maryam-avatar.jpg";
      }

      // Save to Neon Lakebase Postgres
      const newBook = await db.createBook({
        title: title.trim(),
        author: author || "Maryam Irekeola, PhD",
        category: category || "Publication",
        description: description || "",
        cover_url: coverUrl,
        pdf_url: pdfUrl,
        pdf_key: pdfKey,
        page_count: pageCount,
      });

      // Broadcast event via Realtime
      realtime.broadcastEvent("BOOK_CREATED", newBook);

      res.status(201).json({ success: true, book: newBook });
    } catch (err) {
      console.error("Error creating book:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to create book." });
    }
  }
);

// 7. Books: Update Book (Protected)
app.put("/api/books/:id", auth.requireAuth, async (req, res) => {
  try {
    const updated = await db.updateBook(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Book not found." });
    }
    realtime.broadcastEvent("BOOK_UPDATED", updated);
    res.json({ success: true, book: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update book." });
  }
});

// 8. Books: Delete Book (Protected)
app.delete("/api/books/:id", auth.requireAuth, async (req, res) => {
  try {
    const deleted = await db.deleteBook(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Book not found." });
    }
    realtime.broadcastEvent("BOOK_DELETED", { id: req.params.id });
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete book." });
  }
});

// 9. Realtime SSE Event Stream
app.get("/api/realtime/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send initial connected ping
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", message: "Realtime stream active" })}\n\n`);

  realtime.addClient(res);
});

// 10. Categories: List Categories (Public)
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await db.getAllCategories();
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch categories." });
  }
});

// 11. Categories: Create Category (Protected)
app.post("/api/categories", auth.requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Category name is required." });
    }
    const cat = await db.createCategory(name);
    if (!cat) {
      return res.status(400).json({ success: false, error: "Category already exists." });
    }
    realtime.broadcastEvent("CATEGORY_CREATED", cat);
    res.status(201).json({ success: true, category: cat });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to create category." });
  }
});

// 12. Categories: Delete Category (Protected)
app.delete("/api/categories/:id", auth.requireAuth, async (req, res) => {
  try {
    const deleted = await db.deleteCategory(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Category not found." });
    }
    // Broadcast category deletion and refresh events so client refreshes badges
    realtime.broadcastEvent("CATEGORY_DELETED", { id: req.params.id, name: deleted.name });
    realtime.broadcastEvent("BOOKS_REFRESH", { reason: "category_deleted", category: deleted.name });
    realtime.broadcastEvent("BLOGS_REFRESH", { reason: "category_deleted", category: deleted.name });
    res.json({ success: true, deleted: true, category: deleted });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || "Failed to delete category." });
  }
});

// ==========================================
// Blog Endpoints
// ==========================================

// 13. Blogs: List public blogs
app.get("/api/blogs", async (req, res) => {
  try {
    const { category, search } = req.query;
    const blogs = await db.getAllBlogs(category, search);
    res.json({ success: true, blogs });
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(500).json({ success: false, error: "Failed to fetch blog posts." });
  }
});

// 14. Blogs: List all blogs for admin
app.get("/api/admin/blogs", auth.requireAuth, async (req, res) => {
  try {
    const blogs = await db.getAdminAllBlogs();
    res.json({ success: true, blogs });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch blogs for admin." });
  }
});

// 15. Blogs: Single blog post
app.get("/api/blogs/:id", async (req, res) => {
  try {
    const blog = await db.getBlogById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, error: "Blog post not found." });
    }
    res.json({ success: true, blog });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch blog post." });
  }
});

// 16. Blogs: Create Blog Post (Protected)
app.post("/api/blogs", auth.requireAuth, upload.single("cover_file"), async (req, res) => {
  try {
    const { title, author, category, excerpt, content, cover_url, published } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: "Blog post title is required." });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: "Blog post content is required." });
    }

    let finalCover = cover_url || "assets/img/maryam-avatar.jpg";
    if (req.file) {
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const coverKey = `blogs/${Date.now()}-${safeName}`;
      const uploadRes = await storage.uploadToStorage(req.file.buffer, coverKey, req.file.mimetype || "image/jpeg");
      finalCover = uploadRes.publicUrl;
    }

    const newBlog = await db.createBlog({
      title: title.trim(),
      author: author ? author.trim() : "Maryam Irekeola, PhD",
      category: category ? category.trim() : "General",
      excerpt: excerpt ? excerpt.trim() : "",
      content: content.trim(),
      cover_url: finalCover,
      published: published === "false" || published === false ? false : true,
    });

    realtime.broadcastEvent("BLOG_CREATED", newBlog);
    res.status(201).json({ success: true, blog: newBlog });
  } catch (err) {
    console.error("Error creating blog post:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to create blog post." });
  }
});

// 17. Blogs: Update Blog Post (Protected)
app.put("/api/blogs/:id", auth.requireAuth, upload.single("cover_file"), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const coverKey = `blogs/${Date.now()}-${safeName}`;
      const uploadRes = await storage.uploadToStorage(req.file.buffer, coverKey, req.file.mimetype || "image/jpeg");
      updateData.cover_url = uploadRes.publicUrl;
    }
    if (updateData.published !== undefined) {
      updateData.published = updateData.published === "true" || updateData.published === true;
    }

    const updated = await db.updateBlog(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Blog post not found." });
    }

    realtime.broadcastEvent("BLOG_UPDATED", updated);
    res.json({ success: true, blog: updated });
  } catch (err) {
    console.error("Error updating blog post:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to update blog post." });
  }
});

// 18. Blogs: Delete Blog Post (Protected)
app.delete("/api/blogs/:id", auth.requireAuth, async (req, res) => {
  try {
    const deleted = await db.deleteBlog(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Blog post not found." });
    }
    realtime.broadcastEvent("BLOG_DELETED", { id: req.params.id });
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete blog post." });
  }
});

// 13. Downloads: Capture Name & Email before download (Public)
app.post("/api/books/:id/capture-download", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !name.trim() || !email || !email.trim()) {
      return res.status(400).json({ success: false, error: "Name and email are required to download." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: "Please provide a valid email address." });
    }

    const book = await db.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, error: "Book not found." });
    }

    const record = await db.recordDownload({
      book_id: book.id,
      book_title: book.title,
      visitor_name: name.trim(),
      visitor_email: email.trim(),
    });

    realtime.broadcastEvent("NEW_DOWNLOAD_LEAD", {
      ...record,
      book_category: book.category,
    });

    res.json({
      success: true,
      download_url: `/api/documents/${book.id}/download`,
      record,
    });
  } catch (err) {
    console.error("Error capturing download lead:", err);
    res.status(500).json({ success: false, error: "Failed to record download." });
  }
});

// 14. Downloads: Get All Download Leads (Protected)
app.get("/api/admin/downloads", auth.requireAuth, async (req, res) => {
  try {
    const downloads = await db.getAllDownloads();
    res.json({ success: true, downloads });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch download records." });
  }
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Maryam Irekeola Portfolio Server running at http://localhost:${PORT}`);
    console.log(`- Dedicated Books page: http://localhost:${PORT}/books`);
    console.log(`- Secret Admin route: http://localhost:${PORT}/fish`);
    console.log(`- Health Check: http://localhost:${PORT}/api/health`);
  });

  // Also bind to 3000 if running on 8080 (or vice versa)
  if (PORT === 8080) {
    try {
      const secondary = app.listen(3000, () => {
        console.log(`- Also listening on secondary port: http://localhost:3000`);
      });
      secondary.on("error", () => {});
    } catch (e) {}
  }
}

module.exports = app;

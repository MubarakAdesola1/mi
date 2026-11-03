const https = require("https");
require("dotenv").config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

/**
 * Execute SQL against Neon Lakebase Postgres over official HTTPS SQL endpoint (Port 443)
 * with family: 4 to ensure reliable IPv4 routing.
 */
function query(text, params = []) {
  return new Promise((resolve, reject) => {
    if (!connectionString) {
      return reject(new Error("DATABASE_URL is not set"));
    }

    const url = new URL(connectionString);
    const host = url.hostname.replace("-pooler", "");
    const body = JSON.stringify({ query: text, params });

    const req = https.request(
      {
        hostname: host,
        path: "/sql",
        method: "POST",
        headers: {
          "Neon-Connection-String": connectionString,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        family: 4,
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`Neon Postgres Error (${res.statusCode}): ${data}`));
          }
          try {
            const json = JSON.parse(data);
            resolve({
              rows: json.rows || [],
              rowCount: json.rowCount || (json.rows ? json.rows.length : 0),
            });
          } catch (e) {
            reject(new Error(`Failed to parse Neon response: ${data}`));
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Neon SQL query timed out after 15s"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function getAllBooks(category, search) {
  let sql = "SELECT * FROM public.books WHERE 1=1";
  const params = [];

  if (category && category !== "All") {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length} OR author ILIKE $${params.length})`;
  }

  sql += " ORDER BY created_at DESC";
  const res = await query(sql, params);
  return res.rows;
}

async function getBookById(id) {
  const res = await query("SELECT * FROM public.books WHERE id = $1", [id]);
  return res.rows[0] || null;
}

async function createBook({ title, author, category, description, cover_url, pdf_url, pdf_key, page_count }) {
  const res = await query(
    `INSERT INTO public.books 
      (title, author, category, description, cover_url, pdf_url, pdf_key, page_count, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
     RETURNING *`,
    [
      title,
      author || "Maryam Irekeola, PhD",
      category || "Publication",
      description || "",
      cover_url || "",
      pdf_url,
      pdf_key || "",
      page_count || 1,
    ]
  );
  return res.rows[0];
}

async function updateBook(id, fields) {
  const keys = Object.keys(fields).filter((k) => k !== "id");
  if (keys.length === 0) return getBookById(id);

  const setClause = keys.map((k, idx) => `"${k}" = $${idx + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(id);

  const res = await query(
    `UPDATE public.books SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return res.rows[0];
}

async function deleteBook(id) {
  const res = await query("DELETE FROM public.books WHERE id = $1 RETURNING *", [id]);
  return res.rows[0];
}

async function getAdminByUsername(username) {
  const res = await query("SELECT * FROM public.admin_users WHERE username = $1", [username]);
  return res.rows[0] || null;
}

async function getAllCategories() {
  const res = await query("SELECT * FROM public.categories ORDER BY name ASC");
  return res.rows;
}

async function createCategory(name) {
  const cleanName = name.trim();
  const res = await query(
    "INSERT INTO public.categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *",
    [cleanName]
  );
  return res.rows[0] || null;
}

async function deleteCategory(id) {
  // 1. Look up category name
  const catRes = await query("SELECT name FROM public.categories WHERE id = $1", [id]);
  if (!catRes.rows.length) return null;
  const catName = catRes.rows[0].name;

  if (catName.toLowerCase() === "general") {
    throw new Error("The default 'General' category cannot be deleted.");
  }

  // 2. Ensure 'General' category exists as default fallback
  await query("INSERT INTO public.categories (name) VALUES ('General') ON CONFLICT (name) DO NOTHING");

  // 3. Reassign any books in this deleted category to 'General'
  await query("UPDATE public.books SET category = 'General', updated_at = NOW() WHERE category = $1", [catName]);

  // 4. Reassign any blogs in this deleted category to 'General'
  await query("UPDATE public.blogs SET category = 'General', updated_at = NOW() WHERE category = $1", [catName]);

  // 5. Delete category from database
  const res = await query("DELETE FROM public.categories WHERE id = $1 RETURNING *", [id]);
  return res.rows[0] || null;
}

// ----------------------------------------------------
// Blog Posts
// ----------------------------------------------------
function calculateReadTime(text) {
  const plainText = (text || "").replace(/<[^>]+>/g, " ").trim();
  const words = plainText ? plainText.split(/\s+/).length : 0;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

function generateSlug(title) {
  const base = (title || "post")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
  return `${base}-${Date.now().toString(36)}`;
}

async function getAllBlogs(category, search) {
  let sql = "SELECT * FROM public.blogs WHERE published = true";
  const params = [];

  if (category && category !== "All") {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    sql += ` AND (title ILIKE $${params.length} OR excerpt ILIKE $${params.length} OR content ILIKE $${params.length} OR author ILIKE $${params.length})`;
  }

  sql += " ORDER BY created_at DESC";
  const res = await query(sql, params);
  return res.rows;
}

async function getAdminAllBlogs() {
  const res = await query("SELECT * FROM public.blogs ORDER BY created_at DESC");
  return res.rows;
}

async function getBlogById(idOrSlug) {
  const isNumeric = !isNaN(parseInt(idOrSlug, 10)) && /^\d+$/.test(String(idOrSlug).trim());
  if (isNumeric) {
    const res = await query("SELECT * FROM public.blogs WHERE id = $1", [parseInt(idOrSlug, 10)]);
    if (res.rows.length) return res.rows[0];
  }
  const slugRes = await query("SELECT * FROM public.blogs WHERE slug = $1", [String(idOrSlug).trim()]);
  return slugRes.rows[0] || null;
}

async function createBlog({ title, slug, author, category, excerpt, content, cover_url, read_time, published }) {
  const cleanTitle = (title || "").trim();
  const cleanSlug = (slug || "").trim() || generateSlug(cleanTitle);
  const cleanAuthor = (author || "Maryam Irekeola, PhD").trim();
  const cleanCat = (category || "General").trim();
  const readTimeStr = read_time || calculateReadTime(content);
  const autoExcerpt = excerpt && excerpt.trim() ? excerpt.trim() : (content || "").replace(/<[^>]+>/g, " ").trim().slice(0, 180) + "...";

  const res = await query(
    `INSERT INTO public.blogs 
      (title, slug, author, category, excerpt, content, cover_url, read_time, published, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      cleanTitle,
      cleanSlug,
      cleanAuthor,
      cleanCat,
      autoExcerpt,
      content || "",
      cover_url || "assets/img/maryam-avatar.jpg",
      readTimeStr,
      published !== undefined ? published : true,
    ]
  );
  return res.rows[0];
}

async function updateBlog(id, fields) {
  const allowed = ["title", "slug", "author", "category", "excerpt", "content", "cover_url", "read_time", "published"];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (keys.length === 0) return getBlogById(id);

  if (fields.content && !fields.read_time) {
    fields.read_time = calculateReadTime(fields.content);
    keys.push("read_time");
  }

  const setClause = keys.map((k, idx) => `"${k}" = $${idx + 1}`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(id);

  const res = await query(
    `UPDATE public.blogs SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values
  );
  return res.rows[0];
}

async function deleteBlog(id) {
  const res = await query("DELETE FROM public.blogs WHERE id = $1 RETURNING *", [id]);
  return res.rows[0] || null;
}

async function recordDownload({ book_id, book_title, visitor_name, visitor_email }) {
  const res = await query(
    `INSERT INTO public.book_downloads (book_id, book_title, visitor_name, visitor_email, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [book_id || null, book_title, visitor_name.trim(), visitor_email.trim().toLowerCase()]
  );
  return res.rows[0];
}

async function getAllDownloads() {
  const res = await query(`
    SELECT d.*, b.category as book_category
    FROM public.book_downloads d
    LEFT JOIN public.books b ON d.book_id = b.id
    ORDER BY d.created_at DESC
  `);
  return res.rows;
}

module.exports = {
  query,
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getAdminByUsername,
  getAllCategories,
  createCategory,
  deleteCategory,
  recordDownload,
  getAllDownloads,
  getAllBlogs,
  getAdminAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
};


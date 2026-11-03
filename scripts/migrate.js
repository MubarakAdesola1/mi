require("dotenv").config({ path: ".env.local" });
const db = require("../src/db");
const bcrypt = require("bcryptjs");

async function runMigration() {
  console.log("Migrating database schema on Neon Lakebase Postgres (HTTPS over Port 443)...");

  // 1. Books Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.books (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255) DEFAULT 'Maryam Irekeola, PhD',
      category VARCHAR(100) DEFAULT 'Publication',
      description TEXT,
      cover_url TEXT,
      pdf_url TEXT NOT NULL,
      pdf_key TEXT,
      page_count INT DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Table 'public.books' verified/created.");

  // 2. Admin Users Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Table 'public.admin_users' verified/created.");

  // 3. Categories Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Table 'public.categories' verified/created.");

  // 4. Book Downloads (Lead Capture) Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.book_downloads (
      id SERIAL PRIMARY KEY,
      book_id INT REFERENCES public.books(id) ON DELETE SET NULL,
      book_title VARCHAR(255) NOT NULL,
      visitor_name VARCHAR(150) NOT NULL,
      visitor_email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Table 'public.book_downloads' verified/created.");

  // 5. Blogs Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.blogs (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE,
      author VARCHAR(255) DEFAULT 'Maryam Irekeola, PhD',
      category VARCHAR(100) DEFAULT 'General',
      excerpt TEXT,
      content TEXT NOT NULL,
      cover_url TEXT,
      read_time VARCHAR(50) DEFAULT '4 min read',
      published BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Table 'public.blogs' verified/created.");

  // Seed default categories including General
  const defaultCats = ["General", "Academic Toolkits", "Research Guides", "Policy Briefs", "Publications"];
  for (const catName of defaultCats) {
    await db.query(
      "INSERT INTO public.categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [catName]
    );
  }
  console.log("✓ Default categories verified/seeded.");

  // 3. Seed default admin account if none exists
  const adminCheck = await db.query("SELECT id FROM public.admin_users WHERE username = $1", ["admin"]);
  if (adminCheck.rows.length === 0) {
    const defaultPass = "admin123";
    const hash = await bcrypt.hash(defaultPass, 10);
    await db.query(
      "INSERT INTO public.admin_users (username, password_hash, role) VALUES ($1, $2, $3)",
      ["admin", hash, "admin"]
    );
    console.log("✓ Default admin account seeded: username 'admin', password 'admin123'");
  } else {
    console.log("✓ Admin account verified.");
  }

  // 4. Seed sample publication if books table is empty
  const bookCheck = await db.query("SELECT COUNT(*)::int as count FROM public.books");
  if (parseInt(bookCheck.rows[0].count, 10) === 0) {
    const s3Host = process.env.AWS_ENDPOINT_URL_S3 ? new URL(process.env.AWS_ENDPOINT_URL_S3).hostname : "storage";
    const samplePdfUrl = `https://${s3Host}/assets/sample-phd-guide.pdf`;
    await db.query(
      `INSERT INTO public.books (title, author, category, description, cover_url, pdf_url, pdf_key, page_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "Navigating the PhD Journey: A Practical Guide to Resilience and Impact",
        "Maryam Irekeola, PhD",
        "Academic Toolkits",
        "An executive guide synthesized from doctoral research, sharing methodologies for academic productivity, research communication, and international collaboration.",
        "assets/img/maryam-irekeola.jpg",
        samplePdfUrl,
        "sample-phd-guide.pdf",
        24,
      ]
    );
    console.log("✓ Seeded introductory publication.");
  }

  // 5. Seed sample blog post if blogs table is empty
  const blogCheck = await db.query("SELECT COUNT(*)::int as count FROM public.blogs");
  if (parseInt(blogCheck.rows[0].count, 10) === 0) {
    await db.query(
      `INSERT INTO public.blogs (title, slug, author, category, excerpt, content, cover_url, read_time, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        "Bridging the Gap: Translating Academic Research into Real-World Policy",
        "bridging-the-gap-translating-research-into-policy",
        "Maryam Irekeola, PhD",
        "Policy Briefs",
        "Groundbreaking research too often remains locked behind institutional repositories. Here is an actionable framework for translating complex data into policy solutions that drive societal change.",
        `<h2>The Dilemma of Academic Research</h2>
<p>In contemporary academia, researchers spend years rigorous validating methodologies, aggregating field data, and producing peer-reviewed findings. Yet a persistent paradox remains: our most vital insights often fail to penetrate government legislative agendas and executive decision-making desks.</p>

<h3>1. Communicating Beyond the Jargon</h3>
<p>Policymakers, legislators, and community advocates do not lack interest in scientific rigor; they lack the luxury of parsing 80-page regression models during 15-minute briefings. Bridging the gap requires researchers to master the art of <strong>executive synthesis</strong>—distilling conclusions into strategic trade-offs, measurable economic impacts, and actionable recommendations.</p>

<blockquote>"Academic rigor without accessible communication is potential without power. Our ultimate responsibility is not merely publication, but public impact."</blockquote>

<h3>2. Co-Design from Inception</h3>
<p>Effective policy research does not begin in an isolated laboratory and land on a minister's desk post-facto. The most impactful studies integrate stakeholders from initial hypothesis formulation, ensuring that research questions directly align with urgent societal bottlenecks.</p>

<h3>3. Sustained Advocacy and Media Engagement</h3>
<p>Publishing an open-access paper is only step one. Translating insights into practice demands persistent engagement through op-eds, participatory workshops, policy briefs, and digital dissemination channels.</p>

<p>As researchers and thought leaders, our mission extends beyond university walls—it is to build pathways where data informs dignity, policy, and progress.</p>`,
        "assets/img/maryam-new.jpg",
        "4 min read",
        true,
      ]
    );
    console.log("✓ Seeded introductory blog post.");
  }

  console.log("Migration completed successfully!");
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = { runMigration };


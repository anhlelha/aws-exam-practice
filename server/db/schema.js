import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'exam.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDatabase() {
  const db = getDb();

  // Certifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table (linked to certifications)
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certification_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#FF9900',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (certification_id) REFERENCES certifications(id),
      UNIQUE(certification_id, name)
    )
  `);

  // Tags table (AWS services/topics)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#232F3E',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Questions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      explanation TEXT,
      is_multiple_choice BOOLEAN DEFAULT 0,
      category_id INTEGER,
      diagram_path TEXT,
      source_file TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Answers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      is_correct BOOLEAN DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  // Question-Tags junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_tags (
      question_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (question_id, tag_id),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Tests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 65,
      is_confirmed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Test-Questions junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_questions (
      test_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      order_index INTEGER DEFAULT 0,
      PRIMARY KEY (test_id, question_id),
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  // Practice sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER,
      mode TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      score INTEGER,
      total_questions INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      FOREIGN KEY (test_id) REFERENCES tests(id)
    )
  `);

  // Session answers table - tracks individual answers during practice
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_answer_ids TEXT,
      is_correct BOOLEAN DEFAULT 0,
      flagged BOOLEAN DEFAULT 0,
      answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // LLM configurations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT UNIQUE NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      api_key TEXT,
      system_prompt TEXT,
      max_tokens INTEGER DEFAULT 4096,
      temperature REAL DEFAULT 0.7,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default certifications
  const insertCert = db.prepare(`
    INSERT OR IGNORE INTO certifications (code, name, level) VALUES (?, ?, ?)
  `);
  insertCert.run('SAA-C03', 'AWS Solutions Architect - Associate', 'Associate');
  insertCert.run('SAP-C02', 'AWS Solutions Architect - Professional', 'Professional');
  insertCert.run('DVA-C02', 'AWS Developer - Associate', 'Associate');

  // Seed default categories for SAA-C03 (only if not already seeded)
  const saaId = db.prepare(`SELECT id FROM certifications WHERE code = 'SAA-C03'`).get()?.id;
  if (saaId) {
    // Check if categories already exist
    const existingCount = db.prepare(`SELECT COUNT(*) as count FROM categories WHERE certification_id = ?`).get(saaId)?.count || 0;

    if (existingCount === 0) {
      const insertCat = db.prepare(`INSERT INTO categories (certification_id, name, color) VALUES (?, ?, ?)`);
      insertCat.run(saaId, 'Design Secure Architectures', '#FF9900');
      insertCat.run(saaId, 'Design Resilient Architectures', '#1E88E5');
      insertCat.run(saaId, 'Design High-Performing Architectures', '#43A047');
      insertCat.run(saaId, 'Design Cost-Optimized Architectures', '#FDD835');
      console.log('📁 Categories seeded');
    }
  }

  // Seed default LLM configs
  const insertLlm = db.prepare(`
    INSERT OR IGNORE INTO llm_configs (role, provider, model, system_prompt) VALUES (?, ?, ?, ?)
  `);
  insertLlm.run('LLM1', 'openai', 'gpt-4o', 'You are an AWS certification exam expert. Extract questions and answers from the provided PDF text.');
  insertLlm.run('LLM2', 'openai', 'gpt-4o', 'You are an AWS Solutions Architect. Generate DrawIO XML diagrams that illustrate AWS architecture concepts.');
  insertLlm.run('LLM3', 'openai', 'gpt-4o-mini', 'You are a friendly AWS certification tutor. Help students understand exam concepts.');

  console.log('✅ Database initialized');
}

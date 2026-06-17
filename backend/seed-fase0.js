// Seed da Fase 0: cria o usuário admin com senha hasheada (bcrypt).
// Rode após aplicar schema.fase0.postgres.sql.  Uso: node seed-fase0.js
import bcrypt from "bcryptjs";
import { pool } from "./src/db.js";

const ADMIN_EMAIL = "admin@snappay.local";
const ADMIN_SENHA = "admin123";

async function main() {
  const hash = await bcrypt.hash(ADMIN_SENHA, 10);
  const papel = await pool.query("SELECT id FROM papeis WHERE chave = 'ADMIN'");
  if (papel.rowCount === 0) throw new Error("Papel ADMIN não existe — aplique schema.fase0.postgres.sql primeiro.");
  const papelId = papel.rows[0].id;

  await pool.query(
    `INSERT INTO usuarios (empresa_id, papel_id, nome, email, senha_hash)
     VALUES (1, $1, 'Administrador', $2, $3)
     ON CONFLICT (email) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, papel_id = EXCLUDED.papel_id`,
    [papelId, ADMIN_EMAIL, hash]
  );

  console.log(`✓ Admin pronto: ${ADMIN_EMAIL} / ${ADMIN_SENHA}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });

import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requirePermissao, empresaId } from "../auth.js";
import { registrarAuditoria } from "./auditoria.js";
import { randomBytes } from "crypto";

const router = Router();

// GET /api/terminal — retorna config do terminal local (device_id, ativo, modo)
router.get("/", requireAuth, async (req, res) => {
  try {
    const deviceId = req.headers["x-device-id"] || null;
    if (!deviceId) {
      return res.json({ ativo: false, modo_terminal: false, mensagem: "Nenhum device_id. Terminal não ativado." });
    }
    const eid = empresaId(req);
    const terminal = await query("SELECT * FROM terminais_pdv WHERE device_id = $1 AND empresa_id = $2", [deviceId, eid]);
    if (!terminal.rowCount) {
      return res.json({ ativo: false, modo_terminal: false, mensagem: "Device não reconhecido nesta empresa." });
    }
    const cfg = terminal.rows[0];
    res.json({ ativo: cfg.ativo, modo_terminal: cfg.modo_terminal, unidade_id: cfg.unidade_id, nome: cfg.nome });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/terminal/ativar — ativa terminal (admin)
// body: { device_id, nome, unidade_id }
router.post("/ativar", requireAuth, requirePermissao("config.editar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const { device_id, nome, unidade_id } = req.body;
    if (!device_id || !nome) return res.status(400).json({ error: "device_id e nome são obrigatórios" });

    // verifica se device já existe
    const existente = await query("SELECT id FROM terminais_pdv WHERE device_id = $1", [device_id]);
    if (existente.rowCount) {
      return res.status(409).json({ error: "Device já registrado" });
    }

    // cria terminal com chave de ativação
    const chave = randomBytes(16).toString("hex");
    const terminal = await query(
      `INSERT INTO terminais_pdv (empresa_id, unidade_id, device_id, nome, ativo, modo_terminal)
       VALUES ($1, $2, $3, $4, FALSE, FALSE) RETURNING id`,
      [eid, unidade_id || null, device_id, nome]
    );
    const terminalId = terminal.rows[0].id;

    await query(
      "INSERT INTO config_terminal (terminal_id, chave_ativacao) VALUES ($1, $2)",
      [terminalId, chave]
    );

    await registrarAuditoria(req.usuario.id, eid, "CREATE", "terminais_pdv", terminalId, `Registrou terminal ${nome} (${device_id})`, null, { device_id, nome });

    res.json({ id: terminalId, device_id, chave_ativacao: chave, mensagem: "Terminal registrado. Confirme com a chave no terminal." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/terminal/confirmar-ativacao — terminal confirma sua ativação (com chave)
// body: { chave_ativacao } + header x-device-id
router.post("/confirmar-ativacao", async (req, res) => {
  try {
    const deviceId = req.headers["x-device-id"];
    const { chave_ativacao } = req.body;
    if (!deviceId || !chave_ativacao) return res.status(400).json({ error: "device_id (header) e chave_ativacao obrigatórios" });

    const terminal = await query(
      "SELECT t.id, t.empresa_id, c.chave_ativacao FROM terminais_pdv t JOIN config_terminal c ON c.terminal_id = t.id WHERE t.device_id = $1",
      [deviceId]
    );
    if (!terminal.rowCount) return res.status(404).json({ error: "Terminal não encontrado" });

    const cfg = terminal.rows[0];
    if (cfg.chave_ativacao !== chave_ativacao) {
      return res.status(401).json({ error: "Chave inválida" });
    }

    // Ativa terminal e apaga chave
    await query("UPDATE terminais_pdv SET ativo = TRUE, modo_terminal = TRUE WHERE id = $1", [cfg.id]);
    await query("UPDATE config_terminal SET chave_ativacao = NULL WHERE terminal_id = $1", [cfg.id]);
    await registrarAuditoria(null, cfg.empresa_id, "TERMINAL", "terminais_pdv", cfg.id, `Terminal ativado (${deviceId})`, null, null);

    res.json({ ok: true, mensagem: "Terminal ativado com sucesso. Modo quiosque ativo." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/terminal/listar — lista todos os terminais da empresa (admin)
router.get("/listar", requireAuth, requirePermissao("config.editar"), async (req, res) => {
  try {
    const eid = empresaId(req);
    const terminais = await query(
      "SELECT id, device_id, nome, ativo, modo_terminal, unidade_id, criado_em FROM terminais_pdv WHERE empresa_id = $1 ORDER BY criado_em DESC",
      [eid]
    );
    res.json(terminais.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

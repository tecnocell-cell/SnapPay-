import express from "express";
import { query } from "../db.js";
import { empresaId } from "../auth.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const eid = empresaId(req);
    const emp = await query("SELECT * FROM empresas WHERE id = $1", [eid]);
    res.json(emp.rows.length ? emp.rows[0] : {});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const eid = empresaId(req);
    const {razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
      telefone, email, endereco, cidade, uf, cep, regime_tributario, logo_url} = req.body;

    const result = await query(
      `UPDATE empresas SET razao_social=$1, nome_fantasia=$2, cnpj=$3, inscricao_estadual=$4,
        inscricao_municipal=$5, telefone=$6, email=$7, endereco=$8, cidade=$9, uf=$10,
        cep=$11, regime_tributario=$12, logo_url=$13, atualizado_em=NOW()
      WHERE id=$14 RETURNING *`,
      [razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
        telefone, email, endereco, cidade, uf, cep, regime_tributario, logo_url, eid]
    );
    res.json(result.rows.length ? result.rows[0] : {});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

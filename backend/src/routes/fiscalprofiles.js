// Rotas de Perfis Fiscais — retorna presets por segmento

import { Router } from "express";
import {
  listarPerfis,
  obterPerfilFiscal,
  sugerirPerfil,
} from "../services/fiscalProfileService.js";

const router = Router();

// Listar todos os perfis
router.get("/", (req, res) => {
  try {
    const perfis = listarPerfis();
    res.json({
      total: perfis.length,
      perfis,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter um perfil específico
router.get("/:id", (req, res) => {
  try {
    const perfil = obterPerfilFiscal(req.params.id.toUpperCase());
    if (!perfil) {
      return res.status(404).json({ error: "Perfil não encontrado" });
    }
    res.json(perfil);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sugerir perfil por tipo de negócio
router.post("/sugerir", (req, res) => {
  try {
    const { tipo_negocio } = req.body;
    const perfil = sugerirPerfil(tipo_negocio);

    if (!perfil) {
      return res.status(404).json({
        error: "Não foi possível sugerir um perfil para este tipo de negócio",
      });
    }

    res.json(perfil);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

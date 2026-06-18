// Middleware: exige papel específico para acessar rota
// Uso: router.get('/admin', requirePapel("ADMIN"), handler)

const papelHierarquia = {
  ADMIN: 3,      // Administrador total
  GERENTE: 2,    // Gerente de loja
  OPERADOR: 1,   // Operador de caixa
  CLIENTE: 0,    // Apenas visualização
};

function requirePapel(papelRequerido) {
  return (req, res, next) => {
    const papel = req.usuario?.papel;

    if (!papel) {
      return res.status(401).json({ error: "Usuário sem papel definido" });
    }

    const nivelRequerido = papelHierarquia[papelRequerido];
    const nivelUsuario = papelHierarquia[papel];

    if (nivelUsuario === undefined) {
      return res.status(401).json({ error: "Papel desconhecido" });
    }

    if (nivelUsuario >= nivelRequerido) {
      // Tem permissão
      return next();
    }

    // Não tem permissão
    res.status(403).json({
      error: `Acesso negado: requer papel ${papelRequerido} (você tem ${papel})`,
      papel_requerido: papelRequerido,
      papel_usuario: papel,
    });
  };
}

export default requirePapel;

// Middleware: bloqueia acesso a rotas administrativas se requisição vem de terminal
// Uso: router.get('/admin-only', requireNonTerminal, handler)

async function requireNonTerminal(req, res, next) {
  const deviceId = req.get('X-Device-ID');

  // Se tem device_id, é um terminal — bloquear rotas admin
  if (deviceId) {
    return res.status(403).json({
      error: 'Acesso negado: esta operação não está disponível em modo terminal',
      rota: req.path,
      motivo: 'Terminal em modo quiosque — apenas operações PDV permitidas',
    });
  }

  // Não é terminal, prosseguir
  next();
}

module.exports = requireNonTerminal;

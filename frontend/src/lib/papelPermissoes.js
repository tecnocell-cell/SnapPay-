// Controle de acesso baseado em papel
// Define quais páginas cada papel pode acessar

const permissoesObrigatorias = {
  ADMIN: [
    "pdv",
    "caixa",
    "vendas",
    "clientes",
    "compras",
    "fornecedores",
    "inventario",
    "estoque",
    "kardex",
    "financeiro",
    "auditoria",
    "configuracoes",
    "modulos",
    "empresa",
    "usuario s",
    "permissoes",
    "notasfiscais",
    "fiscalconfig",
    "terminais",
    "tabelaspreco",
    "promocoes",
    "lojas",
    "dashboard",
    "relatorios",
    "categorias",
    "marcas",
    "produtos",
    "inventario",
  ],

  GERENTE: [
    "pdv",
    "caixa",
    "vendas",
    "clientes",
    "compras",
    "fornecedores",
    "inventario",
    "estoque",
    "kardex",
    "financeiro",
    "auditoria",
    "dashboard",
    "relatorios",
    "tabelaspreco",
    "promocoes",
    "produtos",
    "categorias",
    "marcas",
    "lojas",
  ],

  OPERADOR: [
    "pdv",        // Ponto de venda
    "caixa",      // Abrir/fechar caixa
    "vendas",     // Histórico vendas
    "clientes",   // Buscar cliente
  ],

  CLIENTE: [
    // Apenas leitura, sem páginas admin
  ],
};

const menuOperador = [
  "pdv",        // 💳 PDV
  "caixa",      // 💰 Caixa
  "vendas",     // 📊 Vendas
  "clientes",   // 👥 Clientes
];

const menuGerente = [
  ...menuOperador,
  "compras",        // 📦 Compras
  "inventario",     // 📈 Inventário
  "promocoes",      // 🎁 Promoções
  "tabelaspreco",   // 💵 Tabelas de Preço
  "estoque",        // 📦 Estoque
  "kardex",         // 📋 Kardex
  "financeiro",     // 💸 Financeiro
  "relatorios",     // 📊 Relatórios
];

const menuAdmin = [
  ...menuGerente,
  "produtos",       // 🛒 Produtos
  "categorias",     // 🏷️  Categorias
  "marcas",         // 🏢 Marcas
  "fornecedores",   // 🚚 Fornecedores
  "usuarios",       // 👤 Usuários
  "permissoes",     // 🔐 Permissões
  "auditoria",      // 📋 Auditoria
  "configuracoes",  // ⚙️  Configurações
  "fiscalconfig",   // 🏛️  Fiscal
  "notasfiscais",   // 📄 NF-e
  "terminais",      // 🖥️  Terminais
  "modulos",        // 📦 Módulos
  "empresa",        // 🏢 Empresa
  "lojas",          // 🏪 Lojas
  "dashboard",      // 📊 Dashboard
];

function obterMenuPorPapel(papel) {
  switch (papel) {
    case "OPERADOR":
      return menuOperador;
    case "GERENTE":
      return menuGerente;
    case "ADMIN":
      return menuAdmin;
    default:
      return [];
  }
}

function podeAcessar(papel, pagina) {
  const menu = obterMenuPorPapel(papel);
  return menu.includes(pagina);
}

function podeAcessarRota(papel, rotaId) {
  const permissoes = permissoesObrigatorias[papel] || [];
  return permissoes.includes(rotaId);
}

export { obterMenuPorPapel, podeAcessar, podeAcessarRota, menuOperador, menuGerente, menuAdmin };

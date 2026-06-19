// Perfis Fiscais — Atalhos para cadastro rápido por segmento
// Evita preencher manualmente centenas de campos

export const PERFIS_FISCAIS = {
  MERCADO: {
    nome: "Mercado / Supermercado",
    descricao: "Varejo alimentar, bebidas, higiene",
    cfop_padrao: "5101",
    cst_icms_padrao: "000",
    cst_pis_padrao: "01",
    cst_cofins_padrao: "07",
    cst_ipi_padrao: "00",
    aliquota_icms_padrao: 18.0,
    aliquota_pis_padrao: 1.65,
    aliquota_cofins_padrao: 7.6,
    aliquota_ipi_padrao: 0,
    ncm_exemplos: [
      "10061000", // Carne bovino
      "04069010", // Soro lácteo
      "22021000", // Água mineral
    ],
    regime_tributario: "NORMAL",
  },

  CONVENIENCIA: {
    nome: "Conveniência / Lanchonete",
    descricao: "Pequeno comércio, café, lanches",
    cfop_padrao: "5101",
    cst_icms_padrao: "000",
    cst_pis_padrao: "01",
    cst_cofins_padrao: "07",
    cst_ipi_padrao: "00",
    aliquota_icms_padrao: 18.0,
    aliquota_pis_padrao: 1.65,
    aliquota_cofins_padrao: 7.6,
    aliquota_ipi_padrao: 0,
    ncm_exemplos: [
      "21069090", // Preparações diversas
      "19021010", // Pão e derivados
    ],
    regime_tributario: "SIMPLES_NACIONAL",
  },

  FARMACIA: {
    nome: "Farmácia",
    descricao: "Medicamentos, higiene pessoal",
    cfop_padrao: "5101",
    cst_icms_padrao: "100", // ICMS suspenso para medicamentos
    cst_pis_padrao: "09",   // PIS suspenso
    cst_cofins_padrao: "09", // COFINS suspensa
    cst_ipi_padrao: "50",    // IPI isento
    aliquota_icms_padrao: 0,
    aliquota_pis_padrao: 0,
    aliquota_cofins_padrao: 0,
    aliquota_ipi_padrao: 0,
    ncm_exemplos: [
      "30019010", // Medicamentos antibióticos
      "33042090", // Medicamentos diversos
    ],
    regime_tributario: "NORMAL",
  },

  DISTRIBUIDORA: {
    nome: "Distribuidora",
    descricao: "Venda atacado, distribuição",
    cfop_padrao: "6101", // Venda empresa
    cst_icms_padrao: "000",
    cst_pis_padrao: "01",
    cst_cofins_padrao: "07",
    cst_ipi_padrao: "00",
    aliquota_icms_padrao: 18.0,
    aliquota_pis_padrao: 7.6,
    aliquota_cofins_padrao: 7.6,
    aliquota_ipi_padrao: 0,
    ncm_exemplos: [],
    regime_tributario: "NORMAL",
  },

  RESTAURANTE: {
    nome: "Restaurante / Bar",
    descricao: "Serviços de alimentação",
    cfop_padrao: "5101",
    cst_icms_padrao: "000",
    cst_pis_padrao: "01",
    cst_cofins_padrao: "07",
    cst_ipi_padrao: "00",
    aliquota_icms_padrao: 18.0,
    aliquota_pis_padrao: 1.65,
    aliquota_cofins_padrao: 7.6,
    aliquota_ipi_padrao: 0,
    ncm_exemplos: [
      "21069090", // Preparações alimentares
    ],
    regime_tributario: "SIMPLES_NACIONAL",
  },

  MATERIAL_CONSTRUCAO: {
    nome: "Material de Construção",
    descricao: "Materiais, ferramentas, tintas",
    cfop_padrao: "5101",
    cst_icms_padrao: "000",
    cst_pis_padrao: "01",
    cst_cofins_padrao: "07",
    cst_ipi_padrao: "05", // IPI pode aplicar
    aliquota_icms_padrao: 18.0,
    aliquota_pis_padrao: 1.65,
    aliquota_cofins_padrao: 7.6,
    aliquota_ipi_padrao: 15.0, // Exemplo típico
    ncm_exemplos: [
      "68011900", // Cimento
      "39219090", // Plásticos diversos
    ],
    regime_tributario: "NORMAL",
  },

  CIGARRO: {
    nome: "Tabacaria / Cigarro",
    descricao: "Produtos de tabaco (tributação especial)",
    cfop_padrao: "5101",
    cst_icms_padrao: "900", // Outras operações
    cst_pis_padrao: "01",
    cst_cofins_padrao: "07",
    cst_ipi_padrao: "00",
    aliquota_icms_padrao: 25.0, // Aumentado para cigarro
    aliquota_pis_padrao: 1.65,
    aliquota_cofins_padrao: 7.6,
    aliquota_ipi_padrao: 0,
    ncm_exemplos: [
      "24021000", // Cigarros com filtro
    ],
    regime_tributario: "NORMAL",
  },
};

// Buscar perfil por segmento
export function obterPerfilFiscal(segmento) {
  return PERFIS_FISCAIS[segmento] || null;
}

// Listar todos os perfis
export function listarPerfis() {
  return Object.entries(PERFIS_FISCAIS).map(([key, value]) => ({
    id: key,
    nome: value.nome,
    descricao: value.descricao,
    regime_tributario: value.regime_tributario,
  }));
}

// Aplicar perfil aos campos da empresa
export function aplicarPerfilEmpresa(perfil) {
  return {
    regime_tributario: perfil.regime_tributario,
    crt: perfil.regime_tributario === "SIMPLES_NACIONAL" ? 1 : 3,
    // Outros campos não são preenchidos (empresa preenche)
  };
}

// Aplicar perfil aos campos do produto
export function aplicarPerfilProduto(perfil, ncm_codigo = null) {
  return {
    cfop_padrao: perfil.cfop_padrao,
    cst_icms: perfil.cst_icms_padrao,
    cst_pis: perfil.cst_pis_padrao,
    cst_cofins: perfil.cst_cofins_padrao,
    cst_ipi: perfil.cst_ipi_padrao,
    aliquota_icms_padrao: perfil.aliquota_icms_padrao,
    aliquota_pis_padrao: perfil.aliquota_pis_padrao,
    aliquota_cofins_padrao: perfil.aliquota_cofins_padrao,
    aliquota_ipi_padrao: perfil.aliquota_ipi_padrao,
    ncm_codigo: ncm_codigo || (perfil.ncm_exemplos?.[0] || null),
  };
}

// Sugerir perfil baseado em tipo de negócio
export function sugerirPerfil(tipoNegocio) {
  const sugestoes = {
    mercado: "MERCADO",
    supermercado: "MERCADO",
    conveniencia: "CONVENIENCIA",
    farmacia: "FARMACIA",
    distribuidora: "DISTRIBUIDORA",
    restaurante: "RESTAURANTE",
    bar: "RESTAURANTE",
    material: "MATERIAL_CONSTRUCAO",
    construcao: "MATERIAL_CONSTRUCAO",
    cigarro: "CIGARRO",
    tabaco: "CIGARRO",
  };

  const lower = (tipoNegocio || "").toLowerCase();
  for (const [key, valor] of Object.entries(sugestoes)) {
    if (lower.includes(key)) {
      return obterPerfilFiscal(valor);
    }
  }

  return null;
}

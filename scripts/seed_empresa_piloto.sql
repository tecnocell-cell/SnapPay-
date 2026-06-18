-- ============================================================================
-- SCRIPT: Seed Empresa Piloto Real
-- Objetivo: Popular SnapPay com dados realistas de um supermercado
-- Data: 23 de junho de 2026
-- ============================================================================

-- Assumir que estamos em snappay_homolog
-- psql -U snappay_homolog_user -d snappay_homolog -f seed_empresa_piloto.sql

BEGIN;

-- ============================================================================
-- 1. EMPRESA PILOTO
-- ============================================================================

INSERT INTO empresas (nome, cnpj, razao_social, tipo)
VALUES (
  'SUPERMARKET PILOTO BRASIL LTDA',
  '12.345.678/0001-90',
  'Supermarket Piloto Brasil',
  'VAREJO'
);

-- Pegar ID da empresa
-- \set empresa_id (SELECT id FROM empresas ORDER BY id DESC LIMIT 1)

-- ============================================================================
-- 2. CATEGORIAS (6 principais + 24 subcategorias)
-- ============================================================================

INSERT INTO categorias (empresa_id, nome, descricao, ativo) VALUES
-- Mercearia
(1, 'MERCEARIA', 'Produtos de mercearia em geral', true),
(1, '  - Arroz/Feijão', 'Grãos básicos', true),
(1, '  - Óleo/Azeite', 'Óleos vegetais e azeite', true),
(1, '  - Açúcar/Sal', 'Adoçantes e temperos básicos', true),
(1, '  - Farinha/Macarrão', 'Produtos derivados de trigo', true),

-- Higiene Pessoal
(1, 'HIGIENE PESSOAL', 'Produtos de higiene e beleza', true),
(1, '  - Shampoo/Condicionador', 'Produtos para cabelo', true),
(1, '  - Sabonete/Desodorante', 'Higiene corporal', true),
(1, '  - Fraldas/Absorventes', 'Produtos absorventes', true),
(1, '  - Escova de Dente', 'Higiene bucal', true),

-- Limpeza
(1, 'LIMPEZA', 'Produtos de limpeza geral', true),
(1, '  - Detergente/Sabão', 'Produtos para lavar', true),
(1, '  - Desinfetante', 'Desinfetantes e sanitizantes', true),
(1, '  - Papel Higiênico', 'Papéis e lenços', true),
(1, '  - Pano de Prato', 'Produtos têxteis', true),

-- Bebidas
(1, 'BEBIDAS', 'Bebidas diversas', true),
(1, '  - Refrigerante 2L', 'Refrigerantes em garrafa', true),
(1, '  - Suco Natural', 'Sucos e polpas', true),
(1, '  - Água Mineral', 'Água potável', true),
(1, '  - Cerveja', 'Bebidas alcoólicas', true),

-- Alimentos Perecíveis
(1, 'PERECÍVEIS', 'Alimentos que exigem refrigeração', true),
(1, '  - Leite', 'Leite e derivados', true),
(1, '  - Queijo', 'Queijos variados', true),
(1, '  - Iogurte', 'Iogurtes naturais e doces', true),
(1, '  - Manteiga', 'Manteigas e margarinas', true),

-- Congelados
(1, 'CONGELADOS', 'Produtos congelados', true),
(1, '  - Carne Vermelha', 'Carnes vermelhas congeladas', true),
(1, '  - Frango', 'Produtos de frango', true),
(1, '  - Peixe', 'Peixes e frutos do mar', true),
(1, '  - Pizza Congelada', 'Refeições prontas congeladas', true);

-- ============================================================================
-- 3. PRODUTOS (100+ reais)
-- ============================================================================

INSERT INTO produtos (empresa_id, codigo, nome, preco_venda, estoque_atual, categoria_id, barras)
VALUES
-- Mercearia
(1, 'P001', 'Arroz Integral 5kg', 28.90, 50, 2, '7896045009823'),
(1, 'P002', 'Feijão Carioca 1kg', 8.50, 40, 2, '7896045002341'),
(1, 'P003', 'Feijão Preto 1kg', 9.20, 35, 2, '7896045002358'),
(1, 'P004', 'Lentilha 500g', 6.80, 25, 2, '7896045002365'),
(1, 'P005', 'Óleo de Soja 900ml', 5.80, 60, 3, '7896045003232'),
(1, 'P006', 'Azeite Extravirgem 500ml', 19.90, 20, 3, '7896045003249'),
(1, 'P007', 'Açúcar 1kg', 4.20, 50, 4, '7896045004123'),
(1, 'P008', 'Sal 1kg', 2.80, 40, 4, '7896045004130'),
(1, 'P009', 'Macarrão Integral 500g', 3.90, 60, 5, '7896045005214'),
(1, 'P010', 'Farinha de Trigo 1kg', 3.50, 45, 5, '7896045005221'),

-- Higiene Pessoal
(1, 'P011', 'Shampoo Neutro 400ml', 12.90, 35, 7, '7896045006123'),
(1, 'P012', 'Condicionador 400ml', 13.50, 30, 7, '7896045006130'),
(1, 'P013', 'Sabonete Barra 200g', 3.50, 80, 8, '7896045007214'),
(1, 'P014', 'Sabonete Líquido 250ml', 5.80, 50, 8, '7896045007221'),
(1, 'P015', 'Desodorante Aerossol', 14.90, 30, 8, '7896045008308'),
(1, 'P016', 'Fraldas Infantis Pacote', 35.90, 15, 9, '7896045009401'),
(1, 'P017', 'Absorventes 16un', 8.90, 25, 9, '7896045009418'),
(1, 'P018', 'Escova de Dente', 4.20, 40, 10, '7896045010507'),
(1, 'P019', 'Pasta de Dente 100ml', 6.50, 35, 10, '7896045010514'),

-- Limpeza
(1, 'P020', 'Detergente 500ml', 2.50, 100, 12, '7896045011608'),
(1, 'P021', 'Sabão em Pó 500g', 4.80, 70, 12, '7896045011615'),
(1, 'P022', 'Desinfetante 1L', 4.90, 50, 13, '7896045012701'),
(1, 'P023', 'Álcool 70% 1L', 7.50, 40, 13, '7896045012718'),
(1, 'P024', 'Papel Higiênico 4 rolos', 8.90, 80, 14, '7896045013802'),
(1, 'P025', 'Pano de Prato Pacote', 12.50, 20, 15, '7896045013819'),

-- Bebidas
(1, 'P026', 'Refrigerante Cola 2L', 6.50, 70, 17, '7896045014803'),
(1, 'P027', 'Refrigerante Laranja 2L', 6.20, 65, 17, '7896045014810'),
(1, 'P028', 'Suco Natural Caixa 1L', 5.80, 50, 18, '7896045015904'),
(1, 'P029', 'Suco Polpa Caixa', 4.50, 45, 18, '7896045015911'),
(1, 'P030', 'Água Mineral 1,5L', 1.99, 150, 19, '7896045016005'),
(1, 'P031', 'Cerveja Premium 600ml', 8.50, 80, 20, '7896045017108'),

-- Perecíveis
(1, 'P032', 'Leite Integral 1L', 4.50, 45, 22, '7896045018201'),
(1, 'P033', 'Leite Desnatado 1L', 4.20, 40, 22, '7896045018218'),
(1, 'P034', 'Queijo Meia Cura 500g', 22.90, 20, 23, '7896045019302'),
(1, 'P035', 'Queijo Mozzarela 500g', 18.50, 25, 23, '7896045019319'),
(1, 'P036', 'Iogurte Natural 500g', 6.80, 35, 24, '7896045020401'),
(1, 'P037', 'Iogurte com Fruta 500g', 7.20, 30, 24, '7896045020418'),
(1, 'P038', 'Manteiga com Sal 500g', 12.50, 15, 25, '7896045021504'),

-- Congelados
(1, 'P039', 'Carne Vermelha 1kg', 45.90, 30, 27, '7896045022604'),
(1, 'P040', 'Frango Inteiro 1,5kg', 18.90, 25, 28, '7896045023701'),
(1, 'P041', 'Peito de Frango 800g', 16.50, 20, 28, '7896045023718'),
(1, 'P042', 'Peixe Congelado 400g', 24.90, 15, 29, '7896045024802'),
(1, 'P043', 'Pizza Mozzarela Congelada', 18.90, 30, 30, '7896045025901');

-- ============================================================================
-- 4. FORNECEDORES (6 reais)
-- ============================================================================

INSERT INTO fornecedores (empresa_id, nome, cnpj, contato, email, telefone, condicao_pagamento, prazo_entrega)
VALUES
(1, 'DISTRIBUIDORA ABC LTDA', '12.345.678/0001-90', 'João Pedro', 'joao@abc.com.br', '(11) 3456-7890', '30 DIAS', 5),
(1, 'HIGIENE PLUS', '98.765.432/0001-10', 'Maria Silva', 'maria@higieneplus.com.br', '(11) 9876-5432', '15 DIAS', 3),
(1, 'LIMPEZA TOTAL BRASIL', '55.555.555/0001-99', 'Carlos Costa', 'carlos@limpezatotal.com.br', '(11) 2222-3333', '20 DIAS', 4),
(1, 'BEBIDAS BRASIL DISTRIBUIDORA', '11.111.111/0001-11', 'Roberto Gomes', 'roberto@bebidasbrasil.com.br', '(11) 4444-5555', '30 DIAS', 3),
(1, 'LATICÍNIOS SÃO PAULO', '22.222.222/0001-22', 'Fernanda Oliveira', 'fernanda@lacticiniossp.com.br', '(11) 6666-7777', '7 DIAS', 2),
(1, 'CARNES PREMIUM LTDA', '33.333.333/0001-33', 'Anderson Lima', 'anderson@carnespremium.com.br', '(11) 8888-9999', '5 DIAS', 1);

-- ============================================================================
-- 5. CLIENTES (40 reais: 20 PF + 15 PJ + 5 VIP)
-- ============================================================================

INSERT INTO clientes (empresa_id, nome, tipo, cpf_cnpj, limite_credito, tabela_preco_id)
VALUES
-- Clientes PF (Pessoa Física)
(1, 'João Silva Santos', 'PF', '123.456.789-00', 500.00, NULL),
(1, 'Maria dos Santos', 'PF', '987.654.321-00', 300.00, NULL),
(1, 'Pedro Oliveira', 'PF', '456.789.123-00', 400.00, NULL),
(1, 'Ana Costa', 'PF', '789.123.456-00', 600.00, NULL),
(1, 'Carlos Ferreira', 'PF', '321.654.987-00', 250.00, NULL),
(1, 'Lucia Pereira', 'PF', '654.987.321-00', 350.00, NULL),
(1, 'Bruno Gomes', 'PF', '147.258.369-00', 450.00, NULL),
(1, 'Fernanda Sousa', 'PF', '258.369.147-00', 380.00, NULL),
(1, 'Roberto Alves', 'PF', '369.147.258-00', 520.00, NULL),
(1, 'Julia Martins', 'PF', '741.852.963-00', 290.00, NULL),
(1, 'Marcos Teixeira', 'PF', '852.963.741-00', 410.00, NULL),
(1, 'Patricia Moura', 'PF', '963.741.852-00', 360.00, NULL),
(1, 'Ricardo Vieira', 'PF', '159.357.486-00', 480.00, NULL),
(1, 'Camila Rocha', 'PF', '357.486.159-00', 320.00, NULL),
(1, 'Felipe Nunes', 'PF', '486.159.357-00', 390.00, NULL),
(1, 'Vanessa Dias', 'PF', '654.123.987-00', 440.00, NULL),
(1, 'Andre Barbosa', 'PF', '987.654.123-00', 370.00, NULL),
(1, 'Beatriz Luna', 'PF', '123.987.654-00', 510.00, NULL),
(1, 'Diego Mendes', 'PF', '456.123.789-00', 280.00, NULL),
(1, 'Elaine Reis', 'PF', '789.456.123-00', 420.00, NULL),

-- Clientes PJ (Pessoa Jurídica) — Pequenos Negócios
(1, 'BAR DO ZÉ', 'PJ', '12.345.678/0001-90', 2000.00, NULL),
(1, 'LANCHONETE CENTRAL', 'PJ', '98.765.432/0001-10', 1500.00, NULL),
(1, 'RESTAURANTE CASA NOVA', 'PJ', '55.555.555/0001-99', 3000.00, NULL),
(1, 'PADARIA NOSSA SENHORA', 'PJ', '11.111.111/0001-11', 1800.00, NULL),
(1, 'AÇAI EXPRESS', 'PJ', '22.222.222/0001-22', 1200.00, NULL),
(1, 'PIZZARIA ITALIA', 'PJ', '33.333.333/0001-33', 2200.00, NULL),
(1, 'SORVETERIA TROPICAL', 'PJ', '44.444.444/0001-44', 1000.00, NULL),
(1, 'BOTECO DOS AMIGOS', 'PJ', '77.777.777/0001-77', 2500.00, NULL),
(1, 'CONFEITARIA DOCES', 'PJ', '88.888.888/0001-88', 900.00, NULL),
(1, 'SUPERMERCADINHO ZONA LESTE', 'PJ', '99.999.999/0001-99', 5000.00, NULL),

-- Clientes VIP (com tabela de preço especial)
(1, 'SUPERMERCADO CENTRAL', 'PJ', '10.101.010/0001-01', 10000.00, NULL),
(1, 'REDE ATACADO BRASIL', 'PJ', '20.202.020/0001-02', 15000.00, NULL),
(1, 'DISTRIBUIDORA LOCAL', 'PJ', '30.303.030/0001-03', 12000.00, NULL),
(1, 'GRANDE RESTAURANT LTDA', 'PJ', '40.404.040/0001-04', 8000.00, NULL),
(1, 'HOTEL CENTRAL BRASIL', 'PJ', '50.505.050/0001-05', 9000.00, NULL);

-- ============================================================================
-- 6. UNIDADES (Lojas) — Matriz e Filial
-- ============================================================================

INSERT INTO unidades (empresa_id, nome, tipo, endereco, telefone, ativo)
VALUES
(1, 'SUPERMARKET PILOTO - MATRIZ', 'MATRIZ', 'Av. Paulista, 1000 - São Paulo', '(11) 3000-0000', true),
(1, 'SUPERMARKET PILOTO - FILIAL', 'FILIAL', 'Rua das Flores, 500 - São Caetano', '(11) 3111-1111', true);

-- ============================================================================
-- 7. ESTOQUE POR UNIDADE (Inicializar)
-- ============================================================================

-- Matriz tem 100% do estoque
-- Filial inicia vazio (será feita transferência)

INSERT INTO estoque_unidade (unidade_id, produto_id, saldo)
SELECT 1, id, estoque_atual FROM produtos WHERE empresa_id = 1;

INSERT INTO estoque_unidade (unidade_id, produto_id, saldo)
SELECT 2, id, 0 FROM produtos WHERE empresa_id = 1;

-- ============================================================================
-- 8. TABELAS DE PREÇO
-- ============================================================================

INSERT INTO tabelas_preco (empresa_id, nome, tipo, ativo)
VALUES
(1, 'VAREJO PADRÃO', 'VAREJO', true),
(1, 'ATACADO 10+', 'ATACADO', true),
(1, 'ESPECIAL VIP', 'ESPECIAL', true);

-- Preços varejo (padrão, já no produto)
-- Preços atacado (10% desconto)
INSERT INTO tabela_preco_itens (tabela_preco_id, produto_id, preco, qtd_min)
SELECT 2, id, preco_venda * 0.90, 10 FROM produtos WHERE empresa_id = 1;

-- Preços VIP (15% desconto)
INSERT INTO tabela_preco_itens (tabela_preco_id, produto_id, preco, qtd_min)
SELECT 3, id, preco_venda * 0.85, 1 FROM produtos WHERE empresa_id = 1;

-- ============================================================================
-- 9. PROMOÇÕES (Para uso durante ETAPA 2)
-- ============================================================================

INSERT INTO promocoes (empresa_id, tipo, valor, escopo, alvo_id, data_inicio, data_fim, hora_inicio, hora_fim, dias_semana, prioridade, ativo)
VALUES
-- 10% desconto mercearia (segundas)
(1, 'PERCENTUAL', 10.00, 'CATEGORIA', 1, '2026-06-24', '2026-06-29', '07:00', '12:00', 'SEGUNDA', 1, true),
-- Leve 3 Pague 2 em higiene (toda semana)
(1, 'LEVE_X_PAGUE_Y', 0, 'CATEGORIA', 6, '2026-06-24', '2026-06-29', NULL, NULL, NULL, 2, true);

-- ============================================================================
-- COMMIT
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

SELECT 'VERIFICAÇÃO FINAL' as verificacao;
SELECT COUNT(*) as total_empresas FROM empresas;
SELECT COUNT(*) as total_categorias FROM categorias;
SELECT COUNT(*) as total_produtos FROM produtos;
SELECT COUNT(*) as total_fornecedores FROM fornecedores;
SELECT COUNT(*) as total_clientes FROM clientes;
SELECT COUNT(*) as total_unidades FROM unidades;
SELECT COUNT(*) as total_tabelas_preco FROM tabelas_preco;

-- Pronto para ETAPA 2! 🚀

# 🔧 ESPECIFICAÇÃO TÉCNICA — SPRINT UX-1

Documento para implementação das correções de UX.

---

## CRÍTICO 1: Receber Compra (Fluxo Guiado)

### Tela Atual
```
/api/compras/receber
```

### Mudanças Necessárias

#### Componente: `ReceberCompraModal.jsx` (novo)

```jsx
// Estrutura do fluxo guiado
const ReceberCompraModal = () => {
  const [step, setStep] = useState(1); // 1: Fornecedor, 2: Produtos, 3: Confirmação
  const [fornecedorId, setFornecedorId] = useState(null);
  const [itens, setItens] = useState([]);
  
  // Step 1: Seleção de fornecedor
  // Step 2: Adicionar produtos (modal)
  // Step 3: Revisar e confirmar
  // Botão: "Confirmar Recebimento" ao final
};
```

#### Fluxo:
1. Modal abre → Step 1 (Fornecedor)
2. Seleção fornecedor → Step 2 (Produtos)
3. Clicar "+ Adicionar Produto" → Modal filho para buscar e qtd
4. Produtos adicionados em tabela → Pré-visualizar total
5. "Confirmar Recebimento" → API POST /compras/confirmar → Toast sucesso

#### Toast Success:
```
✅ Compra recebida com sucesso!
   Estoque atualizado: +50 Arroz, +40 Feijão...
```

#### Validação Backend:
- Verificar estoque não negativo
- Atualizar kardex com tipo `COMPRA_RECEBIDA`
- Registrar auditoria

---

## CRÍTICO 2: Cancelar × Devolver (Separar Visualmente)

### Componentes Afetados

#### Arquivo: `src/components/VendaDetalhes.jsx`

```jsx
// ANTES (confuso):
<button onClick={cancelarVenda}>Cancelar</button>
<button onClick={abrirDevolucao}>Devolução</button>

// DEPOIS (diferenciado):
<button 
  className="btn-danger-critical"
  onClick={cancelarVenda}
  title="Anula a venda INTEIRA"
>
  <XIcon /> Cancelar Venda Inteira
</button>

<button 
  className="btn-warning-return"
  onClick={abrirDevolucaoModal}
  title="Devolve itens específicos"
>
  <ReturnIcon /> Devolver Item(ns)
</button>
```

#### Confirmações Diferentes:

**Cancelamento:**
```javascript
const confirmarCancelamento = () => {
  const msg = `⚠️  ATENÇÃO!\n\n
    Você está prestes a CANCELAR A VENDA INTEIRA (${vendaId}).\n
    Todos os itens voltarão ao estoque.\n
    Esta ação não pode ser desfeita.\n\n
    Tem certeza?`;
  
  if (confirm(msg)) {
    cancelarVenda();
  }
};
```

**Devolução:**
```javascript
const abrirDevolucaoModal = () => {
  // Modal com items da venda
  // Operador seleciona quais devolver
  // Qtd para cada item
  // Motivo
  // Confirmar apenas os itens selecionados
};
```

#### Styles (CSS):

```css
.btn-danger-critical {
  background-color: #c41e3a; /* Vermelho escuro */
  color: white;
  border: 2px solid #8b0000;
  font-size: 16px;
  padding: 10px 20px;
}

.btn-warning-return {
  background-color: #ff9800; /* Laranja */
  color: white;
  border: 2px solid #e68900;
  font-size: 16px;
  padding: 10px 20px;
}
```

#### Ícones:
- Cancelar: `<XIcon />` (X grande, vermelho)
- Devolução: `<ReturnIcon />` (seta de retorno, laranja)

---

## ALTO 1: Busca Dominante

### Componente: `PdvSearch.jsx`

#### Antes:
```jsx
<div className="form-group">
  <input placeholder="Buscar..." />
</div>
```

#### Depois:
```jsx
const PdvSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [ultimosVendidos] = useState([...]); // últimos 5
  
  const handleSearch = (value) => {
    setQuery(value);
    // Autocomplete enquanto digita
    searchProdutos(value).then(setResults);
  };
  
  const handleSelectProduct = (produto) => {
    onSelect(produto);
    setQuery(''); // limpa para próxima busca
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      // Adiciona primeiro resultado
      handleSelectProduct(results[0]);
    }
  };
  
  return (
    <div className="pdv-search-container">
      <div className="search-box">
        <SearchIcon />
        <input
          type="text"
          autoFocus
          placeholder="🔍 Buscar Produto (nome, código, barras)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="search-input-large"
        />
      </div>
      
      {query === '' && ultimosVendidos.length > 0 && (
        <div className="ultimos-vendidos">
          <small>Últimos vendidos:</small>
          <div className="chips">
            {ultimosVendidos.map(p => (
              <button
                key={p.id}
                className="chip"
                onClick={() => handleSelectProduct(p)}
              >
                {p.nome}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {results.length > 0 && (
        <ul className="search-results">
          {results.map(p => (
            <li
              key={p.id}
              onClick={() => handleSelectProduct(p)}
              className="result-item"
            >
              {p.nome} - R$ {p.preco}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

#### Styles:
```css
.pdv-search-container {
  grid-column: 1 / -1;
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid #2196F3;
  border-radius: 8px;
  padding: 10px;
}

.search-input-large {
  width: 100%;
  font-size: 18px;
  border: none;
  outline: none;
  padding: 10px;
}

.ultimos-vendidos {
  margin-top: 10px;
}

.chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.chip {
  background: #e3f2fd;
  border: 1px solid #2196F3;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
}

.search-results {
  list-style: none;
  margin-top: 10px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.result-item {
  padding: 10px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.result-item:hover {
  background: #f5f5f5;
}
```

---

## ALTO 2: Decimais em Quantidade

### Componente: `CampoQuantidade.jsx`

#### Antes:
```jsx
<input type="number" min="1" value={quantidade} />
```

#### Depois:
```jsx
const CampoQuantidade = ({ unidade = 'un', onChange }) => {
  const [value, setValue] = useState('1.0');
  
  const handleChange = (e) => {
    let val = e.target.value;
    
    // Validar: apenas números e um ponto
    if (!/^[\d.]*$/.test(val)) return;
    
    // Converter ponto para decimal
    const num = parseFloat(val);
    
    // Validar: min 0.1
    if (val && num < 0.1) return;
    
    // Validar: máx 999.999
    if (num > 999.999) return;
    
    // Limitar decimais a 3 casas
    if (val.includes('.')) {
      const parts = val.split('.');
      if (parts[1].length > 3) return;
    }
    
    setValue(val);
    onChange(num);
  };
  
  return (
    <div className="quantidade-container">
      <label>Quantidade:</label>
      <div className="input-group">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="1.0"
          className="quantidade-input"
        />
        <span className="unidade-badge">{unidade}</span>
      </div>
      <small>Mín: 0.1 | Máx: 999.999</small>
    </div>
  );
};
```

#### Styles:
```css
.quantidade-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quantidade-container label {
  font-weight: bold;
  font-size: 14px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantidade-input {
  width: 100px;
  padding: 8px;
  font-size: 16px;
  border: 2px solid #2196F3;
  border-radius: 4px;
  text-align: center;
}

.unidade-badge {
  background: #e3f2fd;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  color: #1976d2;
}

.quantidade-container small {
  font-size: 12px;
  color: #666;
}
```

---

## ALTO 3: Botão Finalizar (CTA Principal)

### Componente: `CarrinhoPdv.jsx`

#### Antes:
```jsx
<div className="button-group">
  <button>Limpar</button>
  <button>Cancelar</button>
  <button>Finalizar</button>
</div>
```

#### Depois:
```jsx
<div className="carrinho-footer">
  <div className="button-row">
    <button className="btn-secondary">Limpar</button>
    <button className="btn-secondary">Cancelar</button>
  </div>
  
  <button 
    className="btn-primary-large"
    onClick={finalizarVenda}
    disabled={carrinho.length === 0}
  >
    ✓ FINALIZAR VENDA
  </button>
</div>
```

#### Styles:
```css
.carrinho-footer {
  position: sticky;
  bottom: 0;
  background: white;
  border-top: 2px solid #ddd;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
}

.button-row {
  display: flex;
  gap: 10px;
  justify-content: flex-start;
}

.btn-secondary {
  padding: 10px 20px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary-large {
  width: 100%;
  padding: 18px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-primary-large:hover:not(:disabled) {
  background: #45a049;
}

.btn-primary-large:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

---

## MÉDIO 1: Toast de Sucesso

### Componente: `Toast.jsx` (ou usar lib)

```jsx
const showToast = (type, message) => {
  // Implementar ou usar react-toastify
  // Toast verde com ícone ✓
  // Desaparece em 3 segundos
};

// Uso:
showToast('success', '✅ Venda #001 finalizada!');
showToast('success', '✅ Compra recebida com sucesso!');
showToast('success', '✅ Inventário concluído!');
```

---

## MÉDIO 2: Campo Quantidade Visível

Já coberto em ALTO 2 (decimais).

---

## 🧪 Testes Necessários

### Unit Tests
```javascript
describe('Decimais em Quantidade', () => {
  test('Aceita 0.100', () => {});
  test('Aceita 10.750', () => {});
  test('Rejeita 0', () => {});
  test('Rejeita -5', () => {});
});

describe('Busca de Produtos', () => {
  test('Autocomplete funciona', () => {});
  test('Enter adiciona', () => {});
  test('Cursor em campo inicial', () => {});
});

describe('Cancelar vs Devolver', () => {
  test('Cancelamento com confirmação agressiva', () => {});
  test('Devolução com modal de itens', () => {});
  test('Não confundem visualmente', () => {});
});
```

### E2E Tests (com operador real)
- Teste completo com novo operador
- 20 vendas em < 8 min
- Nenhuma confusão
- 100% sucesso

---

## 📋 Checklist de Implementação

- [ ] CRÍTICO 1: Receber Compra (fluxo guiado)
- [ ] CRÍTICO 2: Cancelar vs Devolver (cores, ícones, confirmações)
- [ ] ALTO 1: Busca dominante (autocomplete, Enter)
- [ ] ALTO 2: Decimais aceitos (0.1 a 999.999)
- [ ] ALTO 3: Botão finalizar destacado (sticky, grande)
- [ ] MÉDIO 1: Toast de sucesso
- [ ] MÉDIO 2: Quantidade visível (label, campo)
- [ ] Testes unitários
- [ ] Testes E2E com operador
- [ ] Code review
- [ ] Deploy para homologação

---

**Pronto para implementação segunda-feira.**

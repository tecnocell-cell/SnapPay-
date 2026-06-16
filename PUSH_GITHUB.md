# 🚀 Como Subir SnapPay para GitHub

## Passo 1: Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. Preencha:
   - **Owner:** tecnocell-cell
   - **Repository name:** SnapPay
   - **Description:** PDV Web moderno - Sistema de frente de caixa
   - **Public/Private:** Public
   - ❌ NÃO marque "Initialize this repository"
3. Clique **"Create repository"**

## Passo 2: Executar Comandos Git

Após criar, copie e execute estes comandos:

```bash
cd C:\Users\root\Documents\Projetos\EasySAC-Web
git remote add origin https://github.com/tecnocell-cell/SnapPay.git
git branch -M main
git push -u origin main
```

## Passo 3: Verificar

Acesse: https://github.com/tecnocell-cell/SnapPay

Você deve ver:
- ✅ 24 arquivos commitados
- ✅ README.md visível
- ✅ .gitignore aplicado
- ✅ branch main como default

---

## Se já criou com README/LICENSE/gitignore:

```bash
cd C:\Users\root\Documents\Projetos\EasySAC-Web
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

**Autor:** Gianderson Fábio J. (giandersonfjs@gmail.com)
**Projeto:** SnapPay PDV Web
**Data:** 16/06/2026

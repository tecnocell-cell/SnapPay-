# Fase 1 — Visão Geral das Referências

Resumo cruzado dos 6 sistemas analisados (relatórios individuais em cada pasta).

| Sistema | Stack | Banco | Foco | Modular? | Fiscal BR | Offline | Melhor lição |
|---------|-------|-------|------|----------|-----------|---------|--------------|
| **OSPOS** | PHP / CodeIgniter 4 | MySQL | Varejo geral | Por controller | ❌ | ❌ | Modelagem de dados + permissões por ação |
| **NexoPOS** | PHP / **Laravel 12** + Vue | MySQL | Varejo/mercado SaaS | ⭐ **Módulos ativáveis + hooks** | ❌ | Parcial | **Arquitetura modular + Caixa + Compras + Fidelidade** |
| **ERPNext** | Python / Frappe + JS | MariaDB/PG | ERP completo | ⭐ DocTypes | Por região | ❌ | **Financeiro completo (DRE) + BOM/ficha técnica** |
| **POS Awesome** | Python+JS / **Vue+Vuetify** | (ERPNext) | Frente de caixa | Componentes | herda | Parcial | **UX de PDV (grade visível, atalhos, diálogos)** |
| **TailPOS** | JS / **React Native** | PouchDB local | PDV mobile | App | herda | ⭐ **Sim** | **Offline-first + sync + hardware** |
| **FloreantPOS** | Java / Swing + Hibernate | Derby/MySQL/PG | **Restaurante** | Pacotes | ❌ | ❌ | **Mesas + Comandas + KDS + Drawer** |

## Conclusões da Fase 1

1. **Referência de arquitetura SaaS modular:** NexoPOS (módulos ativáveis, RBAC, hooks de eventos).
2. **Referência de profundidade ERP/Financeiro:** ERPNext (DRE, centros de custo, conciliação, BOM).
3. **Referência de UX de frente de caixa:** POS Awesome (grade de produtos, atalhos, modais de caixa).
4. **Referência de mobilidade/offline:** TailPOS (offline-first, IndexedDB-like, sync).
5. **Referência de restaurante:** FloreantPOS (mesas, comandas, cozinha/KDS).
6. **Referência de modelagem de varejo simples:** OSPOS (receivings, stock locations, cashups).

> Nenhum deles, sozinho, cobre tudo que a missão quer. A oportunidade do SnapPay é **combinar**: a modularidade do NexoPOS + a profundidade financeira/fiscal do ERPNext + a UX do POS Awesome + o offline do TailPOS + o restaurante do Floreant — numa stack web moderna (React + Node + PostgreSQL).

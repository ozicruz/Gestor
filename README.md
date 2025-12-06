# 🔧 Gestor de Oficina (ERP Desktop)

Um sistema completo de gestão para oficinas mecânicas e auto-peças, desenvolvido com **Electron** e **Node.js**. Focado no controlo operacional e inteligência financeira.

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow) ![Tech](https://img.shields.io/badge/Tech-Electron%20%7C%20SQLite%20%7C%20Node.js-blue)

## 🚀 Funcionalidades Principais

### 🛠️ Operacional
* **Gestão de Ordens de Serviço (OS):** Criação, edição e acompanhamento de status (Aberta, Em Andamento, Finalizada).
* **Controlo de Stock:** Alertas automáticos de stock baixo e gestão de entrada/saída.
* **Gestão de Clientes e Veículos:** Histórico completo de serviços por veículo/cliente.

### 💰 Vendas (PDV)
* **Frente de Caixa:** Venda rápida de produtos e serviços.
* **Formas de Pagamento:** Suporte a Dinheiro, Pix, Fiado e **Cartão de Crédito com Parcelamento**.
* **Lógica de Acréscimo/Desconto:** Flexibilidade para aplicar descontos ou juros no momento da venda.
* **Impressão de Recibos:** Geração automática de PDFs personalizados com os dados da empresa.

### 📊 Financeiro e Relatórios
* **Fluxo de Caixa:** Registo automático de entradas e saídas.
* **Contas a Receber:** Gestão de vendas a prazo ("Fiado") e amortizações parciais.
* **DRE (Demonstrativo de Resultado):** Relatório em tempo real com cálculo de **Lucro Bruto** (considerando CMV) e **Lucro Líquido**.
* **Curva ABC:** Relatório de produtos mais lucrativos.

## 💻 Tecnologias Utilizadas
* **Frontend:** HTML5, CSS3 (Tailwind CSS), JavaScript (Vanilla).
* **Backend:** Node.js (Express), SQLite (Base de dados local).
* **Desktop:** Electron (com Electron Forge).
* **CI/CD:** GitHub Actions (Build automático do instalador Windows).

## 📸 Capturas de Tela

*(Adicione aqui as suas imagens: Dashboard, Venda, DRE)*

## ⚙️ Como Rodar o Projeto

### Pré-requisitos
* Node.js (v16 ou superior)
* NPM

### Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/ozzycruz/Gestor.git
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie em modo de desenvolvimento:
    ```bash
    npm start
    ```
4.  Para gerar o executável (Windows):
    ```bash
    npm run make
    ```

## 📄 Licença
Este projeto é para fins de portfólio e gestão interna.

---
Desenvolvido por **[Oziete Alves]**.
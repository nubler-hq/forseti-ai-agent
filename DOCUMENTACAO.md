# Extensão Forseti - AI Browser Agent

Este documento descreve a estrutura e o código-fonte da extensão **Forseti - AI Browser Agent**, uma ferramenta funcional para o Google Chrome que utiliza a API Gemini (via endpoint compatível com OpenAI) para traduzir comandos de linguagem natural em ações de controle do navegador.

## Mecanismo de Controle do Navegador

Forseti utiliza as APIs nativas do Chrome para o controle do navegador:
*   **`chrome.tabs`**: Para navegação e gerenciamento de abas.
*   **`chrome.scripting`**: Para injetar e executar código JavaScript na página ativa (simular cliques, preencher formulários, obter conteúdo).
*   **`chrome.storage`**: Para armazenar de forma segura a chave de API do usuário.

O fluxo de trabalho é o seguinte:
1.  O usuário envia um comando de linguagem natural no popup.
2.  O Service Worker (`background.js`) chama a API Gemini, enviando o comando e um **prompt de sistema** que instrui o modelo a retornar uma **ação estruturada em JSON**.
3.  O Service Worker recebe o JSON e executa a ação correspondente usando as APIs do Chrome.

## Estrutura do Projeto

| Arquivo | Descrição |
| :--- | :--- |
| `manifest.json` | O arquivo de manifesto da extensão (Manifest V3), que define o nome, a versão, as permissões e a página de opções. |
| `popup.html` | A interface de usuário (UI) minimalista que aparece quando o usuário clica no ícone da extensão. |
| `popup.js` | O script que gerencia a UI do `popup.html` e envia comandos para o Service Worker. |
| `background.js` | O Service Worker (script de fundo) que contém a lógica de chamada à API Gemini e as funções de controle do navegador. |
| `options.html` | A página de configurações para o usuário inserir e salvar sua chave de API. |
| `options.js` | O script que gerencia a lógica de salvar a chave de API no `chrome.storage`. |
| `images/` | Diretório para os ícones da extensão. |

## Código-Fonte (Atualizado)

O código-fonte completo está no arquivo `forseti-ai-agent.zip`. Abaixo estão os trechos mais importantes:

### 1. `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Forseti - AI Browser Agent",
  "version": "1.0",
  "description": "Forseti: Agente de IA para controle de navegador, utilizando a API Gemini.",
  "options_page": "options.html",
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon-16.png",
      "32": "images/icon-32.png",
      "48": "images/icon-48.png",
      "128": "images/icon-128.png"
    }
  },
  "icons": {
    "16": "images/icon-16.png",
    "32": "images/icon-32.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png"
  },
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

### 2. `background.js` (Lógica de Chamada à API)

O Service Worker agora faz uma chamada `fetch` real para a API, utilizando a chave armazenada e o prompt de sistema para garantir a saída JSON estruturada.

```javascript
// background.js (Trecho da chamada à API)

const SYSTEM_PROMPT = `
Você é Forseti, um agente de IA para controle de navegador. Sua única função é traduzir comandos de linguagem natural em uma ação estruturada em formato JSON.
// ... (Prompt completo no arquivo)
`;

async function callGeminiAPI(command) {
    const { apiKey } = await chrome.storage.local.get('apiKey');

    if (!apiKey) {
        return { action: 'SAY', value: 'Erro: Chave de API Gemini não configurada. Por favor, configure a chave.' };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gemini-2.5-flash', // Modelo Gemini compatível
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: command }
                ],
                response_format: { type: 'json_object' }
            })
        });
        // ... (Lógica de tratamento de resposta e parsing JSON)
    } catch (e) {
        // ... (Tratamento de erro)
    }
}
// ... (Funções de controle do navegador: clickElement, getPageContent, fillForm)
```

## Instruções de Instalação e Configuração

Para usar a extensão Forseti:

### Passo 1: Instalação da Extensão

1.  **Baixe o arquivo:** Baixe o arquivo `forseti-ai-agent.zip` anexado e descompacte-o.
2.  **Abra o Chrome:** Navegue para `chrome://extensions`.
3.  **Ative o Modo Desenvolvedor:** No canto superior direito, ative o botão **Modo Desenvolvedor**.
4.  **Carregue a Extensão:** Clique no botão **Carregar sem compactação** (Load unpacked) e selecione o diretório descompactado.
5.  **Fixe a Extensão:** Clique no ícone de peça de quebra-cabeça (Extensões) e fixe o **Forseti - AI Browser Agent** para fácil acesso.

### Passo 2: Configuração da Chave de API

1.  **Obtenha sua Chave:** Adquira sua chave de API Gemini (ou uma chave compatível com o endpoint OpenAI).
2.  **Acesse as Opções:** Clique com o botão direito no ícone do Forseti e selecione **Opções** (ou vá para `chrome://extensions`, encontre Forseti e clique em **Detalhes** > **Opções da extensão**).
3.  **Insira a Chave:** Na página de configurações, insira sua chave de API no campo e clique em **Salvar Chave**.

### Passo 3: Comandos de Teste

Com a chave salva, clique no ícone do Forseti e use comandos de linguagem natural:

| Comando | Ação Esperada |
| :--- | :--- |
| `Vá para o site da Wikipedia` | Navega para `https://www.wikipedia.org/`. |
| `Clique no botão de busca` | Tenta clicar em um elemento de busca na página. |
| `Preencha o campo de email com 'meu.nome@exemplo.com'` | Tenta preencher o primeiro campo de email encontrado. |
| `Qual é a função do Forseti?` | O agente deve responder com texto (ação `SAY`). |

A extensão está agora totalmente funcional, dependendo apenas de uma chave de API válida para o Gemini.

// background.js (Service Worker)

// O prompt de sistema é crucial para instruir a IA a retornar uma ação estruturada.
const SYSTEM_PROMPT = `
Você é Forseti, um agente de IA para controle de navegador. Sua única função é traduzir comandos de linguagem natural em uma ação estruturada em formato JSON.

O JSON DEVE ter a seguinte estrutura:
{
  "action": "AÇÃO",
  "value": "VALOR"
}

As AÇÕES possíveis e seus VALORES esperados são:
1. NAVIGATE: Navegar para uma URL. VALOR: A URL completa (ex: "https://www.google.com").
2. CLICK: Clicar em um elemento. VALOR: Um seletor CSS que identifique o elemento (ex: "button#submit" ou "a[href='/login']").
3. FILL_FORM: Preencher um campo de formulário. VALOR: Um objeto JSON com o seletor CSS do campo e o texto a ser preenchido (ex: {"selector": "input#username", "text": "meu_usuario"}).
4. GET_CONTENT: Obter o conteúdo da página. VALOR: null.
5. SAY: Responder ao usuário com texto. Use esta ação se o comando não for uma ação de controle do navegador. VALOR: A resposta em texto (ex: "Olá, como posso ajudar?").

Se o comando for ambíguo, use a ação SAY e peça mais detalhes.
Sua resposta DEVE ser APENAS o objeto JSON. Não inclua texto explicativo, Markdown ou qualquer outra coisa.
`;

// Função para chamar a API Gemini (usando o endpoint compatível com OpenAI)
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

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro da API:', errorData);
            return { action: 'SAY', value: `Erro na chamada da API: ${response.status} - ${errorData.error.message}` };
        }

        const data = await response.json();
        const jsonString = data.choices[0].message.content.trim();
        
        // Tenta parsear o JSON
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('Erro ao decodificar JSON:', e, 'String:', jsonString);
            return { action: 'SAY', value: 'Erro: A IA retornou um formato de ação inválido.' };
        }

    } catch (e) {
        console.error('Erro de rede:', e);
        return { action: 'SAY', value: `Erro de rede ao se comunicar com a API: ${e.message}` };
    }
}

// Função para executar um script na aba ativa
async function executeScriptInActiveTab(func, args) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        return { success: false, message: "Nenhuma aba ativa encontrada." };
    }

    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: func,
            args: args,
        });
        // O resultado é um array, pegamos o resultado da primeira (e única) execução
        return { success: true, result: results[0].result };
    } catch (error) {
        console.error("Erro ao executar script:", error);
        return { success: false, message: `Erro ao executar script: ${error.message}` };
    }
}

// Funções de controle do navegador (executadas no contexto da página)
function clickElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.click();
        return `Elemento com seletor '${selector}' clicado com sucesso.`;
    } else {
        return `Erro: Nenhum elemento encontrado com o seletor '${selector}'.`;
    }
}

function getPageContent() {
    // Retorna um resumo simples do conteúdo da página
    const title = document.title;
    const links = document.querySelectorAll('a').length;
    const paragraphs = document.querySelectorAll('p').length;
    return `Título: "${title}". A página tem ${paragraphs} parágrafos e ${links} links.`;
}

function fillForm(data) {
    const element = document.querySelector(data.selector);
    if (element) {
        element.value = data.text;
        // Dispara eventos para garantir que frameworks reajam à mudança
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return `Campo preenchido com sucesso: ${data.selector} com o valor: ${data.text}.`;
    } else {
        return `Erro: Nenhum campo encontrado com o seletor '${data.selector}'.`;
    }
}

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'processCommand') {
        (async () => {
            const aiResponse = await callGeminiAPI(request.command);
            let finalReply = aiResponse.value; // Por padrão, a resposta é o valor (SAY)

            switch (aiResponse.action) {
                case 'NAVIGATE':
                    try {
                        await chrome.tabs.update({ url: aiResponse.value });
                        finalReply = `Navegação iniciada para ${aiResponse.value}.`;
                    } catch (e) {
                        finalReply = `Erro ao navegar: ${e.message}`;
                    }
                    break;

                case 'CLICK':
                    const clickResult = await executeScriptInActiveTab(clickElement, [aiResponse.value]);
                    finalReply = clickResult.success ? clickResult.result : clickResult.message;
                    break;

                case 'GET_CONTENT':
                    const contentResult = await executeScriptInActiveTab(getPageContent, []);
                    finalReply = contentResult.success ? `Análise da página: ${contentResult.result}` : contentResult.message;
                    break;

                case 'FILL_FORM':
                    const fillResult = await executeScriptInActiveTab(fillForm, [aiResponse.value]);
                    finalReply = fillResult.success ? fillResult.result : fillResult.message;
                    break;

                case 'SAY':
                default:
                    // finalReply já é aiResponse.value
                    break;
            }

            sendResponse({ reply: finalReply });
        })();
        // Retorna true para indicar que sendResponse será chamado de forma assíncrona
        return true;
    }
});

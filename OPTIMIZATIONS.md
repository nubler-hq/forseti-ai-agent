# Otimizações Prioritárias para Forseti

Este documento lista as otimizações identificadas durante a análise das APIs do Chrome e melhores práticas para extensões Manifest V3.

## Otimizações de Alta Prioridade

### 1. Implementar Cache de Respostas da API Gemini
**Issue:** #6 (a ser criada)  
**Descrição:** Adicionar cache de respostas da API usando `chrome.storage.local` para evitar chamadas repetidas para comandos idênticos ou similares.

**Benefícios:**
- Redução de latência (respostas instantâneas para comandos em cache)
- Redução de custo de API
- Melhor experiência do usuário

**Implementação:**
```javascript
// background.js
async function callGeminiAPI(command) {
    // Verificar cache primeiro
    const cacheKey = `cache_${command}`;
    const cached = await chrome.storage.local.get(cacheKey);
    
    if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < 3600000)) {
        console.log('Retornando resposta do cache');
        return cached[cacheKey].response;
    }
    
    // Chamar API se não houver cache
    const response = await fetchGeminiAPI(command);
    
    // Salvar no cache
    await chrome.storage.local.set({
        [cacheKey]: { response, timestamp: Date.now() }
    });
    
    return response;
}
```

---

### 2. Adicionar Feedback de Carregamento no Popup
**Issue:** #3 (já criada - UI/UX)  
**Descrição:** Adicionar indicador visual de carregamento durante chamadas à API para melhorar a transparência e UX.

**Benefícios:**
- Usuário sabe que a extensão está processando o comando
- Redução de frustração com comandos que demoram
- Interface mais profissional

**Implementação:**
```javascript
// popup.js
function sendMessage() {
    const command = input.value.trim();
    if (command) {
        appendMessage('user', command);
        input.value = '';
        sendButton.disabled = true;
        
        // Adicionar indicador de carregamento
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'agent', 'loading');
        loadingDiv.textContent = 'Processando...';
        chatBox.appendChild(loadingDiv);
        
        chrome.runtime.sendMessage({ action: 'processCommand', command: command }, (response) => {
            // Remover indicador de carregamento
            loadingDiv.remove();
            
            if (response && response.reply) {
                appendMessage('agent', response.reply);
            } else if (response && response.error) {
                appendMessage('agent', `Erro: ${response.error}`);
            }
            sendButton.disabled = false;
        });
    }
}
```

**CSS:**
```css
.loading {
    opacity: 0.6;
    font-style: italic;
}
```

---

### 3. Melhorar Seletores CSS Gerados pela IA
**Issue:** #5 (já criada - Refactor: Melhorar a precisão das funções de controle)  
**Descrição:** Refinar o prompt de sistema para instruir a IA a gerar seletores CSS mais robustos e específicos.

**Benefícios:**
- Maior precisão nas ações de controle do navegador
- Menos falhas ao tentar clicar ou preencher elementos
- Melhor experiência do usuário

**Implementação:**
Atualizar o `SYSTEM_PROMPT` no `background.js`:

```javascript
const SYSTEM_PROMPT = `
Você é Forseti, um agente de IA para controle de navegador. Sua única função é traduzir comandos de linguagem natural em uma ação estruturada em formato JSON.

// ... (prompt existente)

**IMPORTANTE para seletores CSS:**
- Prefira seletores específicos usando IDs únicos (ex: "button#submit-btn")
- Use atributos data-* quando disponíveis (ex: "button[data-action='submit']")
- Para formulários, use atributos name ou type (ex: "input[name='email']" ou "input[type='email']")
- Evite seletores genéricos como "button" ou "a" - seja o mais específico possível
- Se o comando mencionar texto visível, use seletores de texto (ex: "button:contains('Login')")
`;
```

---

## Otimizações de Média Prioridade

### 4. Implementar Retry Logic para Chamadas à API
**Issue:** #7 (a ser criada)  
**Descrição:** Adicionar lógica de retry com backoff exponencial para chamadas à API que falham devido a erros de rede ou rate limiting.

**Benefícios:**
- Maior resiliência a falhas de rede
- Melhor experiência em conexões instáveis
- Tratamento automático de rate limiting

**Implementação:**
```javascript
async function fetchGeminiAPIWithRetry(command, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fetchGeminiAPI(command);
        } catch (error) {
            if (attempt === maxRetries - 1) throw error;
            
            // Backoff exponencial: 1s, 2s, 4s
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

---

### 5. Adicionar Configuração de Modelo na Página de Opções
**Issue:** #8 (a ser criada)  
**Descrição:** Permitir que o usuário escolha qual modelo Gemini usar (ex: `gemini-2.5-flash`, `gemini-2.0-pro`).

**Benefícios:**
- Flexibilidade para o usuário
- Possibilidade de usar modelos mais avançados para tarefas complexas
- Controle de custo (modelos mais baratos para tarefas simples)

---

## Otimizações de Baixa Prioridade

### 6. Usar `chrome.storage.session` para Dados Temporários
**Issue:** #9 (a ser criada)  
**Descrição:** Usar `chrome.storage.session` (disponível em Chrome 102+) para dados que não precisam persistir entre sessões (ex: histórico de chat).

**Benefícios:**
- Melhor performance (dados em memória)
- Menor uso de armazenamento persistente
- Limpeza automática ao fechar o navegador

---

## Otimizações Futuras (v2.0+)

### 7. Avaliar `chrome.debugger` para Recursos Avançados
**Issue:** #10 (a ser criada)  
**Descrição:** Explorar o uso da API `chrome.debugger` para recursos avançados como interceptação de rede, controle de eventos de baixo nível e automação mais robusta.

**Benefícios:**
- Controle muito mais preciso do navegador
- Possibilidade de interceptar e modificar requisições HTTP
- Simulação de eventos de mouse e teclado mais robusta

**Desafios:**
- Permissão `debugger` pode assustar usuários
- Maior complexidade de implementação
- Requer conhecimento do Chrome DevTools Protocol

---

## Próximos Passos

1. Criar as Issues faltantes no GitHub (#6, #7, #8, #9, #10)
2. Implementar as otimizações de alta prioridade (#1, #2, #3)
3. Testar e validar as otimizações
4. Atualizar a documentação
5. Fazer commit e push das mudanças

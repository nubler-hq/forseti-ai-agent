document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveButton');
    const statusDiv = document.getElementById('status');

    // Carregar a chave de API salva
    chrome.storage.local.get('apiKey', (data) => {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
            statusDiv.textContent = 'Chave de API carregada.';
            statusDiv.classList.add('success');
        }
    });

    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.local.set({ apiKey: apiKey }, () => {
                statusDiv.textContent = 'Chave de API salva com sucesso!';
                statusDiv.classList.remove('error');
                statusDiv.classList.add('success');
            });
        } else {
            statusDiv.textContent = 'Por favor, insira uma chave de API válida.';
            statusDiv.classList.remove('success');
            statusDiv.classList.add('error');
        }
    });
});

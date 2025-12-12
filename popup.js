document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('command-input');
    const sendButton = document.getElementById('send-button');
    const chatBox = document.getElementById('chat-box');

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.textContent = text;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function sendMessage() {
        const command = input.value.trim();
        if (command) {
            appendMessage('user', command);
            input.value = '';
            sendButton.disabled = true;

            // Envia a mensagem para o service worker (background script)
            chrome.runtime.sendMessage({ action: 'processCommand', command: command }, (response) => {
                if (response && response.reply) {
                    appendMessage('agent', response.reply);
                } else if (response && response.error) {
                    appendMessage('agent', `Erro: ${response.error}`);
                }
                sendButton.disabled = false;
            });
        }
    }
});

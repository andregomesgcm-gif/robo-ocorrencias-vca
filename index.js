const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// COLOQUE AQUI A URL DO SEU APPS SCRIPT (Mantenha as aspas)
const WEBHOOK_URL = 'SUA_URL_DO_APPS_SCRIPT_AQUI';

// Servidor web básico apenas para manter a nuvem rodando
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Robô Operacional!'));
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

// Configuração de conexão do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

// Gera o QR Code no terminal
client.on('qr', (qr) => {
    console.log('ESCANEIE O QR CODE ABAIXO:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Conectado ao WhatsApp com sucesso! Escutando mensagens...');
});

// Ouve as mensagens recebidas
client.on('message', async msg => {
    // A linha abaixo (sem as barras) faria o robô ler APENAS mensagens de grupos. 
    // Por enquanto, deixaremos comentada para você testar mandando mensagem do seu próprio número.
    // if (!msg.from.includes('@g.us')) return; 

    const dados = {
        remetente: msg.author || msg.from,
        mensagem: msg.body
    };

    try {
        // Envia para o Google Sheets
        await axios.post(WEBHOOK_URL, dados);
        console.log('Ocorrência encaminhada para a planilha!');
    } catch (erro) {
        console.error('Erro ao encaminhar:', erro.message);
    }
});

client.initialize();

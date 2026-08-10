const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');

// COLOQUE AQUI A URL DO SEU APPS SCRIPT (Mantenha as aspas)
const WEBHOOK_URL = 'AKfycbwgJSu-r7LTJ1-nf2F0_KZNx3-dCVeYJfaMxuUsSV-3njvGjWbq7BqJfMtPSFVAnUQ7';

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

// Gera um link com a imagem do QR Code
client.on('qr', (qr) => {
    const linkDaImagem = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr);
    console.log('====================================================');
    console.log('CLIQUE NO LINK ABAIXO PARA ABRIR A IMAGEM DO QR CODE:');
    console.log(linkDaImagem);
    console.log('====================================================');
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

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const axios = require('axios');
const http = require('http');

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwgJSu-r7LTJ1-nf2F0_KZNx3-dCVeYJfaMxuUsSV-3njvGjWbq7BqJfMtPSFVAnUQ7/exec';

// Servidor para o Render
const porta = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Robo GM VCA Online e Operante!\n');
}).listen(porta, () => {
    console.log(`✅ Servidor ativado na porta ${porta}`);
});

async function iniciarRobo() {
    const { state, saveCreds } = await useMultiFileAuthState('sessao_whatsapp');
    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        browser: ['Robo GM', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            const linkDaImagem = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr);
            console.log('CLIQUE NO LINK ABAIXO PARA ABRIR A IMAGEM DO QR CODE:');
            console.log(linkDaImagem);
        }
        if (connection === 'close') {
            const tentarReconectar = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (tentarReconectar) iniciarRobo();
        } else if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp! Escutando grupos...');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const deOndeVeio = msg.key.remoteJid;
        if (!deOndeVeio.endsWith('@g.us')) return;

        try {
            const metadadosGrupo = await sock.groupMetadata(deOndeVeio);
            const nomeGrupo = metadadosGrupo.subject;

            // --- SISTEMA ESPIÃO DE LOGS ---
            console.log(`\n--- MENSAGEM RECEBIDA ---`);
            console.log(`NOME DO GRUPO: "${nomeGrupo}"`);

            const gruposPermitidos = ['COORDENAÇÃO DE ÁREA', 'SUPERVISÃO DE OPERAÇÕES - GM', 'TESTE GM'];
            
            if (!gruposPermitidos.includes(nomeGrupo)) {
                console.log(`❌ Ação: Ignorado (Não está na lista de permitidos).`);
                return;
            }

            const texto = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!texto) {
                 console.log(`❌ Ação: Ignorado (Mensagem não possui texto).`);
                 return;
            }

            const remetente = `${nomeGrupo} (${msg.key.participant.split('@')[0]})`;
            const dados = {
                remetente: remetente,
                mensagem: texto
            };

            await axios.post(WEBHOOK_URL, dados);
            console.log(`🚀 SUCESSO: Ocorrência enviada para a Planilha!`);

        } catch (erro) {
            console.log('Erro ao processar:', erro.message);
        }
    });
}

iniciarRobo();

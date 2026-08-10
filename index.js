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
        console.log('\n--- 🔔 SENSOR DE ATIVIDADE DISPARADO ---');
        
        const msg = m.messages[0];
        if (!msg) {
            console.log('❌ Erro: Evento recebido, mas a mensagem está vazia.');
            return;
        }

        const deOndeVeio = msg.key.remoteJid;
        console.log(`📡 Origem do sinal: ${deOndeVeio}`);

        if (msg.key.fromMe) {
            console.log('❌ Ação: Ignorado (Mensagem enviada pelo próprio celular conectado).');
            return;
        }
        
        if (!deOndeVeio.endsWith('@g.us')) {
            console.log('❌ Ação: Ignorado (A mensagem não veio de um grupo).');
            return;
        }

        try {
            const metadadosGrupo = await sock.groupMetadata(deOndeVeio);
            const nomeGrupo = metadadosGrupo.subject;

            console.log(`🏷️ NOME EXATO DO GRUPO: "${nomeGrupo}"`);

            const gruposPermitidos = ['COORDENAÇÃO DE ÁREA', 'SUPERVISÃO DE OPERAÇÕES - GM', 'TESTE GM'];
            
            if (!gruposPermitidos.includes(nomeGrupo)) {
                console.log(`❌ Ação: Ignorado (O nome do grupo não está na lista).`);
                return;
            }

            const texto = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!texto) {
                 console.log(`❌ Ação: Ignorado (A mensagem não possui texto escrito).`);
                 return;
            }

            const remetente = `${nomeGrupo} (${msg.key.participant.split('@')[0]})`;
            const dados = {
                remetente: remetente,
                mensagem: texto
            };

            console.log(`⏳ Enviando para a Planilha...`);
            await axios.post(WEBHOOK_URL, dados);
            console.log(`🚀 SUCESSO: Ocorrência enviada para o Google Sheets!`);

        } catch (erro) {
            console.log('⚠️ Erro interno no processamento:', erro.message);
        }
    });
}

iniciarRobo();

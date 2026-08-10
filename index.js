const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const axios = require('axios');

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwgJSu-r7LTJ1-nf2F0_KZNx3-dCVeYJfaMxuUsSV-3njvGjWbq7BqJfMtPSFVAnUQ7/exec'; // <-- COLE SEU WEBHOOK DO APPS SCRIPT AQUI

async function iniciarRobo() {
    // Sistema para salvar a sessão e não pedir QR Code toda hora
    const { state, saveCreds } = await useMultiFileAuthState('sessao_whatsapp');

    // Motor levíssimo, sem Google Chrome
    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        browser: ['Robo GM VCA', 'Chrome', '1.0.0']
    });

    // Monitora a conexão e gera o QR Code
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            const linkDaImagem = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr);
            console.log('====================================================');
            console.log('CLIQUE NO LINK ABAIXO PARA ABRIR A IMAGEM DO QR CODE:');
            console.log(linkDaImagem);
            console.log('====================================================');
        }
        
        if (connection === 'close') {
            const tentarReconectar = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (tentarReconectar) iniciarRobo();
        } else if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp com sucesso (Modo Leve)! Escutando...');
        }
    });

    // Salva as credenciais da conexão
    sock.ev.on('creds.update', saveCreds);

    // Ouve a chegada de mensagens
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        
        // Ignora mensagens próprias ou vazias
        if (!msg.message || msg.key.fromMe) return;

        const deOndeVeio = msg.key.remoteJid;
        
        // Trava 1: Garante que é grupo
        if (!deOndeVeio.endsWith('@g.us')) return;

        try {
            // Pega o nome do grupo
            const metadadosGrupo = await sock.groupMetadata(deOndeVeio);
            const nomeGrupo = metadadosGrupo.subject;

            // Trava 2: Lista dos seus grupos autorizados
            const gruposPermitidos = ['COORDENAÇÃO DE ÁREA', 'SUPERVISÃO DE OPERAÇÕES - GM', 'TESTE GM'];
            if (!gruposPermitidos.includes(nomeGrupo)) return;

            // Pega o texto (funciona para mensagens curtas ou longas)
            const texto = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!texto) return;

            // Monta os dados
            const remetente = `${nomeGrupo} (${msg.key.participant})`;
            const dados = {
                remetente: remetente,
                mensagem: texto
            };

            // Dispara pro Google Sheets
            await axios.post(WEBHOOK_URL, dados);
            console.log(`🚀 Ocorrência enviada! Grupo: ${nomeGrupo}`);

        } catch (erro) {
            console.log('Erro ao ler grupo:', erro.message);
        }
    });
}

iniciarRobo();

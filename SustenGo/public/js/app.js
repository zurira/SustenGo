const API_KEY = ""; 
const SOROBAN_CONTRACT_ID = ""; 
const RPC_URL = "https://soroban-testnet.stellar.org:443"; 
const FOUNDATION_KEY = "FOUND_CANC";
const MUSEUM_KEY = "MUSEUM_T";     

let map;
let marker;
let watchId = null;
let userAccount = null; 
let selectedExperience = null; 
let userState = {
    connected: false,
    balance: 250,
    experiences: 3,
    nfts: 1
};

const sorobanClient = {
    invoke: async (method, args) => {
        console.log(`[SOROBAN MOCK] Invocando método: ${method} con argumentos:`, args);
        await new Promise(resolve => setTimeout(resolve, 1500)); 

        if (method === 'balance') return userState.balance;
        
        return { hash: 'TX_SIMULADO_' + Math.random().toString(36).substring(2, 9) };
    }
};

const elements = {
    walletInfo: document.getElementById('walletInfo'),
    connectWalletBtn: document.getElementById('connectWallet'),
    experiencesGrid: document.getElementById('experiencesGrid'),
    totalSUSC: document.getElementById('totalSUSC'),
    completedExperiences: document.getElementById('completedExperiences'),
    impactNFTs: document.getElementById('impactNFTs'),
    startTrackingBtn: document.getElementById('startTrackingBtn'),
    // Modales
    experienceModal: document.getElementById('experienceModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    statusModal: document.getElementById('statusModal'), // Nuevo
    statusModalTitle: document.getElementById('statusModalTitle'), // Nuevo
    statusModalBody: document.getElementById('statusModalBody'), // Nuevo
    statusModalBtn: document.getElementById('statusModalBtn'), // Nuevo
};


function showModal(modalElement) {
    modalElement.style.display = 'flex';
}

function hideModal(modalElement) {
    modalElement.style.display = 'none';
}

/**
 * @param {string} title 
 * @param {string} message 
 * @param {string} type 
 */
function showStatusModal(title, message, type = 'info') {
    elements.statusModalTitle.textContent = title;
    elements.statusModalBody.innerHTML = `<p style="font-size: 1.1rem; text-align: center;">${message}</p>`;
    
    let color = '';
    switch (type) {
        case 'success': color = 'var(--primary)'; break;
        case 'error': color = 'red'; break;
        case 'info': color = 'var(--accent)'; break;
    }
    elements.statusModalTitle.style.color = color;
    
    showModal(elements.statusModal);
}

window.openExperienceModal = (expId) => {
    const exp = sustainableExperiences.find(e => e.id === expId);
    if (!exp) return;

    elements.modalTitle.textContent = exp.name;
    elements.modalBody.innerHTML = `
        <p><strong>Recompensa:</strong> ${exp.tokensEarned} SUSC</p>
        <p><strong>Destino de Verificación:</strong> ${exp.destination.name}</p>
        <p>${exp.description}</p>
        <p style="margin-top: 15px; color: var(--primary);">Selecciona esta experiencia y presiona "Iniciar Rastreo" en la sección de Rastreo para empezar a ganar tokens.</p>
    `;
    showModal(elements.experienceModal);
};

// conexión de wallet ---

async function connectWallet() {
    if (userState.connected) {
    
        userState.connected = false;
        userAccount = null;
        updateUI();
        showStatusModal('Wallet Desconectada', 'Tu sesión se cerró con éxito.', 'info');
        return;
    }
    
    if (window.freighter) {
        showStatusModal('Conectando...', 'Esperando confirmación en Freighter Wallet...', 'info');
        try {
            const publicKey = await window.freighter.getPublicKey();
            userAccount = publicKey;
            userState.connected = true;
            hideModal(elements.statusModal);
            
            await fetchUserBalance();
            updateUI();
            showStatusModal('Conexión Exitosa', `Wallet conectada: ${userAccount.substring(0, 7)}...`, 'success');
            return;
        } catch (error) {
            hideModal(elements.statusModal);
            showStatusModal('Error de Conexión', "Fallo la conexión con Freighter. Asegúrate de tenerla instalada.", 'error');
        }
    } else {
        showStatusModal('Error', "Instala Freighter Wallet para usar la aplicación. Usaremos simulación.", 'error');
        userAccount = "GABCTESTACCOUNTKEY..."; 
        userState.connected = true;
        await fetchUserBalance();
        updateUI();
    }
}

async function fetchUserBalance() {
    if (!userState.connected) return;
    try {
        const balance = await sorobanClient.invoke('balance', [userAccount]);
        userState.balance = balance; 
    } catch (e) {
        console.error("Error al obtener balance de Soroban:", e);
    }
}


function startTripTracking() {
    if (!userState.connected || !selectedExperience) {
        alert('🚨 Conecta tu wallet y selecciona una experiencia.');
        return;
    }
    
    if (!navigator.geolocation) {
        showStatusModal('Error de Geolocalización', 'Tu navegador no soporta el rastreo GPS necesario.', 'error');
        return;
    }

    const destination = selectedExperience.destination;
    const tokens = selectedExperience.tokensEarned;
    const destinationCoords = { lat: parseFloat(destination.lat), lng: parseFloat(destination.lng) };
    


    showStatusModal(
        'Rastreo Iniciado 🚀', 
        `Moviéndote hacia ${destination.name}. El sistema acuñará ${tokens} SUSC al llegar a 100m.`, 
        'info'
    );
    
    setTimeout(async () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);

        await sorobanClient.invoke('issue_reward', [userAccount, tokens, selectedExperience.id]);
        
        userState.balance += tokens;
        userState.experiences += 1;
        selectedExperience = null; 
        updateUI();
        
        showStatusModal('¡Experiencia Completa! 🎉', `Has llegado a ${destination.name} y ganado ${tokens} $SUSC$.`, 'success');
    }, 15000);
}


window.redeemTicket = async (ticketType, amount) => {
    if (!userState.connected || userState.balance < amount) {
        showStatusModal('Error de Saldo', `Necesitas ${amount} SUSC para canjear esto.`, 'error');
        return;
    }
    
    showStatusModal('Procesando Canje', 'Enviando transacción a la red Soroban...', 'info');
    try {
        await sorobanClient.invoke('burn_for_ticket', [userAccount, amount, ticketType]);
        
        userState.balance -= amount;
        updateUI();
        showStatusModal('¡Canje Exitoso! 🎫', `Se han quemado ${amount} SUSC. Tu código de canje simulado es: **CODE-${Math.floor(Math.random() * 9000) + 1000}**`, 'success');
    } catch (e) {
        showStatusModal('Error de Transacción', 'No se pudo completar el canje. Intenta de nuevo.', 'error');
    }
}

window.donateToFoundation = async (foundationKey, amount) => {
    if (!userState.connected || amount <= 0 || isNaN(amount) || userState.balance < amount) {
        showStatusModal('Error de Donación', 'Verifica el monto y tu saldo.', 'error');
        return;
    }
    
    showStatusModal('Procesando Donación', 'Enviando transferencia a la fundación...', 'info');
    try {
        await sorobanClient.invoke('donate', [userAccount, amount, foundationKey]);

        userState.balance -= amount;
        updateUI();
        showStatusModal('¡Donación Exitosa! 💚', `Gracias por donar ${amount} SUSC. Tu impacto es visible en Blockchain.`, 'success');
    } catch (e) {
        showStatusModal('Error de Transacción', 'No se pudo completar la donación. Intenta de nuevo.', 'error');
    }
}

window.mintNFT = async (nftType) => {
}


document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('closeStatusModal').addEventListener('click', () => hideModal(elements.statusModal));
    elements.statusModalBtn.addEventListener('click', () => hideModal(elements.statusModal));
});
document.addEventListener('DOMContentLoaded', () => {
    // 连接到Socket.IO服务器
    const socket = io('http://localhost:3000'); // 在生产环境中替换为实际的服务器地址
    
    // 获取DOM元素
    const playersList = document.getElementById('players');
    const communityCards = document.querySelector('.community-cards');
    const playerHand = document.getElementById('player-hand');
    const potAmount = document.getElementById('pot-amount');
    const currentStage = document.getElementById('current-stage');
    const playerChips = document.getElementById('player-chips');
    const betButton = document.getElementById('bet-button');
    const foldButton = document.getElementById('fold-button');
    const startGameButton = document.getElementById('start-game');
    const betAmountInput = document.getElementById('bet-amount');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendMessageButton = document.getElementById('send-message');
    
    // 游戏状态
    let playerName = prompt('请输入你的玩家名称:');
    let player = { name: playerName, chips: 1000, hand: [] };
    let gameRunning = false;
    
    // 加入游戏
    socket.emit('join_game', { name: playerName });
    
    // 监听游戏状态更新
    socket.on('game_state', (data) => {
        updateGameUI(data);
    });
    
    // 监听聊天消息
    socket.on('chat_message', (message) => {
        addChatMessage(message);
    });
    
    // 更新游戏UI
    function updateGameUI(gameState) {
        // 更新玩家列表
        playersList.innerHTML = '';
        gameState.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = `${player.name}: ${player.chips} 筹码`;
            playersList.appendChild(li);
        });
        
        // 更新公共牌
        communityCards.innerHTML = '';
        gameState.communityCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.textContent = formatCard(card);
            communityCards.appendChild(cardElement);
        });
        
        // 更新玩家手牌
        playerHand.innerHTML = '';
        gameState.currentPlayer.hand.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.textContent = formatCard(card);
            playerHand.appendChild(cardElement);
        });
        
        // 更新底池和当前阶段
        potAmount.textContent = gameState.pot;
        currentStage.textContent = gameState.currentStage;
        
        // 更新玩家筹码
        playerChips.textContent = gameState.currentPlayer.chips;
        
        // 更新按钮状态
        if (gameState.currentPlayerTurn) {
            betButton.disabled = false;
            foldButton.disabled = false;
            betAmountInput.disabled = false;
        } else {
            betButton.disabled = true;
            foldButton.disabled = true;
            betAmountInput.disabled = true;
        }
    }
    
    // 格式化牌面显示
    function formatCard(card) {
        const rankMap = {
            '1': 'A',
            '11': 'J',
            '12': 'Q',
            '13': 'K'
        };
        const suitMap = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
        };
        
        const [rank, suit] = card.split(' ');
        const formattedRank = rankMap[rank] || rank;
        const formattedSuit = suitMap[suit.toLowerCase()] || suit;
        
        return `${formattedRank}${formattedSuit}`;
    }
    
    // 添加聊天消息
    function addChatMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // 事件监听器
    betButton.addEventListener('click', () => {
        const amount = parseInt(betAmountInput.value);
        if (!isNaN(amount) && amount > 0) {
            socket.emit('place_bet', { amount });
            betAmountInput.value = '';
        }
    });
    
    foldButton.addEventListener('click', () => {
        socket.emit('fold');
    });
    
    startGameButton.addEventListener('click', () => {
        socket.emit('start_game');
    });
    
    sendMessageButton.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
            socket.emit('chat_message', { sender: playerName, text: message });
            chatInput.value = '';
        }
    });
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessageButton.click();
        }
    });
});
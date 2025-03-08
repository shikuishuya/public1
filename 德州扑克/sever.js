const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// 创建Express应用和HTTP服务器
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 游戏状态
let gameState = {
    players: [],
    communityCards: [],
    pot: 0,
    currentStage: '等待玩家加入',
    currentPlayerTurn: null,
    currentPlayer: null
};

// Socket.IO连接处理
io.on('connection', (socket) => {
    console.log('新玩家连接');
    
    // 处理玩家加入
    socket.on('join_game', (data) => {
        const existingPlayer = gameState.players.find(p => p.name === data.name);
        if (existingPlayer) {
            socket.emit('error', { message: '玩家名称已存在' });
            return;
        }
        
        const newPlayer = {
            id: socket.id,
            name: data.name,
            chips: 1000,
            hand: [],
            folded: false
        };
        
        gameState.players.push(newPlayer);
        io.emit('game_state', gameState);
        
        console.log(`玩家 ${data.name} 加入游戏`);
    });
    
    // 处理开始游戏
    socket.on('start_game', () => {
        if (gameState.players.length < 2) {
            socket.emit('error', { message: '至少需要两名玩家才能开始游戏' });
            return;
        }
        
        // 初始化新游戏
        initializeNewGame();
        io.emit('game_state', gameState);
    });
    
    // 处理下注
    socket.on('place_bet', (data) => {
        const player = gameState.players.find(p => p.id === socket.id);
        if (!player || player.folded) {
            return;
        }
        
        if (data.amount > player.chips) {
            socket.emit('error', { message: '筹码不足' });
            return;
        }
        
        player.chips -= data.amount;
        gameState.pot += data.amount;
        
        // 简化的轮流逻辑
        const currentPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
        const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
        gameState.currentPlayerTurn = gameState.players[nextPlayerIndex].id;
        gameState.currentPlayer = player;
        
        io.emit('game_state', gameState);
    });
    
    // 处理弃牌
    socket.on('fold', () => {
        const player = gameState.players.find(p => p.id === socket.id);
        if (player) {
            player.folded = true;
            
            // 检查是否所有玩家都已弃牌
            const activePlayers = gameState.players.filter(p => !p.folded);
            if (activePlayers.length === 1) {
                // 剩下的玩家获胜
                activePlayers[0].chips += gameState.pot;
                gameState.pot = 0;
                gameState.currentStage = '游戏结束';
            } else {
                // 继续游戏
                const currentPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
                let nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
                while (gameState.players[nextPlayerIndex].folded) {
                    nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
                }
                gameState.currentPlayerTurn = gameState.players[nextPlayerIndex].id;
            }
            
            io.emit('game_state', gameState);
        }
    });
    
    // 处理聊天消息
    socket.on('chat_message', (data) => {
        const message = `[${new Date().toLocaleTimeString()}] ${data.sender}: ${data.text}`;
        io.emit('chat_message', message);
    });
    
    // 断开连接
    socket.on('disconnect', () => {
        const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            gameState.players.splice(playerIndex, 1);
            io.emit('game_state', gameState);
            console.log(`玩家 ${socket.id} 离开游戏`);
        }
    });
});

// 初始化新游戏
function initializeNewGame() {
    gameState.communityCards = [];
    gameState.pot = 0;
    gameState.currentStage = '前置注';
    gameState.currentPlayerTurn = gameState.players[0].id;
    
    // 发牌
    const deck = createDeck();
    shuffleDeck(deck);
    
    gameState.players.forEach(player => {
        player.hand = [deck.pop(), deck.pop()];
        player.folded = false;
    });
    
    // 发三张公共牌
    for (let i = 0; i < 3; i++) {
        gameState.communityCards.push(deck.pop());
    }
}

// 创建牌组
function createDeck() {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const deck = [];
    
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(`${rank} ${suit}`);
        }
    }
    
    return deck;
}

// 洗牌
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
// 游戏配置
const config = {
    rows: 8,
    cols: 6,
    types: 5, // Chiikawa角色类型数量
    initialTime: 60,
    matchScore: 10, // 每消除一个图标得分
    comboBonus: 5 // 连击奖励分数
};

// 游戏状态
let gameState = {
    score: 0,
    timeLeft: config.initialTime,
    isPlaying: false,
    selectedTile: null,
    board: [],
    timer: null,
    comboCount: 0
};

// DOM元素
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const playAgainButton = document.getElementById('play-again-button');

// 初始化游戏
function initGame() {
    // 重置游戏状态
    gameState.score = 0;
    gameState.timeLeft = config.initialTime;
    gameState.isPlaying = false;
    gameState.selectedTile = null;
    gameState.comboCount = 0;
    
    // 更新UI
    scoreElement.textContent = gameState.score;
    timeElement.textContent = gameState.timeLeft;
    
    // 清空游戏板
    gameBoard.innerHTML = '';
    
    // 创建游戏板
    createBoard();
    
    // 隐藏游戏结束屏幕
    gameOverScreen.style.display = 'none';
}

// 创建游戏板
function createBoard() {
    gameState.board = [];
    
    // 设置游戏板网格列数
    gameBoard.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
    
    // 创建初始游戏板，确保没有初始匹配
    for (let row = 0; row < config.rows; row++) {
        gameState.board[row] = [];
        for (let col = 0; col < config.cols; col++) {
            let type;
            do {
                type = Math.floor(Math.random() * config.types) + 1;
            } while (
                // 检查水平方向是否有两个相同类型
                (col >= 2 && 
                 gameState.board[row][col-1] === type && 
                 gameState.board[row][col-2] === type) ||
                // 检查垂直方向是否有两个相同类型
                (row >= 2 && 
                 gameState.board[row-1][col] === type && 
                 gameState.board[row-2][col] === type)
            );
            
            gameState.board[row][col] = type;
            
            // 创建瓦片元素
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.row = row;
            tile.dataset.col = col;
            
            // 添加Chiikawa图片
            const img = document.createElement('img');
            img.src = `./images/chiikawa${type}.png`;
            img.alt = `Chiikawa ${type}`;
            tile.appendChild(img);
            
            // 添加点击事件
            tile.addEventListener('click', handleTileClick);
            
            gameBoard.appendChild(tile);
        }
    }
}

// 处理瓦片点击
function handleTileClick(event) {
    if (!gameState.isPlaying) return;
    
    const tile = event.currentTarget;
    const row = parseInt(tile.dataset.row);
    const col = parseInt(tile.dataset.col);
    
    // 如果已经有选中的瓦片
    if (gameState.selectedTile) {
        const selectedRow = parseInt(gameState.selectedTile.dataset.row);
        const selectedCol = parseInt(gameState.selectedTile.dataset.col);
        
        // 检查是否是相邻的瓦片
        if (isAdjacent(row, col, selectedRow, selectedCol)) {
            // 交换瓦片
            swapTiles(row, col, selectedRow, selectedCol);
            
            // 取消选中
            gameState.selectedTile.classList.remove('selected');
            gameState.selectedTile = null;
        } else {
            // 选择新的瓦片
            gameState.selectedTile.classList.remove('selected');
            tile.classList.add('selected');
            gameState.selectedTile = tile;
        }
    } else {
        // 选中瓦片
        tile.classList.add('selected');
        gameState.selectedTile = tile;
    }
}

// 检查两个瓦片是否相邻
function isAdjacent(row1, col1, row2, col2) {
    return (
        (Math.abs(row1 - row2) === 1 && col1 === col2) || // 垂直相邻
        (Math.abs(col1 - col2) === 1 && row1 === row2)    // 水平相邻
    );
}

// 交换瓦片
// 游戏状态历史记录
let gameStateHistory = [];

function saveGameState() {
    // 深拷贝当前游戏状态
    const stateCopy = JSON.parse(JSON.stringify(gameState));
    gameStateHistory.push(stateCopy);
    
    // 限制历史记录数量
    if (gameStateHistory.length > 10) {
        gameStateHistory.shift();
    }
}

function undoLastMove() {
    if (gameStateHistory.length > 0) {
        gameState = gameStateHistory.pop();
        updateBoardUI();
    }
}

function forceSwap(row1, col1, row2, col2) {
    // 强制交换，不检查匹配
    const temp = gameState.board[row1][col1];
    gameState.board[row1][col1] = gameState.board[row2][col2];
    gameState.board[row2][col2] = temp;
    
    updateBoardUI();
    
    // 检查匹配
    setTimeout(() => {
        checkMatches();
    }, 300);
}

function explodeTile(row, col) {
    // 清除3x3范围内的元素
    for (let r = Math.max(0, row-1); r <= Math.min(config.rows-1, row+1); r++) {
        for (let c = Math.max(0, col-1); c <= Math.min(config.cols-1, col+1); c++) {
            gameState.board[r][c] = 0; // 0表示空
        }
    }
    
    updateBoardUI();
    
    // 检查匹配
    setTimeout(() => {
        checkMatches();
    }, 300);
}

function swapTiles(row1, col1, row2, col2) {
    // 交换数据
    const temp = gameState.board[row1][col1];
    gameState.board[row1][col1] = gameState.board[row2][col2];
    gameState.board[row2][col2] = temp;
    
    // 更新UI
    updateBoardUI();
    
    // 检查是否有匹配
    setTimeout(() => {
        if (!checkMatches()) {
            // 如果没有匹配，交换回来
            const temp = gameState.board[row1][col1];
            gameState.board[row1][col1] = gameState.board[row2][col2];
            gameState.board[row2][col2] = temp;
            
            // 更新UI
            updateBoardUI();
        }
    }, 300);
}

// 更新游戏板UI
function updateBoardUI() {
    const tiles = document.querySelectorAll('.tile');
    
    tiles.forEach(tile => {
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        const type = gameState.board[row][col];
        
        // 更新图片
        const img = tile.querySelector('img');
        img.src = `./images/chiikawa${type}.png`;
        img.alt = `Chiikawa ${type}`;
    });
}

// 检查是否有匹配
function checkMatches() {
    let hasMatches = false;
    let matchedTiles = new Set();
    
    // 检查水平匹配
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols - 2; col++) {
            const type = gameState.board[row][col];
            if (type !== 0 && 
                type === gameState.board[row][col+1] && 
                type === gameState.board[row][col+2]) {
                
                hasMatches = true;
                matchedTiles.add(`${row},${col}`);
                matchedTiles.add(`${row},${col+1}`);
                matchedTiles.add(`${row},${col+2}`);
                
                // 检查是否有更长的匹配
                let nextCol = col + 3;
                while (nextCol < config.cols && gameState.board[row][nextCol] === type) {
                    matchedTiles.add(`${row},${nextCol}`);
                    nextCol++;
                }
            }
        }
    }
    
    // 检查垂直匹配
    for (let col = 0; col < config.cols; col++) {
        for (let row = 0; row < config.rows - 2; row++) {
            const type = gameState.board[row][col];
            if (type !== 0 && 
                type === gameState.board[row+1][col] && 
                type === gameState.board[row+2][col]) {
                
                hasMatches = true;
                matchedTiles.add(`${row},${col}`);
                matchedTiles.add(`${row+1},${col}`);
                matchedTiles.add(`${row+2},${col}`);
                
                // 检查是否有更长的匹配
                let nextRow = row + 3;
                while (nextRow < config.rows && gameState.board[nextRow][col] === type) {
                    matchedTiles.add(`${nextRow},${col}`);
                    nextRow++;
                }
            }
        }
    }
    
    // 如果有匹配，移除匹配的瓦片并更新分数
    if (hasMatches) {
        // 增加连击计数
        gameState.comboCount++;
        
        // 计算得分
        const matchCount = matchedTiles.size;
        const comboBonus = (gameState.comboCount > 1) ? (gameState.comboCount - 1) * config.comboBonus : 0;
        const scoreGain = matchCount * config.matchScore + comboBonus;
        
        gameState.score += scoreGain;
        scoreElement.textContent = gameState.score;
        
        // 显示匹配动画
        showMatchAnimation(matchedTiles);
        
        // 移除匹配的瓦片
        setTimeout(() => {
            removeMatches(matchedTiles);
        }, 300);
        
        return true;
    } else {
        // 重置连击计数
        gameState.comboCount = 0;
        return false;
    }
}

// 显示匹配动画
function showMatchAnimation(matchedTiles) {
    const tiles = document.querySelectorAll('.tile');
    
    tiles.forEach(tile => {
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        const key = `${row},${col}`;
        
        if (matchedTiles.has(key)) {
            tile.classList.add('matched');
        }
    });
}

// 移除匹配的瓦片
function removeMatches(matchedTiles) {
    // 移除匹配的瓦片
    matchedTiles.forEach(key => {
        const [row, col] = key.split(',').map(Number);
        gameState.board[row][col] = 0; // 0表示空位
    });
    
    // 下落瓦片
    dropTiles();
    
    // 填充新的瓦片
    fillEmptyTiles();
    
    // 更新UI
    updateBoardUI();
    
    // 重置匹配的瓦片样式
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.classList.remove('matched');
    });
    
    // 检查是否有新的匹配
    setTimeout(() => {
        if (checkMatches()) {
            // 如果有新的匹配，继续消除
        } else {
            // 检查是否有可能的移动
            if (!hasPossibleMoves()) {
                // 如果没有可能的移动，重新生成游戏板
                reshuffleBoard();
            }
        }
    }, 300);
}

// 下落瓦片
function dropTiles() {
    for (let col = 0; col < config.cols; col++) {
        let emptyRow = -1;
        
        // 从底部向上遍历
        for (let row = config.rows - 1; row >= 0; row--) {
            if (gameState.board[row][col] === 0) {
                // 找到空位
                if (emptyRow === -1) {
                    emptyRow = row;
                }
            } else if (emptyRow !== -1) {
                // 找到瓦片，下落到空位
                gameState.board[emptyRow][col] = gameState.board[row][col];
                gameState.board[row][col] = 0;
                emptyRow--;
            }
        }
    }
}

// 填充空位
function fillEmptyTiles() {
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            if (gameState.board[row][col] === 0) {
                gameState.board[row][col] = Math.floor(Math.random() * config.types) + 1;
            }
        }
    }
}

// 检查是否有可能的移动
function hasPossibleMoves() {
    // 检查水平相邻交换
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols - 1; col++) {
            // 交换
            const temp = gameState.board[row][col];
            gameState.board[row][col] = gameState.board[row][col+1];
            gameState.board[row][col+1] = temp;
            
            // 检查是否有匹配
            const hasMatch = checkPotentialMatches();
            
            // 交换回来
            gameState.board[row][col+1] = gameState.board[row][col];
            gameState.board[row][col] = temp;
            
            if (hasMatch) return true;
        }
    }
    
    // 检查垂直相邻交换
    for (let row = 0; row < config.rows - 1; row++) {
        for (let col = 0; col < config.cols; col++) {
            // 交换
            const temp = gameState.board[row][col];
            gameState.board[row][col] = gameState.board[row+1][col];
            gameState.board[row+1][col] = temp;
            
            // 检查是否有匹配
            const hasMatch = checkPotentialMatches();
            
            // 交换回来
            gameState.board[row+1][col] = gameState.board[row][col];
            gameState.board[row][col] = temp;
            
            if (hasMatch) return true;
        }
    }
    
    return false;
}

// 检查潜在的匹配（不更新UI）
function checkPotentialMatches() {
    // 检查水平匹配
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols - 2; col++) {
            const type = gameState.board[row][col];
            if (type !== 0 && 
                type === gameState.board[row][col+1] && 
                type === gameState.board[row][col+2]) {
                return true;
            }
        }
    }
    
    // 检查垂直匹配
    for (let col = 0; col < config.cols; col++) {
        for (let row = 0; row < config.rows - 2; row++) {
            const type = gameState.board[row][col];
            if (type !== 0 && 
                type === gameState.board[row+1][col] && 
                type === gameState.board[row+2][col]) {
                return true;
            }
        }
    }
    
    return false;
}

// 重新洗牌游戏板
function reshuffleBoard() {
    // 创建新的游戏板
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            gameState.board[row][col] = Math.floor(Math.random() * config.types) + 1;
        }
    }
    
    // 确保没有初始匹配
    while (checkPotentialMatches()) {
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                gameState.board[row][col] = Math.floor(Math.random() * config.types) + 1;
            }
        }
    }
    
    // 确保有可能的移动
    if (!hasPossibleMoves()) {
        reshuffleBoard();
        return;
    }
    
    // 更新UI
    updateBoardUI();
}

// 开始游戏
function startGame() {
    if (gameState.isPlaying) return;
    
    gameState.isPlaying = true;
    
    // 启动计时器
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        timeElement.textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// 结束游戏
function endGame() {
    gameState.isPlaying = false;
    
    // 停止计时器
    clearInterval(gameState.timer);
    
    // 显示游戏结束屏幕
    finalScoreElement.textContent = gameState.score;
    gameOverScreen.style.display = 'flex';
}

// 事件监听器
startButton.addEventListener('click', () => {
    startGame();
});

restartButton.addEventListener('click', () => {
    // 停止当前游戏
    if (gameState.isPlaying) {
        clearInterval(gameState.timer);
    }
    
    // 初始化新游戏
    initGame();
});

playAgainButton.addEventListener('click', () => {
    // 初始化新游戏
    initGame();
});

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});
// 游戏配置
const config = {
    rows: 8,
    cols: 6,
    types: 5, // Chiikawa角色类型数量
    initialTime: 100,
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
    comboCount: 0,
    // 道具状态
    tools: {
        undo: {
            available: true,
            active: false
        },
        forceSwap: {
            available: true,
            active: false
        },
        explode: {
            available: true,
            active: false
        }
    },
    lastMove: null // 记录上一步操作
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

// 道具元素
const undoTool = document.getElementById('undo-tool');
const forceSwapTool = document.getElementById('force-swap-tool');
const explodeTool = document.getElementById('explode-tool');

// 初始化游戏
function initGame() {
    // 重置游戏状态
    gameState.score = 0;
    gameState.timeLeft = config.initialTime;
    gameState.isPlaying = false;
    gameState.selectedTile = null;
    gameState.comboCount = 0;
    gameState.lastMove = null;
    
    // 重置道具状态
    gameState.tools.undo.available = true;
    gameState.tools.undo.active = false;
    gameState.tools.forceSwap.available = true;
    gameState.tools.forceSwap.active = false;
    gameState.tools.explode.available = true;
    gameState.tools.explode.active = false;
    
    // 更新UI
    scoreElement.textContent = gameState.score;
    timeElement.textContent = gameState.timeLeft;
    
    // 清空游戏板
    gameBoard.innerHTML = '';
    
    // 创建游戏板
    createBoard();
    
    // 隐藏游戏结束屏幕
    gameOverScreen.style.display = 'none';
    
    // 更新道具UI
    updateToolsUI();
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
    
    // 检查是否有激活的道具
    if (gameState.tools.explode.active) {
        // 使用强制消除道具
        explodeTile(row, col);
        gameState.tools.explode.active = false;
        gameState.tools.explode.available = false;
        updateToolsUI();
        return;
    }
    
    // 如果已经有选中的瓦片
    if (gameState.selectedTile) {
        const selectedRow = parseInt(gameState.selectedTile.dataset.row);
        const selectedCol = parseInt(gameState.selectedTile.dataset.col);
        
        // 检查是否是相邻的瓦片
        if (isAdjacent(row, col, selectedRow, selectedCol)) {
            // 保存当前状态用于撤销
            saveCurrentState();
            
            // 检查是否使用强制交换道具
            if (gameState.tools.forceSwap.active) {
                // 强制交换瓦片，不检查是否匹配
                forceSwapTiles(row, col, selectedRow, selectedCol);
                gameState.tools.forceSwap.active = false;
                gameState.tools.forceSwap.available = false;
                updateToolsUI();
            } else {
                // 正常交换瓦片
                swapTiles(row, col, selectedRow, selectedCol);
            }
            
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
// 保存当前状态用于撤销
function saveCurrentState() {
    // 深拷贝当前游戏板状态
    const boardCopy = JSON.parse(JSON.stringify(gameState.board));
    gameState.lastMove = {
        board: boardCopy,
        score: gameState.score,
        comboCount: gameState.comboCount
    };
}

// 撤销上一步操作
function undoLastMove() {
    if (gameState.lastMove && gameState.tools.undo.available) {
        // 恢复游戏板状态
        gameState.board = gameState.lastMove.board;
        gameState.score = gameState.lastMove.score;
        gameState.comboCount = gameState.lastMove.comboCount;
        
        // 更新UI
        updateBoardUI();
        scoreElement.textContent = gameState.score;
        
        // 标记道具为已使用
        gameState.tools.undo.available = false;
        updateToolsUI();
    }
}

// 强制交换瓦片
function forceSwapTiles(row1, col1, row2, col2) {
    // 强制交换，不检查匹配
    const temp = gameState.board[row1][col1];
    gameState.board[row1][col1] = gameState.board[row2][col2];
    gameState.board[row2][col2] = temp;
    
    // 更新UI
    updateBoardUI();
    
    // 检查匹配
    setTimeout(() => {
        checkMatches();
    }, 300);
}

// 强制消除瓦片
function explodeTile(row, col) {
    // 清除3x3范围内的元素
    for (let r = Math.max(0, row-1); r <= Math.min(config.rows-1, row+1); r++) {
        for (let c = Math.max(0, col-1); c <= Math.min(config.cols-1, col+1); c++) {
            gameState.board[r][c] = 0; // 0表示空
        }
    }
    
    // 更新UI
    updateBoardUI();
    
    // 下落瓦片并填充空位
    setTimeout(() => {
        dropTiles();
        fillEmptyTiles();
        updateBoardUI();
        
        // 检查匹配
        setTimeout(() => {
            checkMatches();
        }, 300);
    }, 300);
}

// 更新道具UI
function updateToolsUI() {
    // 更新后退一步道具
    if (gameState.tools.undo.available) {
        undoTool.classList.remove('disabled');
        undoTool.querySelector('.tool-count').textContent = '1次';
    } else {
        undoTool.classList.add('disabled');
        undoTool.querySelector('.tool-count').textContent = '0次';
    }
    
    // 更新强制交换道具
    if (gameState.tools.forceSwap.available) {
        forceSwapTool.classList.remove('disabled');
        forceSwapTool.querySelector('.tool-count').textContent = '1次';
    } else {
        forceSwapTool.classList.add('disabled');
        forceSwapTool.querySelector('.tool-count').textContent = '0次';
    }
    
    // 更新强制消除道具
    if (gameState.tools.explode.available) {
        explodeTool.classList.remove('disabled');
        explodeTool.querySelector('.tool-count').textContent = '1次';
    } else {
        explodeTool.classList.add('disabled');
        explodeTool.querySelector('.tool-count').textContent = '0次';
    }
    
    // 更新激活状态
    undoTool.classList.toggle('active', gameState.tools.undo.active);
    forceSwapTool.classList.toggle('active', gameState.tools.forceSwap.active);
    explodeTool.classList.toggle('active', gameState.tools.explode.active);
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
// 排行榜数组
let highScores = [];

function endGame() {
    gameState.isPlaying = false;
    // 停止计时器
    clearInterval(gameState.timer);
    // 添加当前分数到排行榜
    highScores.push(gameState.score);
    highScores.sort((a, b) => b - a); // 降序排序
    highScores = highScores.slice(0, 5); // 只保留前5名
    // 判断是否新高
    let isNewRecord = gameState.score >= highScores[0];
    // 显示游戏结束屏幕
    finalScoreElement.textContent = gameState.score;
    // 更新排行榜显示
    const scoreList = document.getElementById('score-list');
    scoreList.innerHTML = highScores
        .map((score, index) => `<li>${index + 1}. ${score}</li>`)
        .join('');
    // 新高时触发礼花和表扬
    if(isNewRecord) {
        showConfetti();
        showPraise();
    }
    gameOverScreen.style.display = 'flex';
}
// 礼花动画函数
function showConfetti() {
    const confettiContainer = document.getElementById('confetti-container');
    confettiContainer.style.display = 'block';
    // 简单彩带动画
    for(let i=0;i<80;i++){
        let confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random()*100+'vw';
        confetti.style.background = `hsl(${Math.random()*360},100%,60%)`;
        confetti.style.animationDelay = Math.random()*0.5+'s';
        confettiContainer.appendChild(confetti);
    }
    setTimeout(()=>{
        confettiContainer.innerHTML = '';
        confettiContainer.style.display = 'none';
    }, 2500);
}
// 表扬语显示
function showPraise() {
    const gameOverContent = document.querySelector('.game-over-content');
    let praise = document.createElement('div');
    praise.className = 'praise-text';
    praise.innerText = '恭喜你创造新纪录！';
    gameOverContent.insertBefore(praise, gameOverContent.firstChild);
    setTimeout(()=>{
        praise.remove();
    }, 2500);
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

// 道具点击事件
undoTool.addEventListener('click', () => {
    if (!gameState.isPlaying || !gameState.tools.undo.available) return;
    
    // 取消其他道具的激活状态
    gameState.tools.forceSwap.active = false;
    gameState.tools.explode.active = false;
    
    // 直接使用撤销功能
    undoLastMove();
});

forceSwapTool.addEventListener('click', () => {
    if (!gameState.isPlaying || !gameState.tools.forceSwap.available) return;
    
    // 切换激活状态
    gameState.tools.forceSwap.active = !gameState.tools.forceSwap.active;
    
    // 取消其他道具的激活状态
    gameState.tools.undo.active = false;
    gameState.tools.explode.active = false;
    
    // 更新UI
    updateToolsUI();
});

explodeTool.addEventListener('click', () => {
    if (!gameState.isPlaying || !gameState.tools.explode.available) return;
    
    // 切换激活状态
    gameState.tools.explode.active = !gameState.tools.explode.active;
    
    // 取消其他道具的激活状态
    gameState.tools.undo.active = false;
    gameState.tools.forceSwap.active = false;
    
    // 更新UI
    updateToolsUI();
});

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});
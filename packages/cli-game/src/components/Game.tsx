/**
 * 游戏主组件 - 使用 Ink
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Game, ROT, TILES, RARITY_COLORS, ITEM_TYPE_ICONS } from '../game.js';
import { GameState, ItemType, CombatState } from '../types.js';

interface GameComponentProps {
  game: Game;
}

/** 颜色辅助函数 */
function hexToAnsi(hex: string): string {
  // 简单的颜色映射
  const colorMap: Record<string, string> = {
    '#000000': 'black',
    '#FFFFFF': 'white',
    '#FF0000': 'red',
    '#00FF00': 'green',
    '#0000FF': 'blue',
    '#FFFF00': 'yellow',
    '#FF00FF': 'magenta',
    '#00FFFF': 'cyan',
    '#808080': 'gray',
    '#A0A0A0': 'gray',
    '#1a1a1a': 'black',
    '#404040': 'black',
    '#8B4513': 'yellow',
    '#FFD700': 'yellow',
    '#32CD32': 'green',
    '#228B22': 'green',
    '#F5F5DC': 'white',
    '#800080': 'magenta',
    '#006400': 'green',
    '#008000': 'green',
    '#FF4500': 'red',
    '#4682B4': 'blue',
    '#9370DB': 'magenta',
    '#FF69B4': 'magenta',
    '#DC143C': 'red',
    '#4169E1': 'blue'
  };
  return colorMap[hex.toLowerCase()] || 'white';
}

/** 游戏主组件 */
export default function GameComponent({ game }: GameComponentProps) {
  const [tick, setTick] = useState(0);
  const { stdout } = useStdout();

  // 强制重新渲染
  const forceUpdate = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  // 初始化游戏更新回调
  useEffect(() => {
    const originalOnUpdate = (game as any).onUpdate;
    (game as any).onUpdate = () => {
      originalOnUpdate();
      forceUpdate();
    };
  }, [game, forceUpdate]);

  // 处理键盘输入
  useInput((input, key) => {
    let keyStr = input.toLowerCase();
    
    if (key.upArrow) keyStr = 'arrowup';
    if (key.downArrow) keyStr = 'arrowdown';
    if (key.leftArrow) keyStr = 'arrowleft';
    if (key.rightArrow) keyStr = 'arrowright';
    if (key.escape) keyStr = 'escape';
    if (key.tab) keyStr = 'tab';
    
    game.handleInput(keyStr);
  });

  const state = game.getState();
  const map = game.getMap();
  const player = game.getPlayer();
  const entities = game.getEntities();
  const messages = game.getMessages();
  const config = game.getConfig();

  // 计算视口
  const viewportWidth = Math.min(config.viewportWidth, stdout.columns - 22);
  const viewportHeight = Math.min(config.viewportHeight, stdout.rows - 6);
  
  const vpStartX = Math.max(0, Math.min(player.position.x - Math.floor(viewportWidth / 2), map.width - viewportWidth));
  const vpStartY = Math.max(0, Math.min(player.position.y - Math.floor(viewportHeight / 2), map.height - viewportHeight));
  const vpEndX = Math.min(map.width, vpStartX + viewportWidth);
  const vpEndY = Math.min(map.height, vpStartY + viewportHeight);

  // 渲染游戏结束画面
  if (game.isGameOver()) {
    useInput(() => {
      process.exit(0);
    });
    
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={stdout.rows}>
        <Text bold color="red">☠️ 游戏结束 ☠️</Text>
        <Box marginY={1}>
          <Text>你在地下城第 {game.getDungeonLevel()} 层倒下了</Text>
        </Box>
        <Text dimColor>回合数: {game.getTurn()}</Text>
        <Text dimColor>等级: {player.level}</Text>
        <Box marginTop={2}>
          <Text color="gray">按任意键退出...</Text>
        </Box>
      </Box>
    );
  }

  // 渲染战斗界面
  if (state === GameState.COMBAT) {
    return <CombatView game={game} />;
  }

  // 渲染背包界面
  if (state === GameState.INVENTORY) {
    return <InventoryView game={game} />;
  }
  
  // 渲染加点界面
  if (state === GameState.LEVEL_UP) {
    return <LevelUpView game={game} />;
  }

  // 渲染主游戏界面（探索模式）
  return (
    <Box flexDirection="column">
      {/* 状态栏 */}
      <Box>
        <StatusBar game={game} />
      </Box>

      {/* 主区域：地图 + 信息面板 */}
      <Box>
        {/* 地图区域 - 拼接成整行渲染，无间隔 */}
        <Box flexDirection="column" borderStyle="single">
          {Array.from({ length: vpEndY - vpStartY }, (_, row) => {
            const y = vpStartY + row;
            let line = '';
            let colors: string[] = [];
            
            for (let x = vpStartX; x < vpEndX; x++) {
              const isVisible = map.visible[x]?.[y];
              const isExplored = map.explored[x]?.[y];
              
              // 未探索区域显示为黑色块
              if (!isExplored) {
                line += '██';
                continue;
              }
              
              // 检查是否有实体 - 只在视野内显示
              const entity = entities.find(e => e.position.x === x && e.position.y === y);
              
              // 检查是否是玩家位置
              if (player.position.x === x && player.position.y === y) {
                line += '🧙';
                continue;
              }
              
              // 显示实体 - 只在视野内显示
              if (entity && isVisible) {
                line += entity.char;
                continue;
              }
              
              // 显示地图
              const tile = map.tiles[x][y];
              // 视野外显示为阴影，视野内正常显示
              if (!isVisible) {
                // 阴影区域：墙壁显示为暗色░░，地板显示为两个空格
                line += tile.walkable ? '  ' : '░░';
              } else {
                line += tile.char;
              }
            }
            
            return (
              <Box key={row}>
                <Text>{line}</Text>
              </Box>
            );
          })}
        </Box>

        {/* 右侧面板 */}
        <Box flexDirection="column" marginLeft={1} width={20}>
          <PlayerPanel player={player} game={game} />
        </Box>
      </Box>

      {/* 消息日志 */}
      <Box flexDirection="column" borderStyle="single" paddingX={1} marginTop={1} height={6}>
        <Text bold underline>消息</Text>
        {messages.slice(-5).map((msg, i) => (
          <Text key={i} color={hexToAnsi(msg.color)}>
            {msg.text.length > viewportWidth + 18 ? msg.text.slice(0, viewportWidth + 15) + '...' : msg.text}
          </Text>
        ))}
      </Box>

      {/* 控制提示 */}
      <Box marginTop={1}>
        <Text color="gray">
          [WASD/↑↓←→]移动 [E]互动/下楼梯 [G]拾取 [I]背包 [ESC]退出
        </Text>
      </Box>
    </Box>
  );
}

/** 状态栏组件 */
function StatusBar({ game }: { game: Game }) {
  const player = game.getPlayer();
  const level = game.getDungeonLevel();
  const inCombat = game.isInCombat();
  
  return (
    <Box width="100%" justifyContent="space-between" borderStyle="single" paddingX={1}>
      <Box>
        <Text color="yellow">🧙 {player.name}</Text>
        <Text> | 层: {level}</Text>
        <Text> | </Text>
        <Text color={inCombat ? 'red' : 'green'}>
          {inCombat ? '⚔️ 战斗中' : '🗺️ 探索中'}
        </Text>
      </Box>
      <Box>
        <Text color="green">HP: {player.hp}/{player.maxHp}</Text>
        <Text> | </Text>
        <Text color="blue">MP: {player.mp}/{player.maxMp}</Text>
        <Text> | </Text>
        <Text color="yellow">💰 {game.getGold()}</Text>
      </Box>
    </Box>
  );
}

/** 玩家信息面板 */
function PlayerPanel({ player, game }: { player: ReturnType<Game['getPlayer']>; game: Game }) {
  const equipment = game.getEquipment();
  const equipStats = getEquipmentStats(equipment);

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold underline>状态</Text>
      <Text>等级: {player.level}</Text>
      <Text>经验: {player.exp}/{player.maxExp}</Text>
      
      {player.statPoints > 0 && (
        <Text color="yellow" bold>⚡ 属性点: {player.statPoints}</Text>
      )}
      
      <Box marginY={1} />
      
      <Text bold underline>属性</Text>
      <Text>攻击: {player.baseAttack} <Text dimColor>(+{equipStats.attack})</Text> = {player.attack}</Text>
      <Text>防御: {player.baseDefense} <Text dimColor>(+{equipStats.defense})</Text> = {player.defense}</Text>
      <Text>速度: {equipStats.speed}</Text>
      <Text>暴击: {equipStats.critical}%</Text>
      
      <Box marginY={1} />
      
      <Text bold underline>装备</Text>
      <Text>武器: {equipment.weapon?.name || '-'}</Text>
      <Text>护甲: {equipment.armor?.name || '-'}</Text>
      <Text>头盔: {equipment.helmet?.name || '-'}</Text>
      <Text>盾牌: {equipment.shield?.name || '-'}</Text>
      <Text>戒指: {equipment.ring?.name || '-'}</Text>
    </Box>
  );
}

/** 背包视图 */
function InventoryView({ game }: { game: Game }) {
  const inventory = game.getInventory();
  const filteredItems = game.getFilteredInventory();
  const selectedIndex = game.getSelectedInventoryIndex();
  const filter = game.getInventoryFilter();
  const equipment = game.getEquipment();

  const filterNames: Record<string, string> = {
    [ItemType.WEAPON]: '武器',
    [ItemType.ARMOR]: '护甲',
    [ItemType.HELMET]: '头盔',
    [ItemType.SHIELD]: '盾牌',
    [ItemType.RING]: '戒指',
    [ItemType.CONSUMABLE]: '消耗品',
    [ItemType.MATERIAL]: '材料'
  };

  const selectedItem = filteredItems[selectedIndex];

  return (
    <Box flexDirection="column">
      <Text bold>📦 背包 {filter ? `(${filterNames[filter] || filter})` : '(全部)'}</Text>
      <Text color="gray">容量: {inventory.length}/30</Text>
      
      <Box marginTop={1}>
        {/* 物品列表 */}
        <Box flexDirection="column" width={35} borderStyle="single" paddingX={1}>
          {filteredItems.length === 0 ? (
            <Text color="gray">(空)</Text>
          ) : (
            filteredItems.map((slot, index) => {
              const isSelected = index === selectedIndex;
              const isEquipped = Object.values(equipment).some(e => e?.id === slot.item.id);
              const rarityColor = RARITY_COLORS[slot.item.rarity] || 'gray';
              
              return (
                <Box key={index}>
                  <Text color={isSelected ? 'cyan' : undefined}>
                    {isSelected ? '> ' : '  '}
                    <Text color={hexToAnsi(rarityColor)}>{ITEM_TYPE_ICONS[slot.item.type] || '📦'}</Text>
                    {' '}{slot.item.name}
                    {slot.quantity > 1 && <Text color="gray">{' x'}{slot.quantity}</Text>}
                    {isEquipped && <Text color="green"> {'[E]'}</Text>}
                  </Text>
                </Box>
              );
            })
          )}
        </Box>

        {/* 物品详情 */}
        <Box flexDirection="column" marginLeft={1} width={40} borderStyle="single" paddingX={1}>
          {selectedItem ? (
            <>
              <Text bold color={hexToAnsi(RARITY_COLORS[selectedItem.item.rarity] || 'white')}>
                {selectedItem.item.name}
              </Text>
              <Text color="gray">{selectedItem.item.description}</Text>
              
              {selectedItem.item.stats && (
                <Box marginY={1} flexDirection="column">
                  {Object.entries(selectedItem.item.stats).map(([stat, value]) => (
                    <Text key={stat} color="green">
                      +{value} {getStatName(stat)}
                    </Text>
                  ))}
                </Box>
              )}
              
              {selectedItem.item.effects && (
                <Box marginY={1} flexDirection="column">
                  {selectedItem.item.effects.map((effect, i) => (
                    <Text key={i} color="cyan">
                      {effect.type === 'heal' ? `恢复 ${effect.value} HP` : ''}
                      {effect.type === 'restore_mp' ? `恢复 ${effect.value} MP` : ''}
                    </Text>
                  ))}
                </Box>
              )}
            </>
          ) : (
            <Text color="gray">选择物品查看详情</Text>
          )}
        </Box>

        {/* 装备栏 */}
        <Box flexDirection="column" marginLeft={1} width={25} borderStyle="single" paddingX={1}>
          <Text bold underline>已装备</Text>
          <Text>武器: {equipment.weapon?.name || '-'}</Text>
          <Text>护甲: {equipment.armor?.name || '-'}</Text>
          <Text>头盔: {equipment.helmet?.name || '-'}</Text>
          <Text>盾牌: {equipment.shield?.name || '-'}</Text>
          <Text>戒指: {equipment.ring?.name || '-'}</Text>
        </Box>
      </Box>

      {/* 操作提示 */}
      <Box marginTop={1}>
        <Text color="gray">
          [↑↓]选择 [Tab]筛选 [U]使用 [E]装备 [D]丢弃 [I/ESC]关闭
        </Text>
      </Box>
    </Box>
  );
}

/** 获取属性名称 */
function getStatName(stat: string): string {
  const names: Record<string, string> = {
    attack: '攻击',
    defense: '防御',
    hp: '生命',
    mp: '法力',
    speed: '速度',
    critical: '暴击'
  };
  return names[stat] || stat;
}

/** 战斗视图 */
function CombatView({ game }: { game: Game }) {
  const player = game.getPlayer();
  const enemies = game.getCombatEnemies();
  const combatState = game.getCombatState();
  const messages = game.getMessages();
  const skills = game.getAvailableSkills();

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height={24}>
      <Text bold color="red">⚔️ 战斗 ⚔️</Text>
      
      <Box marginY={1}>
        <Text color={combatState === CombatState.PLAYER_TURN ? 'green' : 'gray'}>
          {combatState === CombatState.PLAYER_TURN ? '▶ 你的回合' : '⏳ 敌人回合'}
        </Text>
      </Box>

      {/* 战斗双方 */}
      <Box marginY={1}>
        <Box flexDirection="column" alignItems="center" marginRight={4}>
          <Text>🧙</Text>
          <Text>{player.name}</Text>
          <Text color="green">HP: {player.hp}/{player.maxHp}</Text>
          <Text color="blue">MP: {player.mp}/{player.maxMp}</Text>
          {/* 显示玩家buff */}
          {player.buffs.length > 0 && (
            <Box>
              {player.buffs.map((buff, i) => (
                <Text key={i} color="yellow" dimColor>
                  {buff.type === 'attack' ? '⚔️' : buff.type === 'defense' ? '🛡️' : '✨'}({buff.duration})
                </Text>
              ))}
            </Box>
          )}
        </Box>
        
        <Text>VS</Text>
        
        <Box flexDirection="column" alignItems="center" marginLeft={4}>
          {enemies.map((enemy, i) => (
            <Box key={i} flexDirection="column" alignItems="center">
              <Text>{enemy.char}</Text>
              <Text>{enemy.name}</Text>
              <Text color="red">HP: {enemy.hp}/{enemy.maxHp}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* 技能列表 */}
      {combatState === CombatState.PLAYER_TURN && (
        <Box marginTop={1} flexDirection="column" alignItems="center">
          <Text bold>技能</Text>
          <Box>
            {skills.slice(0, 4).map((skill, i) => {
              // 判断技能状态
              const isOnCooldown = skill.currentCooldown > 0;
              const isInsufficientMp = player.mp < skill.mpCost;
              const isAvailable = !isOnCooldown && !isInsufficientMp;
              
              // 根据状态选择颜色
              let statusColor = 'green';  // 可用
              let statusText = `${skill.mpCost}MP`;
              
              if (isOnCooldown) {
                statusColor = 'red';  // 冷却中
                statusText = `CD:${skill.currentCooldown}`;
              } else if (isInsufficientMp) {
                statusColor = 'yellow';  // 法力不足
                statusText = `!${skill.mpCost}MP`;
              }
              
              return (
                <Box key={i} marginX={1} flexDirection="column" alignItems="center">
                  <Text color={statusColor}>
                    [{i + 1}]{skill.icon} {skill.name}
                  </Text>
                  <Text color={statusColor} dimColor>
                    {statusText}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* 操作提示 */}
      {combatState === CombatState.PLAYER_TURN && (
        <Box marginTop={1}>
          <Text color="gray">
            [A]攻击 [D]防御 [1-4]技能 [I]物品 [R]撤退
          </Text>
        </Box>
      )}

      {/* 最近的消息 */}
      <Box flexDirection="column" marginTop={1} width={60}>
        {messages.slice(-3).map((msg, i) => (
          <Text key={i} color={hexToAnsi(msg.color)}>
            {msg.text}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

/** 加点界面 */
function LevelUpView({ game }: { game: Game }) {
  const player = game.getPlayer();
  const equipment = game.getEquipment();
  const equipStats = getEquipmentStats(equipment);
  
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height={24}>
      <Text bold color="#FFD700">🎉 升级！🎉</Text>
      
      <Box marginY={1}>
        <Text>当前等级: <Text bold color="yellow">{player.level}</Text></Text>
      </Box>
      
      <Box marginY={1} borderStyle="single" paddingX={2} paddingY={1}>
        <Text bold color="cyan">剩余属性点: {player.statPoints}</Text>
      </Box>
      
      <Box marginTop={1} flexDirection="column">
        <Text bold underline>选择要提升的属性：</Text>
        
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color="green">[1] ⚔️  攻击力</Text>
            <Text>  当前: {player.baseAttack} (装备+{equipStats.attack}) = {player.attack}</Text>
          </Box>
          <Text dimColor>    +2 攻击力</Text>
        </Box>
        
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color="blue">[2] 🛡️  防御力</Text>
            <Text>  当前: {player.baseDefense} (装备+{equipStats.defense}) = {player.defense}</Text>
          </Box>
          <Text dimColor>    +1 防御力</Text>
        </Box>
        
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color="red">[3] 💚  生命上限</Text>
            <Text>  当前: {player.baseMaxHp} (装备+{equipStats.hp}) = {player.maxHp}</Text>
          </Box>
          <Text dimColor>    +15 生命上限</Text>
        </Box>
        
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Text color="magenta">[4] 💙  法力上限</Text>
            <Text>  当前: {player.baseMaxMp} (装备+{equipStats.mp}) = {player.maxMp}</Text>
          </Box>
          <Text dimColor>    +10 法力上限</Text>
        </Box>
      </Box>
      
      <Box marginTop={2}>
        <Text color="gray">
          {player.statPoints > 0 ? '[1-4]分配点数 [Enter]确认' : '按任意键继续'}
        </Text>
      </Box>
    </Box>
  );
}

/** 获取装备属性统计 */
function getEquipmentStats(equipment: ReturnType<Game['getEquipment']>) {
  const stats = { attack: 0, defense: 0, hp: 0, mp: 0, speed: 0, critical: 0 };
  
  Object.values(equipment).forEach(item => {
    if (item?.stats) {
      stats.attack += item.stats.attack || 0;
      stats.defense += item.stats.defense || 0;
      stats.hp += item.stats.hp || 0;
      stats.mp += item.stats.mp || 0;
      stats.speed += item.stats.speed || 0;
      stats.critical += item.stats.critical || 0;
    }
  });
  
  return stats;
}

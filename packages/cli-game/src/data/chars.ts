/**
 * 字符定义 - 全部使用2字符宽度（emoji或双字符组合）
 */

/** 城镇瓦片 */
export const TOWN_CHARS = {
  // 地面 - 使用双字符方块
  GRASS: '░░',      // 绿色草地
  ROAD: '▓▓',       // 灰色道路
  PAVEMENT: '▒▒',   // 浅灰色人行道
  
  // 建筑
  HOUSE_WALL: '██',
  HOUSE_ROOF: '▓▓',
  SHOP_WALL: '██',
  INN_WALL: '██',
  DOOR: '🚪 ',      // emoji + 空格 = 2字符
  
  // 标识 - emoji都是2字符宽度
  SHOP_SIGN: '💰 ', // 钱袋 = 商店
  INN_SIGN: '🍺 ',  // 啤酒 = 旅馆
  BLACKSMITH_SIGN: '⚒️ ', // 锤子 = 铁匠
  TEMPLE_SIGN: '⛪ ', // 教堂 = 神殿
  HOUSE_SIGN: '🏠 ', // 房子 = 民居
  
  // 环境
  TREE: '🌲 ',      // 树 + 空格
  FENCE: '🚧 ',     // 栅栏
  WELL: '🕳️ ',      // 洞 = 井
  LAMP: '💡 ',      // 灯
  
  // 特殊
  EXIT: '⬇️ ',      // 向下箭头 = 地下城入口
};

/** 地下城瓦片 */
export const DUNGEON_CHARS = {
  WALL: '██',
  FLOOR: '░░',
  DOOR_CLOSED: '🚪 ',
  DOOR_OPEN: '⬛ ',
  STAIRS_DOWN: '⬇️ ',
  STAIRS_UP: '⬆️ ',
};

/** 室内瓦片 */
export const INTERIOR_CHARS = {
  FLOOR: '░░',
  WALL: '██',
  COUNTER: '🔲 ',
  DOOR: '🚪 ',
  TABLE: '🪑 ',
  CHAIR: '🪑 ',
  BED: '🛏️ ',
  CHEST: '📦 ',
  FIREPLACE: '🔥 ',
  SHELF: '📚 ',
};

/** 实体字符 - 全部使用emoji + 空格 */
export const ENTITY_CHARS = {
  // 玩家
  PLAYER: '🧙 ',     // 巫师
  
  // NPC
  VILLAGER: '👴 ',   // 老人
  MERCHANT: '👲 ',   // 商人
  INNKEEPER: '🧑‍🍳 ', // 厨师
  BLACKSMITH: '👨‍🏭 ', // 工人
  PRIEST: '👳 ',     // 头巾
  QUEST_GIVER: '🧝 ', // 精灵
  ELDER: '👴 ',
  ELDER_WOMAN: '👵 ',
  MAN: '👨 ',
  WOMAN: '👩 ',
  
  // 敌人
  SLIME: '🟢 ',      // 绿圆
  GOBLIN: '👺 ',     // 面具
  SKELETON: '💀 ',   // 骷髅
  BAT: '🦇 ',        // 蝙蝠
  ORC: '👹 ',        // 怪物
  TROLL: '🧌 ',      // 巨魔
  SPIDER: '🕷️ ',     // 蜘蛛
  SNAKE: '🐍 ',      // 蛇
  GHOST: '👻 ',      // 幽灵
  DRAGON: '🐉 ',     // 龙
  
  // 物品
  CHEST: '📦 ',
  SIGN: '📜 ',
};

/** 物品图标 */
export const ITEM_CHARS = {
  SWORD: '⚔️ ',
  AXE: '🪓 ',
  ARMOR: '🛡️ ',
  HELMET: '🪖 ',
  SHIELD: '🛡️ ',
  RING: '💍 ',
  POTION: '🧪 ',
  SCROLL: '📜 ',
  HERB: '🌿 ',
  ORE: '⛏️ ',
  MONEY: '💰 ',
  GEM: '💎 ',
};

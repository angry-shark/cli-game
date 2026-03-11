/**
 * 技能数据库
 */

import { Skill, SkillType } from './types.js';

/** 玩家技能数据库 */
export const PLAYER_SKILLS: Record<string, Skill> = {
  // 基础攻击技能
  'slash': {
    id: 'slash',
    name: '斩击',
    description: '强力的斩击，造成150%攻击力的伤害',
    type: SkillType.ATTACK,
    icon: '⚔️',
    effects: [{ type: 'damage', value: 1.5, target: 'enemy' }],
    cooldown: 2,
    currentCooldown: 0,
    mpCost: 5,
    power: 1.5
  },
  'power_attack': {
    id: 'power_attack',
    name: '重击',
    description: '蓄力重击，造成200%攻击力的伤害',
    type: SkillType.ATTACK,
    icon: '🔨',
    effects: [{ type: 'damage', value: 2.0, target: 'enemy' }],
    cooldown: 3,
    currentCooldown: 0,
    mpCost: 10,
    power: 2.0
  },
  
  // 治疗技能
  'first_aid': {
    id: 'first_aid',
    name: '急救',
    description: '恢复30点生命值',
    type: SkillType.HEAL,
    icon: '💚',
    effects: [{ type: 'heal', value: 30, target: 'self' }],
    cooldown: 3,
    currentCooldown: 0,
    mpCost: 8,
    power: 0
  },
  'heal': {
    id: 'heal',
    name: '治疗术',
    description: '恢复60点生命值',
    type: SkillType.HEAL,
    icon: '💗',
    effects: [{ type: 'heal', value: 60, target: 'self' }],
    cooldown: 5,
    currentCooldown: 0,
    mpCost: 15,
    power: 0
  },
  
  // Buff技能
  'focus': {
    id: 'focus',
    name: '专注',
    description: '3回合内攻击力+50%',
    type: SkillType.BUFF,
    icon: '🔥',
    effects: [{ type: 'buff_attack', value: 0.5, duration: 3, target: 'self' }],
    cooldown: 6,
    currentCooldown: 0,
    mpCost: 12,
    power: 0
  },
  'iron_skin': {
    id: 'iron_skin',
    name: '铁壁',
    description: '3回合内防御力+100%',
    type: SkillType.BUFF,
    icon: '🛡️',
    effects: [{ type: 'buff_defense', value: 1.0, duration: 3, target: 'self' }],
    cooldown: 6,
    currentCooldown: 0,
    mpCost: 12,
    power: 0
  },
  
  // 特殊技能
  'double_strike': {
    id: 'double_strike',
    name: '二连击',
    description: '快速攻击两次，每次造成80%伤害',
    type: SkillType.ATTACK,
    icon: '⚡',
    effects: [
      { type: 'damage', value: 0.8, target: 'enemy' },
      { type: 'damage', value: 0.8, target: 'enemy' }
    ],
    cooldown: 4,
    currentCooldown: 0,
    mpCost: 15,
    power: 1.6
  },
  'fireball': {
    id: 'fireball',
    name: '火球术',
    description: '发射火球，造成250%伤害并有几率眩晕',
    type: SkillType.ATTACK,
    icon: '🔥',
    effects: [
      { type: 'damage', value: 2.5, target: 'enemy' },
      { type: 'stun', value: 1, duration: 1, target: 'enemy' }
    ],
    cooldown: 5,
    currentCooldown: 0,
    mpCost: 20,
    power: 2.5
  }
};

/** 敌人技能数据库 */
export const ENEMY_SKILLS: Record<string, Skill> = {
  'slime_split': {
    id: 'slime_split',
    name: '黏液喷溅',
    description: '喷出腐蚀性黏液',
    type: SkillType.ATTACK,
    icon: '💧',
    effects: [{ type: 'damage', value: 1.2, target: 'enemy' }],
    cooldown: 3,
    currentCooldown: 0,
    mpCost: 0,
    power: 1.2
  },
  'goblin_stab': {
    id: 'goblin_stab',
    name: '偷袭',
    description: '从背后偷袭',
    type: SkillType.ATTACK,
    icon: '🗡️',
    effects: [{ type: 'damage', value: 1.5, target: 'enemy' }],
    cooldown: 4,
    currentCooldown: 0,
    mpCost: 0,
    power: 1.5
  },
  'skeleton_bash': {
    id: 'skeleton_bash',
    name: '骨击',
    description: '用骨头猛击',
    type: SkillType.ATTACK,
    icon: '💀',
    effects: [{ type: 'damage', value: 1.3, target: 'enemy' }],
    cooldown: 3,
    currentCooldown: 0,
    mpCost: 0,
    power: 1.3
  },
  'orc_roar': {
    id: 'orc_roar',
    name: '战吼',
    description: '发出恐怖战吼，攻击力提升',
    type: SkillType.BUFF,
    icon: '📢',
    effects: [{ type: 'buff_attack', value: 0.3, duration: 3, target: 'self' }],
    cooldown: 5,
    currentCooldown: 0,
    mpCost: 0,
    power: 0
  },
  'troll_regen': {
    id: 'troll_regen',
    name: '再生',
    description: '巨魔的伤口愈合能力',
    type: SkillType.HEAL,
    icon: '🌿',
    effects: [{ type: 'heal', value: 20, target: 'self' }],
    cooldown: 4,
    currentCooldown: 0,
    mpCost: 0,
    power: 0
  },
  'dragon_breath': {
    id: 'dragon_breath',
    name: '龙息',
    description: '喷出毁灭性的火焰',
    type: SkillType.ATTACK,
    icon: '🔥',
    effects: [{ type: 'damage', value: 3.0, target: 'enemy' }],
    cooldown: 6,
    currentCooldown: 0,
    mpCost: 0,
    power: 3.0
  },
  'venom_bite': {
    id: 'venom_bite',
    name: '毒牙',
    description: '注入毒液',
    type: SkillType.ATTACK,
    icon: '🐍',
    effects: [
      { type: 'damage', value: 1.0, target: 'enemy' },
      { type: 'poison', value: 5, duration: 3, target: 'enemy' }
    ],
    cooldown: 4,
    currentCooldown: 0,
    mpCost: 0,
    power: 1.0
  },
  'ghost_haunt': {
    id: 'ghost_haunt',
    name: '诅咒',
    description: '降低敌人防御',
    type: SkillType.DEBUFF,
    icon: '👻',
    effects: [{ type: 'buff_defense', value: -0.5, duration: 3, target: 'enemy' }],
    cooldown: 5,
    currentCooldown: 0,
    mpCost: 0,
    power: 0
  }
};

/** 根据ID创建技能 */
export function createSkill(id: string, isPlayer: boolean = true): Skill | null {
  const db = isPlayer ? PLAYER_SKILLS : ENEMY_SKILLS;
  const template = db[id];
  if (!template) return null;
  return { ...template, currentCooldown: 0 };
}

/** 获取敌人的默认技能 */
export function getEnemyDefaultSkill(enemyType: string): Skill | null {
  const skillMap: Record<string, string> = {
    'slime': 'slime_split',
    'goblin': 'goblin_stab',
    'skeleton': 'skeleton_bash',
    'orc': 'orc_roar',
    'troll': 'troll_regen',
    'dragon': 'dragon_breath',
    'spider': 'venom_bite',
    'snake': 'venom_bite',
    'ghost': 'ghost_haunt',
    'bat': 'venom_bite'
  };
  
  const skillId = skillMap[enemyType];
  return skillId ? createSkill(skillId, false) : null;
}

/** 技能类型颜色 */
export const SKILL_TYPE_COLORS: Record<SkillType, string> = {
  [SkillType.ATTACK]: '#FF4444',
  [SkillType.HEAL]: '#44FF44',
  [SkillType.BUFF]: '#4444FF',
  [SkillType.DEBUFF]: '#FF44FF',
  [SkillType.SPECIAL]: '#FFFF44'
};

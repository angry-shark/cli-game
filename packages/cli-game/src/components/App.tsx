import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameScene } from '../phaser/GameScene.js';

/**
 * React 应用组件
 * 负责初始化 Phaser 游戏并渲染 UI 覆盖层
 */
export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [messages, setMessages] = useState<Array<{ text: string; color: string }>>([]);

  useEffect(() => {
    // 检查游戏是否已初始化
    if (gameRef.current) return;

    // Phaser 游戏配置
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#1a1a2e',
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    // 创建 Phaser 游戏实例
    gameRef.current = new Phaser.Game(config);

    // 处理窗口大小变化
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* UI 覆盖层可以在这里添加更多元素 */}
      <div style={styles.uiOverlay}>
        <div style={styles.hint}>
          <span style={styles.key}>WASD</span> 移动 | 
          <span style={styles.key}>E</span> 互动 | 
          <span style={styles.key}>I</span> 背包 | 
          <span style={styles.key}>G</span> 拾取 | 
          <span style={styles.key}>ESC</span> 退出
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
  },
  uiOverlay: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #444',
    pointerEvents: 'none',
  },
  hint: {
    color: '#aaa',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  key: {
    color: '#0ff',
    fontWeight: 'bold',
    margin: '0 4px',
  },
};

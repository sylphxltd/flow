# 完整跨平台快捷鍵分析

## 平台差異

### Mac 鍵盤
- **Delete 鍵**: 向後刪除（= Windows Backspace）
- **Fn+Delete**: 向前刪除（= Windows Delete）
- **Command**: 主修飾鍵（行/文檔級操作）
- **Option**: 次修飾鍵（詞級操作）
- **Control**: Emacs 兼容快捷鍵

### Windows/Linux 鍵盤
- **Backspace**: 向後刪除
- **Delete**: 向前刪除
- **Ctrl**: 主修飾鍵
- **Alt**: 次修飾鍵

## Ink 鍵盤事件映射

根據 Ink 文檔和實際測試：
- `key.backspace`: Mac Delete 鍵、Windows/Linux Backspace
- `key.delete`: Mac Fn+Delete、Windows/Linux Delete
- `key.meta`: Mac Option/Command、Windows/Linux Alt
- `key.ctrl`: 所有平台 Ctrl

## 完整快捷鍵方案

### 1. 字符移動
| 操作 | Mac | Windows/Linux | Emacs/Readline |
|------|-----|---------------|----------------|
| 左移一字符 | ← | ← | Ctrl+B |
| 右移一字符 | → | → | Ctrl+F |
| 上移一行 | ↑ | ↑ | Ctrl+P |
| 下移一行 | ↓ | ↓ | Ctrl+N |

### 2. 行移動
| 操作 | Mac | Windows/Linux | Emacs/Readline |
|------|-----|---------------|----------------|
| 行首 | Command+← / Home | Home | Ctrl+A |
| 行尾 | Command+→ / End | End | Ctrl+E |

### 3. 詞移動
| 操作 | Mac | Windows/Linux | Emacs/Readline |
|------|-----|---------------|----------------|
| 左移一詞 | Option+← | Ctrl+← | Alt+B |
| 右移一詞 | Option+→ | Ctrl+→ | Alt+F |

### 4. 文檔移動
| 操作 | Mac | Windows/Linux | Emacs/Readline |
|------|-----|---------------|----------------|
| 文檔首 | Command+↑ | Ctrl+Home | - |
| 文檔尾 | Command+↓ | Ctrl+End | - |

### 5. 字符刪除
| 操作 | Mac | Windows/Linux | Emacs/Readline |
|------|-----|---------------|----------------|
| 向後刪字符 | **Delete** | Backspace | Ctrl+H |
| 向前刪字符 | **(Ctrl+D only)** | Delete | Ctrl+D |

**注意**: Mac Delete 鍵向後刪除，Fn+Delete 在 CLI 環境下無法檢測

### 6. 詞刪除
| 操作 | Mac | Windows/Linux | Emacs/Readline |
|------|-----|---------------|----------------|
| 向後刪詞 | Option+Delete | Ctrl+Backspace | Ctrl+W / Alt+Backspace |
| 向前刪詞 | Option+Fn+Delete | Ctrl+Delete | Alt+D |

### 7. 行刪除
| 操作 | Mac | Windows/Linux | Emacs/Readline |
|------|-----|---------------|----------------|
| 刪到行首 | Command+Delete | - | Ctrl+U |
| 刪到行尾 | Command+K | - | Ctrl+K |

### 8. 特殊操作
| 操作 | Mac | Windows/Linux | Emacs/Readline |
|------|-----|---------------|----------------|
| 交換字符 | - | - | Ctrl+T |
| Yank (粘貼) | - | - | Ctrl+Y |

### 9. 提交/換行
| 操作 | Mac | Windows/Linux | 多行輸入 |
|------|-----|---------------|----------|
| 提交 | **Ctrl+S** | **Ctrl+S** | ✓ |
| 換行 | Return | Return | ✓ |

**注意**: Command+Return 在 CLI 環境下無法檢測，改用 Ctrl+S（標準保存快捷鍵）

## Ink 實現注意事項

### Mac Command 鍵檢測
Ink 可能將 Command 鍵映射到 `key.meta`，需要區分 Option (Meta) 和 Command (Meta)。

### 建議實現順序
1. **基本操作**（必須）：
   - Backspace/Delete 刪除
   - 方向鍵移動
   - Enter 提交

2. **Emacs 標準**（強烈推薦）：
   - Ctrl+A/E/B/F/D/H
   - Ctrl+K/U/W/Y/T
   - Alt+B/F/D

3. **平台特有**（增強體驗）：
   - Mac: Command+←/→, Option+Delete
   - Windows: Ctrl+←/→, Ctrl+Backspace

## 實際測試結果（Mac 環境）

### ✅ 已解決問題

#### 1. Mac Delete 鍵行為
- **發現**: Mac Delete 鍵映射到 `key.delete`（不是 `key.backspace`）
- **行為**: 應該向後刪除（像 Windows Backspace）
- **解決**: `key.delete` 現在正確向後刪除
- **Option+Delete**: `key.delete` + `key.meta` 正確刪除整個詞

#### 2. 提交快捷鍵
- **發現**: CLI 環境下 **Command 鍵完全無法檢測**
- **原因**: 終端系統級限制，Command+任何鍵 都無法被 Ink 捕獲
- **解決**: 改用 **Ctrl+S** 提交（標準保存快捷鍵）
- **Return 鍵**: 只用於換行（多行輸入）

#### 3. CLI 環境鍵盤限制
- ❌ **Command 鍵**: 完全無法檢測（系統攔截）
- ✅ **Ctrl 鍵**: 可以與 A-Z 組合使用
- ✅ **Option 鍵** (`key.meta`): 可以與 Delete、B、F、D 組合
- ❌ **Fn+Delete**: 無法檢測（沒有對應事件）
- ❌ **組合鍵+Return**: 任何組合鍵+Return 都無法檢測

## 建議測試方案

```bash
# 1. 啟用調試
DEBUG_INPUT=1 npm start

# 2. 測試每個快捷鍵
- 按 Delete 鍵（查看是 backspace 還是 delete）
- 按 Fn+Delete（查看事件）
- 按 Option+Delete（查看事件）
- 按 Command+Return（查看事件）
- 按 Option+← 和 Command+←（區分 meta）
```

## 最終實現目標

✅ 支持所有 Readline/Emacs 標準快捷鍵（跨平台）
✅ 支持 Mac 原生快捷鍵（Command/Option）
✅ 支持 Windows/Linux 原生快捷鍵（Ctrl）
✅ 正確處理 Delete/Backspace 平台差異
✅ 多行輸入支持（Return 換行，Cmd/Ctrl+Return 提交）

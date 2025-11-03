# Notification System

AI 回覆完成時會自動觸發通知，讓你在其他應用程式中也能即時知道 AI 已經回覆。

## 功能特色

- 🖥️ **Terminal 通知**: 彩色視覺提示 + 系統鈴聲
- 🍎 **macOS 原生通知**: 系統級通知彈窗
- 🔧 **完全可自訂**: 可獨立控制每種通知類型
- 🎵 **音效支援**: 可自訂是否播放通知音效

## 使用方法

### 查看目前通知設定
```
/notifications show
```

### 啟用/停用所有通知
```
/notifications enable all
/notifications disable all
```

### 個別控制通知類型
```
# 啟用 OS 通知
/notifications enable os

# 停用 terminal 通知
/notifications disable terminal

# 停用音效
/notifications disable sound
```

## 支援的通知類型

| 類型 | 描述 | 平台支援 |
|------|------|----------|
| `os` | 作業系統原生通知 | macOS, Linux, Windows |
| `terminal` | Terminal 內彩色通知 | 全平台 |
| `sound` | 通知音效 | 全平台 |

## 通知觸發時機

- ✅ **AI 回覆完成**: 當 LLM 完成完整回覆時
- ✅ **自動截斷**: 超過 100 字元會自動截斷預覽
- ✅ **包含設定尊重**: 遵循你的個人通知偏好

## 範例輸出

### Terminal 通知外觀
```
─────────────────────────────────────────────────────────────
🔔 AI Response Complete
   這是一個 AI 回覆的預覽內容...
─────────────────────────────────────────────────────────────
```

### macOS 通知
- 系統原生彈窗
- 標題: "AI Response Complete"
- 內容: AI 回覆預覽
- 音效: Glass 音效 (如果啟用)

## 故障排除

### macOS 通知不工作
1. 確保系統偏好設定中允許終端機通知
2. 檢查「通知與專注模式」設定
3. 嘗試重啟終端機

### 音效不播放
1. 確認系統音效未靜音
2. 檢查 `/System/Library/Sounds/Glass.aiff` 檔案存在
3. 嘗試 `/notifications enable sound`

### 想要完全停用通知
```
/notifications disable all
```

## 技術細節

- **實作位置**: `src/utils/notifications.ts`
- **設定儲存**: Zustand store (`notificationSettings`)
- **跨平台支援**: macOS (osascript), Linux (notify-send), Windows (PowerShell)
- **音效**: macOS 使用 `afplay`, 其他平台使用系統預設音效

通知系統現在已整合到你的 Sylphx Flow 工作流程中！🎉
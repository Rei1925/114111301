豪華刮刮樂（靜態頁面）

說明
- 這是一個單檔靜態刮刮樂頁面，主要檔案：
  - `first.html`：主頁面（載入 `styles.css` 與 `script.js`）
  - `styles.css`：樣式檔
  - `script.js`：遊戲邏輯與歷史紀錄（localStorage）

主要功能
- 真實感刮刮效果（Canvas），支援滑鼠與觸控
- 隨機獎項（含大獎標示），刮開到門檻會自動揭曉
- 可直接按「直接顯示結果」跳過刮除動作
- 會把每次揭曉結果儲存在 localStorage（鍵名：`scratch_records`），可在頁面查看或清除
- 近期得獎會直接顯示在主頁（不需打開歷史面板）

如何在本機執行
1. 使用檔案總管或終端機打開 `first.html`（例如在 PowerShell 裡）：

```powershell
Start-Process .\first.html
```

2. 在開啟的頁面上，用滑鼠或手指刮刮看，或按按鈕直接揭曉。

開發者提示
- 若要修改獎項或機率，編輯 `script.js` 裡的 `prizes` 陣列（`text` 與 `weight`）。
- 紀錄會保存在 localStorage，最多保留 100 筆。如需導出，可另外加入匯出功能。

後續建議
- 加上音效（刮刮聲 / 中獎音）
- 增加下載紀錄 (CSV)
- 將紀錄送到後端以避免使用者清除 localStorage

作者：自動產生 / 由您本機檔案維護

# 🔄 同步上游 (Upstream) 更新指南

這個文檔說明如何將你的 fork (`kytsoiad/nodepad`) 與原始 repo (`mskayyali/nodepad`) 同步。

---

## 📋 什麼時候需要同步？

當你看到原始 repo 有新的提交時：
- 在 GitHub 上查看 `https://github.com/mskayyali/nodepad`
- 發現有新功能或 bug 修復
- 想獲取最新的更新

---

## 🚀 方法一：使用腳本（推薦）

### 1. 雙擊運行

打開檔案總管，進入專案資料夾：
```
c:\Development\nodepad_dev\nodepad\
```

**雙擊** `sync-upstream.bat` 檔案

### 2. 等待完成

腳本會自動執行：
1. ✅ 獲取上游更新 (`git fetch upstream`)
2. ✅ 切換到 main 分支 (`git checkout main`)
3. ✅ 合併更新 (`git merge upstream/main`)
4. ✅ 推送到你的 fork (`git push origin main`)

完成後會顯示 "Sync completed successfully!"

---

## 🖥️ 方法二：VS Code 終端

在 VS Code 終端運行：

```bash
# 方法 A：使用腳本
./sync-upstream.bat

# 或 PowerShell 版本
./sync-upstream.ps1
```

---

## ⌨️ 方法三：手動命令

如果你喜歡手動控制：

```bash
# 1. 獲取上游更新
git fetch upstream

# 2. 確保在 main 分支
git checkout main

# 3. 合併上游的更新
git merge upstream/main

# 4. 推送到你的 fork
git push origin main
```

---

## ⚠️ 常見問題

### 問題 1："There is no tracking information for the current branch"

**解決**：
```bash
git branch --set-upstream-to=origin/main main
```

### 問題 2：合併衝突 (Merge Conflicts)

如果同時修改了相同檔案，會出現衝突：

```bash
# 查看衝突檔案
git status

# 手動編輯衝突檔案，解決後標記為已解決
git add <conflicted-file>

# 完成合併
git commit

# 推送
git push origin main
```

### 問題 3：沒有 upstream remote

如果你還沒設置 upstream：

```bash
# 添加原始 repo 作為 upstream
git remote add upstream https://github.com/mskayyali/nodepad.git

# 驗證
git remote -v
```

---

## 📊 檢查同步狀態

```bash
# 查看你的 fork 是否領先/落後上游
git log --oneline --graph --all --decorate -10

# 查看上游有哪些更新你還沒有
git log HEAD..upstream/main --oneline

# 查看你有哪些提交上游還沒有
git log upstream/main..HEAD --oneline
```

---

## 📝 當前狀態

| 項目 | 網址 |
|------|------|
| 你的 Fork | `https://github.com/kytsoiad/nodepad` |
| 上游 (Upstream) | `https://github.com/mskayyali/nodepad` |

**目前狀態**：✅ 你的 fork 領先上游 1 個提交（Pollinations.ai 支援）

---

## 💡 小提示

1. **定期檢查**：每隔幾天檢查一次上游是否有更新
2. **先 commit**：同步前先 commit 你的本地修改
3. **測試後推送**：合併後先本地測試，再推送到 GitHub
4. **保持整潔**：同步完成後可以刪除已合併的分支

---

## 🆘 需要幫助？

如果遇到問題：
1. 查看 GitHub 文檔：https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork
2. 使用 `git status` 查看當前狀態
3. 使用 `git log --oneline --graph --all` 查看分支歷史

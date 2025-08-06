# 生産システム動作確認手順

## 生産開始フロー（task-10-1）

### 操作フロー

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```
   ブラウザで http://localhost:8081 にアクセス

2. **拠点選択**
   - マップ上のプレイヤー本拠地（座標10,10付近の青い拠点）を左クリック
   - 拠点情報パネルが画面右側に表示される

3. **生産工場を選択**
   - 画面左側のBaseActionMenuから「生産工場」を選択
   - ProductionFactoryMenuが全画面モーダルで表示される

4. **アイテムを選択**
   - 左側の「生産可能アイテム」リストから以下のいずれかをクリック：
     - 忍者刀 (300両)
     - 手裏剣 (200両)
     - 弓 (400両)
     - 兵糧丸 (50両)
   - 選択されたアイテムの背景が半透明になる
   - **問題があった箇所**: インデックス計算のバグを修正済み

5. **数量を指定**
   - 中央の数量指定UIで+/-ボタンを使って数量を調整（1〜99個）
   - デフォルトは1個

6. **生産をキューに追加** ← **ここでキューに追加される**
   - 「生産を追加」ボタンをクリック
   - 右側の生産キューに「アイテム名 0/数量」形式で表示される
   - 例：「忍者刀 0/20」

7. **キャンセル操作**
   - 「キャンセル」ボタンまたは背景クリック、右クリックで閉じる

### デバッグ確認

コンソール（F12 → Console）で以下のログが確認できます：

```javascript
// アイテムクリック時
"Item clicked: index=0, item=忍者刀"
"selectItem called: index=0"
"Selected item: 0"

// 生産工場表示時
"ProductionFactoryMenu.show() called for base: player-hq"
"Initialized/checked production lines for base: player-hq"

// 生産追加時
"onStartProduction called: selectedIndex=0, quantity=5"
"Selected item type: NINJA_SWORD"
"Production added to line 1"
```

### 修正内容

1. **アイテム選択のインデックス計算修正**
   - 修正前：`items[index * 2 + 2]`（間違い）
   - 修正後：`items[1 + index * 2]`（正しい）
   - 理由：headerText(0) + itemBg(1), itemText(2), itemBg(3), itemText(4)...の順番

2. **拠点の初期化処理追加**
   - `show()`時に`productionManager.initializeBase(baseId)`を呼び出す
   - 6つの空きラインが作成される

3. **デバッグログ追加**
   - 各処理段階でログを出力し、問題箇所を特定しやすくした

### 今後の実装予定

- **task-10-2**: バックグラウンドでの生産進行（リアルタイム処理）
- **task-10-3**: 進捗管理と完了処理（アイテムが1個ずつ完成）
- **task-10-4**: キャンセル機能（生産途中でもキャンセル可能）
- **task-10-5**: 倉庫システム（完成品の自動格納）
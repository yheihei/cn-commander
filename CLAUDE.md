# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 本ゲームの指針

@docs/prd/requirements.md

## 応答のルール

- 常に日本語で応答してください。コード部分はそのままにしてください。

## **MUST** 思考のルール

- 思考する際は英語で考えてください

## コーディング原則
- YAGNI（You Aren't Gonna Need It）：今必要じゃない機能は作らない
- KISS: 複雑な解決策より単純な解決策を優先

## git操作をするとき

`gh` コマンドを使うこと

### 具体的なgit操作例
- `gh pr create`: プルリクエスト作成
- `gh pr list`: PRの一覧表示
- `gh issue create`: イシュー作成
- `gh repo view --web`: リポジトリをブラウザで開く

## タスクの遂行方法

適用条件: 実装を依頼された時。

### 基本フロー

- PRDや与えられた情報を見て、「Plan → Imp → Debug → Review → Doc」サイクルで処理する

#### Phase1 Plan

- 受け取った情報を確認し、不明点がないか確認する
- @docs/epics/epic.md を読み、どのタスクかを明確にする
- 受け取った情報をもとに基本設計書を出力する
  - 出力のルールは @.claude/rules/design-doc.md を読むこと
- @docs/design/epic-* 配下を参照し、関連する設計書がないか確認する。関連する設計書があればそちらも更新する

#### Phase2 Imp

- Planをもとに実装する
- スプライトシートなど、素材が必要なものがあればユーザーに確認する

#### Phase3 Debug

- 指定のテストがあればテストを行う
- 指定がなければ関連のテストを探してテストを行う
- 関連のテストがなければ統合テストを作成する
  - テスト作成ルール: @.claude/rules/integration-test.md （モックベースの統合テスト作成ガイド）
- テストが通ったらフォーマッタをかける
- lintチェックを行い、エラーがあればImpに戻り、修正する

#### Phase4 Review

- これまでのやり取りの中で @docs/prd/requirements.md の変更があったら。最新の要求に更新する
- 自己レビューする。特に要求に違反するものがあれば指摘するか、ユーザーに確認を取る
- レビュー指摘があればImpに戻る

#### Phase5 Doc
- 基本設計書に修正があれば修正する
- やり取りの結果、@docs/prd/requirements.md に修正が必要であれば修正する
- ユーザーからのフィードバックを待つ。フィードバックがあれば適宜前のフェーズに戻ること

## **重要** 実装タスクの最後にやること

適用条件: 1行でも実装を修正した場合**MUST**

- 最後に`npm test`を行い、テストエラーが無いか確認する
- エラーがある場合、テストが悪いのか、実装が悪いのか判断し、どちらかを修正すること

## 開発コマンド

### 基本コマンド
- `npm run dev` - 開発サーバーを起動（http://localhost:8080 でアクセス可能）
- `npm run build` - プロダクションビルドを作成
- `npm run serve` - ビルドしたファイルをローカルサーバーで確認

### テスト関連
- `npm test` - 全テストを実行
- `npm run test:watch` - ファイル変更を監視しながらテストを実行
- `npm run test:coverage` - カバレッジレポート付きでテストを実行
- 単一テストの実行: `npm test -- path/to/test.ts`

### コード品質管理
- `npm run lint` - ESLintでコードをチェック
- `npm run lint:fix` - ESLintの自動修正を実行
- `npm run format` - Prettierでコードを整形
- `npm run format:check` - フォーマットのチェックのみ（変更なし）
- `npm run typecheck` - TypeScriptの型チェック

## アーキテクチャ概要

### ゲーム構成
本ゲームは2DドットRTSゲーム「クリプト忍者咲耶コマンダー」で、Phaser3を使用して構築されています。

### ディレクトリ構造と責務

#### `src/scenes/`
ゲームの画面遷移を管理するPhaser3のシーンクラス群：
- `BootScene` - 初期化処理
- `PreloadScene` - アセット読み込み
- `GameScene` - メインゲームロジック（各マネージャーの統合）

#### `src/map/`
マップシステムの管理：
- `MapManager` - タイルマップ全体の管理、地形効果の適用
- `MapTile` - 個別タイルの情報（地形タイプ、移動コスト、防御補正等）
- `MapLayer` - マップレイヤーの管理

#### `src/character/`
キャラクターシステム：
- `Character` - 個別の忍者ユニット（HP、攻撃力、防御力等のパラメータ）
- `CharacterFactory` - キャラクター生成のファクトリー
- `jobs/` - 職業クラス（風忍、鉄忍、影忍、薬忍）とそのスキル

#### `src/army/`
軍団システム（1軍団 = 指揮官1名 + 一般兵3名）：
- `Army` - 軍団クラス（4人のキャラクターを管理）
- `ArmyManager` - 全軍団の管理、選択状態の管理
- `ArmyFactory` - 軍団生成のファクトリー

#### `src/movement/`
移動システム：
- `MovementManager` - 移動指示の全体管理
- `MovementProcessor` - 実際の移動処理（経路に沿った移動）
- `MovementCalculator` - 移動速度計算（地形効果、軍団平均速度）
- `MovementCommand` - 移動コマンドパターンの実装

#### `src/input/`
入力処理：
- `MovementInputHandler` - マウス入力を移動指示に変換

#### `src/ui/`
UI要素：
- `UIManager` - UI全体の管理
- `ActionMenu` - 行動選択メニュー（移動、攻撃等）
- `MovementModeMenu` - 移動モード選択（通常移動/戦闘移動）
- `WaypointMarker` - 経路指定時のマーカー表示

#### `src/types/`
TypeScript型定義：
- 各システムで使用する型定義を集約
- `global.d.ts` - グローバル型定義

### データフロー
1. **入力処理**: `MovementInputHandler`がマウス入力を受け取る
2. **UI表示**: `UIManager`が適切なメニューを表示
3. **コマンド生成**: ユーザーの選択に基づいて移動コマンドを生成
4. **移動処理**: `MovementProcessor`が地形効果を考慮しながら移動を実行
5. **表示更新**: 各マネージャーがPhaser3のGameObjectsを更新

### テスト戦略
- モックベースの統合テストを採用（Phaser HEADLESSモードは不安定なため）
- エピック単位でテストを構成（`test/integration/epic-XX-name/`）
- ビジネスロジックに焦点を当て、描画処理はモック化

### UIの表示方式
- **固定位置UI**: 画面に固定されたUI要素
  - カメラの表示範囲（worldView）を基準に配置
  - カメラのスクロールに追従して位置を更新
  - 例：ArmyInfoPanel（右側）、ActionMenu（左側）、MovementModeMenu（左側）
- **ワールド座標UI**: ゲーム世界に配置されるUI要素
  - ゲームオブジェクトの位置に相対的に配置
  - カメラのスクロールとズームの影響を受ける
  - 例：WaypointMarker（経路マーカー）

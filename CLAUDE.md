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

## タスクの遂行方法

適用条件: 実装を依頼された時。単なる質問事項の場合適用されない。

### 基本フロー

- PRDや与えられたドキュメントを見て、「Plan → Imp → Debug → Review → Doc」サイクルで処理する

#### Phase1 Plan

- 受け取った情報を確認し、不明点がないか確認する
- その後、受け取った情報 の各項目を Planに落とし込む
  - Planは `docs/todo/YYYYMMDDhhmm_${タスクの概要}.md` に保存

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

- 基本設計書を`docs/design/YYYYMMDD_${タスクの概要}.md` に保存
- ユーザーからのフィードバックを待つ。フィードバックがあれば適宜前のフェーズに戻ること

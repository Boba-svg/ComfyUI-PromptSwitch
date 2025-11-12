# PromptSwitch × AutoBatchRunner 連携ガイド

Generateごとにプロンプトを自動変更し、100回以上の連続生成で理想の画像を効率的に作る方法。

---

## この連携でできること

- 自動プロンプト変更: /CタグでGenerateごとにプロンプトを変更
- 連続生成: AutoBatchRunnerで10～1000枚を自動生成
- 確率制御: /R-N-Mで「変化しすぎ」の錯覚を防ぐ
- 放置で理想の画像: 設定後に放置で目的の画像を得る

---

## 必要なもの

gitで以下をインストール:
1. PromptSwitch
2. AutoBatchRunner

---

## 設定例1: ほぼ固定、時折変化（推奨）

### 1. PromptSwitchノード設定
ノードタイトル:表情 /R-100-2 /C  
happy smile  
sad face  
angry glare  
surprised eyes  
neutral expression  

- 0個 選択確率: 100/103 ≈ 97.1%
- 1～2個 選択: 3/103 ≈ 2.9%
- 変化が「多すぎる」と感じない

### 2. 実行
1. ワークフローを保存
2. 右上のAutoBatchパネルで回数（200）を確認
3. Shift+Qで200枚の自動生成開始
4. /Cが毎回作動、約6枚に1回変化
5. 放置で理想の表情が出現

---

## 設定例2: バランスよく変化

ノードタイトル:服装 /R-1-2 /C  
casual wear  
formal suit  
sporty outfit  

- 0個 選択: 33.3%  
- 1個 選択: 33.3%  
- 2個 選択: 33.3%  

---

## ショートカット一覧
  
C        - /C切り替え  
Shift+Q  - 自動生成開始  
Shift+S  - 自動生成停止  
Shift+C  - 全/C削除  

---

## 確率制御一覧

目的                | /Rタグ        | 0選択確率
--------------------|---------------|----------
ほぼ固定（1%変化）  | /R-999-1 /C   | 99.9%
少し変化（5%）      | /R-19-1 /C    | 95%
少し変化（10%）     | /R-9-1 /C     | 90%
バランス（33%）     | /R-1-2 /C     | 33.3%
大きく変化          | /R0-3 /C      | 0%（常に変化）

---

## トラブル対応

問題                    | 対処法
------------------------|--------
プロンプトが変わらない  | /Cを確認（Cキー）
生成が止まる/遅い      | intervalを3～5に
Edit Modeで固まる      | Ctrl+Shift+Rで再読み込み
AutoBatch UIが出ない   | ComfyUIを再起動

---

## 応用: タイトルで変化率を可視化  

表情 /R-100-2 /C（変化率: 約3%）  

---

## 注意: 長時間の生成のご注意

作者のようなクラウド環境ではなくローカルPCで長時間生成を行う場合、長時間GPUが100%に張り付くことになる思いますので、   
各自の自己責任でPCの稼働時間を管理してください。（当ソフトの稼働に依る被害の責任は負いかねます）
---

## リンク

- PromptSwitch: https://github.com/Boba-svg/ComfyUI-PromptSwitch
- AutoBatchRunner: https://github.com/Boba-svg/ComfyUI_AutoBatchRunner
- README: ./README.md

---

開発者: Boba-svg  
最終更新: 2025/11/11

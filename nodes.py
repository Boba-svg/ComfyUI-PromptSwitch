#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# File: nodes.py
# PromptSwitch ノード定義（旧 PromptPalette の流用）

import os
import re


class PromptSwitch:
    """
    ComfyUI 用の PromptSwitch ノード
    - 入力テキストを行ごとに管理
    - コメント行の無効化や行末カンマの自動追加
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": (
                    "STRING",
                    {"default": "", "multiline": True},
                )
            },
            "optional": {"prefix": ("STRING", {"forceInput": True})},
        }

    RETURN_TYPES = ("STRING",)
    FUNCTION = "process"
    CATEGORY = "utils"

    def process(self, text, prefix=None):
        lines = text.split("\n")
        filtered_lines = []
        for line in lines:
            # 空行はスキップ
            if not line.strip():
                continue
            # コメント行はスキップ
            if line.strip().startswith("//"):
                continue
            # 行内コメントは削除
            if "//" in line:
                line = line.split("//")[0].rstrip()
            # 行末にカンマを追加
            if not line.strip().endswith(","):
                line = line + ", "
            filtered_lines.append(line)
        result = "\n".join(filtered_lines) + "\n"

        if prefix:
            result = prefix + "\n" + result

        result = result.lstrip(' ')
        
        # --- 改良点：改行を正規化してから判定 ---
        # Windows の CRLF (\r\n) や単独の CR (\r) をすべて \n に統一する
        result = result.replace("\r\n", "\n").replace("\r", "\n")

        # --- 複数の空行を1行に圧縮 ---
        result = re.sub(r'\n{2,}', '\n', result)

        # --- 出力が改行文字だけの場合、空文字に変換 ---
        if re.fullmatch(r"\n+", result):
            result = ""

        return (result,)


# Node Mappings
NODE_CLASS_MAPPINGS = {"PromptSwitch": PromptSwitch}
NODE_DISPLAY_NAME_MAPPINGS = {"PromptSwitch": "Prompt Switch"}

# Web UI フォルダ
WEB_DIRECTORY = os.path.join(os.path.dirname(os.path.realpath(__file__)), "web")

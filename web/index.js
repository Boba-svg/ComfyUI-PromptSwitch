// File: web/index.js
// Program: PromptSwitch (ComfyUI-PromptPaletteの改編版)
// PromptSwitch #2894
// 2025-11-10 22:45 JST
// 修正内容：
// ・/R-8-2 テスト結果に基づき、getRTagSelectionRange と randomPickupPrompts をデバッグ修正
// ・負数範囲計算を正しく実装: /R-N-M → min_raw = -N, max = M, total_options = N + M + 1
// ・raw_select = random(0, total-1) + min_raw → numToSelect = max(0, raw_select)
// ・/R-8-2 → 0確率 8/11 ≈72.7%, max=2 固定確認（シミュレーション: 0=82%,1=9%,2=8%）
// ・バリデーション強化: N,M >=0 整数のみ有効
// ・ヘルプ説明微調整（例追加）
//
// 【タグシステム完全統一】（2025-11-05）
// ・タグは必ず / で区切る：/v /a /R0-3 /C
// ・全角・半角スペース、タブ、改行は無視
// ・複合タグ /R2a, /var は無効（警告）
// ・parseNodeTags で一元管理 → バグゼロ
//
// 【編集モード開始防止】
// ・setTimeout → requestAnimationFrame で確実に非表示
// ・this キャプチャで安全
// ・描画後に hidden = true を強制
//
// 【/C 挙動】（2025-11-08 修正）
// ・生成前：初回ランダム（queuePrompt）のみ
// ・生成後（onAfterExecutePrompt）はランダム実行しない
// → バッチ処理でも無駄な処理なし。1回だけ確実にランダム選択
//
// 【Cキー追加】（2025-11-07）
// ・ノードにフォーカス時 Cキー → /C タグをトグル（末尾に追加/削除）
// ・/C/r/a のような複合タグでも /C のみを正確に削除
// ・【最終修正】/R0-2/C, /r/a/C でも完璧に動作（中間/CもOK）
//
// 【Shift+E 追加】（2025-11-07）
// ・Shift+E：全ノードを編集モードに（既に編集中のものは維持）
// ・再びShift+E：全ノードを通常モードに
// ・【バグ修正】編集モードで開始しても元に戻るように修正
// ・【Shift+E 文字入力完全防止】フォーカス自体をしない → カーソルも入力もゼロ
//
// 【Shift+C 追加】（2025-11-07）
// ・Shift+C：全ノードのタイトルから /C を一括削除
//
// 【2025-11-09 変更】
// ・ランダムピックアップの対象から //,// および //,//コメント を除外
//
// 【2025-11-10 22:45 修正】
// ・/R-N-M 形式: 負数N個の外れ枠を正しく実装（0選択確率 = N / (N+M+1)）
// ・例: /R-8-2 → 11通り中8外れ, max=2
//
// 【2025-11-14 新機能追加】 /T タグ（Turn: 回ってくる）
// ・/T → /T1 と同義。カレント行=1
// ・/Tn → カレント行=n
// ・/TnMm → カレント行=n, 最大実行数=m, カウント=1
// ・/TnMm-k → カレント行=n, 最大実行数=m, カウント=k
// ・生成前（queuePrompt）で：
//   1. 全行無効化（Aキー挙動）
//   2. カレント行を有効化（空白・//・//,//はスキップ）
//   3. タイトル更新：カウント進める or カレント行+1
// ・/C タグと競合時：/T 優先、/C 無視 + 警告
// ・編集モード中でも安全（callback 呼び出し禁止）
// ・描画関数は一切変更せず
// ・parseNodeTags で /T を許可

import { app } from "../../scripts/app.js";
const CONFIG = {
    // UIの描画設定
    minNodeWidth: 400,
    minNodeHeight: 80,
    topNodePadding: 40,
    headerHeight: 40,
    sideNodePadding: 14,
    lineHeight: 18,
    emptyLineHeight: 4,
    emptyLineSeparatorColor: "#ADD8E6",
    fontSize: 14,
    FONT_FAMILY: "Tahoma, Verdana, Arial, Roboto, 'Open Sans', sans-serif",
    checkboxSize: 16,
    spaceBetweenCheckboxAndText: 6,
    weightButtonSize: 16,
    weightLabelWidth: 50,
    minWeight: -1.0,
    maxWeight: 2.0,
    commentPrefixLength: 15,
    COMMENT_FONT_SCALE: 0.8,
    WEIGHT_STEP: 0.10,
    PROMPT_MAX_LENGTH_DISPLAY: 30,
    // カラーパレット
    COLOR_PROMPT_ON: "#FFF",
    COLOR_COMMENT_ON: "#ADD8E6",
    COLOR_PROMPT_OFF: "#AAAAAA",
    COLOR_COMMENT_OFF: "#AAAAAA",
    // 追加：コメントセパレータ設定
    CommentLine_LineColor: "#888", // 紫線カラー（明るめ）
    CommentLine_Height: 4, // 紫線の高さ（px）
    CommentLine_FontColor: "#ADD8E6", // 紫コメント文字色
};
// ========================================
// 1. タグパース関数（スペースなし完全対応 + 中間タグ対応）
// ========================================
function parseNodeTags(node) {
    if (!node.title) return [];
    const trimmed = node.title.trim();
    // /で始まるすべてのタグを正確に抽出（スペースの有無問わず）
    const tagMatches = [...trimmed.matchAll(/\/([^\/\s]*)/g)];
    if (tagMatches.length === 0) return [];
    const rawTags = tagMatches.map(m => m[1]);
    // 正規化（全角スペースなど）
    const normalizedTags = rawTags.map(tag =>
        tag.replace(/[\u{3000}\t\n\r]+/gu, ' ').trim()
    ).filter(t => t);
    if (normalizedTags.length === 0) return [];
    // 無効タグチェック（複合禁止）
    const invalid = normalizedTags.some(tag => {
        if (/^R[\d-]*$/i.test(tag)) return false;
        if (/^[avrc]$/i.test(tag)) return false;
        if (/^T\d*M?\d*-?\d*$/i.test(tag)) return false;  // /T, /T2, /T2M5, /T2M5-1
        return true;
    });
    if (invalid) {
        console.warn(`[PromptSwitch] 無効なタグ: /${rawTags.join('/')} → /で区切ってください。`);
        return [];
    }
    return normalizedTags.map(t => t.toLowerCase());
}
// ========================================
// 2. UI Control Helper Functions
// ========================================
function findTextWidget(node) {
    if (!node.widgets) return null;
    for (const w of node.widgets) {
        if (w.name === "text") {
            return w;
        }
    }
    return null;
}
function isNodeExcluded(node, keys) {
    const tags = parseNodeTags(node);
    return keys.some(key => tags.includes(key.toLowerCase()));
}
function isLineDisabled(line) {
    const trimmedLine = line.trimStart();
    const isEmpty = trimmedLine === '';
    if (isEmpty) return false;
    return trimmedLine.startsWith('//');
}
function toggleAllPrompts(text) {
    const lines = text.split('\n');
    const commentPrefix = "// ";
    const prefixRegex = /^\s*\/\/\s*/;
    let needsDeactivation = false;
    for (const line of lines) {
        if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) continue;
        if (line.trim() === '') continue;
        if (!isLineDisabled(line)) {
            needsDeactivation = true;
            break;
        }
    }
    const targetMode = needsDeactivation ? 'OFF' : 'ON';
    const newLines = lines.map(line => {
        if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) {
            return line;
        }
        let trimmedLine = line.trimStart();
        const isCommented = trimmedLine.startsWith('//');
        if (trimmedLine === '') {
            return line;
        }
        if (targetMode === 'ON') {
            if (isCommented) {
                return line.replace(prefixRegex, '').trimStart();
            }
        } else {
            if (!isCommented) {
                const leadingSpaces = line.match(/^(\s*)/);
                const spaces = leadingSpaces ? leadingSpaces[0] : "";
                return spaces + commentPrefix + trimmedLine;
            }
        }
        return line;
    });
    return newLines.join('\n');
}
function deactivatePromptText(text) {
    const lines = text.split('\n');
    const commentPrefix = "// ";
    const newLines = lines.map(line => {
        if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) {
            return line;
        }
        let trimmedLine = line.trimStart();
        const isCommented = trimmedLine.startsWith('//');
        if (trimmedLine === '') {
            return line;
        }
        if (!isCommented) {
            const leadingSpaces = line.match(/^(\s*)/);
            const spaces = leadingSpaces ? leadingSpaces[0] : "";
            return spaces + commentPrefix + trimmedLine;
        }
        return line;
    });
    return newLines.join('\n');
}
function deactivateAllPromptSwitchNodes(app) {
    const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
    for (const node of promptNodes) {
        if (isNodeExcluded(node, ['a'])) continue;
        const textWidget = findTextWidget(node);
        if (textWidget) {
            textWidget.value = deactivatePromptText(textWidget.value);
            if (textWidget.callback) {
                textWidget.callback(textWidget.value);
            }
        }
    }
    app.graph.setDirtyCanvas(true, true);
}
// ========================================
// 編集モード切替（Shift+E 完全入力防止対応）
// ========================================
function toggleEditMode(node, textWidget, forceMode = null, options = {}) {
    const targetMode = forceMode !== null ? forceMode : !node.isEditMode;
    node.isEditMode = targetMode;
    textWidget.hidden = !targetMode;
    if (targetMode && textWidget.inputEl) {
        requestAnimationFrame(() => {
            if (textWidget.inputEl && node.isEditMode) {
                if (!options.skipFocus) {
                    textWidget.inputEl.focus();
                    textWidget.inputEl.selectionStart = textWidget.inputEl.selectionEnd = textWidget.inputEl.value.length;
                }
            }
        });
    }
    node.setDirtyCanvas(true, true);
}
function stripOuterParenthesesAndWeight(text) {
    let currentWeight = 1.0;
    let processedText = text.trim();
    let trailingComma = '';
    if (processedText.endsWith(',')) {
        trailingComma = ',';
        processedText = processedText.substring(0, processedText.length - 1).trimEnd();
    }
    let matchWithWeight = processedText.match(/^\s*\((.*)\s*:\s*([\d\.\-]+)\s*\)\s*$/);
    if (matchWithWeight) {
        currentWeight = parseFloat(matchWithWeight[2]);
        processedText = matchWithWeight[1].trim();
        return [processedText, currentWeight, trailingComma];
    }
    let matchOnlyParens = processedText.match(/^\s*\((.*)\)\s*$/);
    if (matchOnlyParens) {
        processedText = matchOnlyParens[1].trim();
    }
    return [processedText, currentWeight, trailingComma];
}
function resetAllWeights(text) {
    const lines = text.split('\n');
    const newLines = lines.map(line => {
        let originalLeadingSpaces = line.match(/^(\s*)/)[0];
        let trimmedLine = line.trimStart();
        if (trimmedLine === '') return line;
        const isDisabledByLeadingComment = trimmedLine.startsWith('//');
        let prefix = '';
        if (isDisabledByLeadingComment) {
            const match = trimmedLine.match(/^\/\/\s*/);
            prefix = match ? match[0] : '//';
            trimmedLine = trimmedLine.substring(prefix.length);
        }
        const internalCommentIndex = trimmedLine.indexOf('//');
        let promptPartWithWeight = trimmedLine;
        let commentPart = '';
        if (internalCommentIndex !== -1) {
            promptPartWithWeight = trimmedLine.substring(0, internalCommentIndex).trim();
            commentPart = trimmedLine.substring(internalCommentIndex);
        }
        if (promptPartWithWeight === '') return line;
        let [promptBody, currentWeight] = stripOuterParenthesesAndWeight(promptPartWithWeight);
        if (promptBody === '') {
            promptBody = promptPartWithWeight;
        }
        let newPromptPart = promptBody.replace(/,$/, '');
        newPromptPart = newPromptPart + (promptPartWithWeight.endsWith(',') ? ',' : '');
        return originalLeadingSpaces + prefix + newPromptPart + commentPart;
    });
    return newLines.join('\n');
}
function adjustWeightInText(text, lineIndex, delta) {
    const lines = text.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return text;
    let line = lines[lineIndex];
    let originalLeadingSpaces = line.match(/^(\s*)/)[0];
    let trimmedLine = line.trimStart();
    const isDisabledByLeadingComment = trimmedLine.startsWith('//');
    let prefix = '';
    if (isDisabledByLeadingComment) {
        const match = trimmedLine.match(/^\/\/\s*/);
        prefix = match ? match[0] : '//';
        trimmedLine = trimmedLine.substring(prefix.length);
    }
    const internalCommentIndex = trimmedLine.indexOf('//');
    let promptPartWithWeight = trimmedLine;
    let commentPart = '';
    if (internalCommentIndex !== -1) {
        promptPartWithWeight = trimmedLine.substring(0, internalCommentIndex).trim();
        commentPart = trimmedLine.substring(internalCommentIndex);
    }
    if (promptPartWithWeight === '') {
        lines[lineIndex] = line;
        return lines.join('\n');
    }
    let [promptBody, currentWeight, trailingComma] = stripOuterParenthesesAndWeight(promptPartWithWeight);
    if (promptBody === '') {
        promptBody = promptPartWithWeight.trim().replace(/,$/, '');
    }
    let newWeight = Math.min(CONFIG.maxWeight, Math.max(CONFIG.minWeight, currentWeight + delta));
    newWeight = Math.round(newWeight * 100) / 100;
    let newPromptPart = "";
    if (newWeight.toFixed(2) !== "1.00") {
        newPromptPart = `(${promptBody}:${newWeight.toFixed(2)})${trailingComma}`;
    } else {
        newPromptPart = `${promptBody}${trailingComma}`;
    }
    lines[lineIndex] = originalLeadingSpaces + prefix + newPromptPart + commentPart;
    return lines.join('\n');
}
function toggleCommentOnLine(text, lineIndex) {
    const lines = text.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return text;
    let line = lines[lineIndex];
    if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) return text;
    const commentPrefix = "// ";
    const prefixRegex = /^\s*\/\/\s*/;
    if (line.trimStart().startsWith('//')) {
        lines[lineIndex] = line.replace(prefixRegex, '').trimStart();
    } else {
        const leadingSpaces = line.match(/^(\s*)/);
        const spaces = leadingSpaces ? leadingSpaces[0] : "";
        lines[lineIndex] = spaces + commentPrefix + line.trimStart();
    }
    return lines.join('\n');
}
// ========================================
// /R タグ拡張：負数枠対応（/R-8-2 等） - デバッグ修正版
// ========================================
function getRTagSelectionRange(node) {
    const tags = parseNodeTags(node);
    const rTag = tags.find(t => t.startsWith('r'));
    if (!rTag || rTag === 'r') return [1, 1];
    const value = rTag.substring(1); // "r" を除去
    const dashCount = (value.match(/-/g) || []).length;
    if (dashCount === 0) {
        // /R5 → 固定5個
        const count = parseInt(value);
        if (isNaN(count) || count < 0) return [1, 1];
        return [count, count];
    } else if (dashCount === 1) {
        // /R-5 → 0～5
        // /R3-5 → 3～5
        // /R0-5 → 0～5 (min=0)
        const parts = value.split('-');
        let min = parts[0] === '' ? 0 : parseInt(parts[0]); // 0開始対応
        let max = parseInt(parts[1]);
        if (isNaN(min) || isNaN(max) || min > max || max < 0) return [1, 1];
        return [Math.max(0, min), max]; // minを0以上にクランプ
    } else if (dashCount === 2) {
        // /R-8-2 → -8～2 (min_raw=-8, max=2)
        const parts = value.split('-');
        if (parts.length !== 3 || parts[0] !== '') return [1, 1]; // 形式厳密: -N-M
        const negStr = parts[1];
        const posStr = parts[2];
        const neg = parseInt(negStr);
        const pos = parseInt(posStr);
        if (isNaN(neg) || isNaN(pos) || neg < 0 || pos < 0 || !Number.isInteger(neg) || !Number.isInteger(pos)) {
            console.warn(`[PromptSwitch] Invalid /R${value}: N,M must be non-negative integers`);
            return [1, 1];
        }
        return [-neg, pos]; // [min_raw=-N, max=M]
    }
    return [1, 1];
}
function randomPickupPrompts(text, node) {
    const lines = text.split('\n');
    const commentPrefix = "// ";
    const prefixRegex = /^\s*\/\/\s*/;
    const [globalMinRaw, globalMaxSelection] = getRTagSelectionRange(node);
    const sections = [];
    let currentSection = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') {
            if (currentSection.length > 0) sections.push(currentSection);
            sections.push([line]);
            currentSection = [];
        } else {
            currentSection.push(line);
        }
    }
    if (currentSection.length > 0) sections.push(currentSection);
    const newLines = [];
    for (const section of sections) {
        const isSeparator = section.length === 1 && section[0].trim() === '';
        if (isSeparator) {
            newLines.push(section[0]);
            continue;
        }
        const validPromptIndices = [];
        for (let i = 0; i < section.length; i++) {
            const line = section[i];
            if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) continue;
            // 【変更】//,// および //,//コメント をランダム対象から除外
            const commentLineMatch = line.trimStart().match(/^(\s*\/\/\s*,\s*\/\/\s*)(.*)$/);
            if (commentLineMatch) continue;
            if (line.trim() !== '') validPromptIndices.push(i);
        }
        const numValidPrompts = validPromptIndices.length;
        if (numValidPrompts === 0) {
            newLines.push(...section);
            continue;
        }
        // 【修正】負数枠対応: 範囲からランダムnumToSelect (負=0)
        let numToSelect;
        if (globalMinRaw < 0) {
            // 負数範囲: -N ～ M → total = N + M + 1 (0含む)
            const N = -globalMinRaw; // 負枠数 (例:8)
            const totalOptions = N + globalMaxSelection + 1; // 11
            // raw_select = random from min_raw to max (uniform)
            const rawSelect = Math.floor(Math.random() * totalOptions) + globalMinRaw; // -8 to 2
            numToSelect = Math.max(0, rawSelect); // 負→0
        } else {
            // 通常範囲: min >=0
            let minSelect = Math.min(globalMinRaw, numValidPrompts);
            let maxSelect = Math.min(globalMaxSelection, numValidPrompts);
            if (minSelect > maxSelect) minSelect = maxSelect;
            numToSelect = globalMinRaw === globalMaxSelection
                ? globalMinRaw
                : Math.floor(Math.random() * (maxSelect - minSelect + 1)) + minSelect;
        }
        numToSelect = Math.min(numToSelect, numValidPrompts); // クランプ
        const selectedIndices = [];
        const indicesToPick = [...validPromptIndices];
        for (let i = 0; i < numToSelect; i++) {
            if (indicesToPick.length === 0) break;
            const randomLocalIndex = Math.floor(Math.random() * indicesToPick.length);
            const selectedIndex = indicesToPick.splice(randomLocalIndex, 1)[0];
            selectedIndices.push(selectedIndex);
        }
        for (let i = 0; i < section.length; i++) {
            const line = section[i];
            if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) {
                newLines.push(line);
                continue;
            }
            if (line.trim() === '') {
                newLines.push(line);
                continue;
            }
            // 【変更】//,// 行は元のまま出力（ON/OFF 変更なし）
            const commentLineMatch = line.trimStart().match(/^(\s*\/\/\s*,\s*\/\/\s*)(.*)$/);
            if (commentLineMatch) {
                newLines.push(line);
                continue;
            }
            if (selectedIndices.includes(i)) {
                const newLine = line.replace(prefixRegex, '').trimStart();
                newLines.push(newLine);
            } else {
                let trimmedLine = line.trimStart();
                const isCommented = trimmedLine.startsWith('//');
                if (!isCommented) {
                    const leadingSpaces = line.match(/^(\s*)/);
                    const spaces = leadingSpaces ? leadingSpaces[0] : "";
                    newLines.push(spaces + commentPrefix + trimmedLine);
                } else {
                    newLines.push(line);
                }
            }
        }
    }
    return newLines.join('\n');
}
// ========================================
// /T タグ解析関数（Turn: 回ってくる）
// ========================================
function parseTTag(tag) {
    if (!tag || !tag.toLowerCase().startsWith('t')) return null;
    const value = tag.substring(1); // "T" 以降
    const mMatch = value.match(/M(\d+)/i);
    const hasM = mMatch !== null;
    const maxExec = hasM ? parseInt(mMatch[1]) : 1;
    let current = 1;
    let count = 1;

    if (value === '') {
        // /T → current=1
        return { current: 1, maxExec: 1, count: 1 };
    }

    const parts = value.split(/M/i);
    const base = parts[0];
    const afterM = hasM ? (parts[1] || '') : '';

    // current 解析
    const baseNum = parseInt(base);
    if (!isNaN(baseNum) && baseNum > 0) {
        current = baseNum;
    }

    // count 解析（Mの後ろに -k）
    if (afterM) {
        const countMatch = afterM.match(/-(\d+)$/);
        if (countMatch) {
            count = parseInt(countMatch[1]);
        } else if (afterM !== '') {
            const num = parseInt(afterM);
            if (!isNaN(num)) count = num;
        }
    }

    if (maxExec < 1 || current < 1 || count < 1) return null;
    return { current, maxExec, count };
}

// ========================================
// /T タグ実行関数（生成前）
// ========================================
function applyTTag(node, textWidget, app) {
    const tags = parseNodeTags(node);
    const tTag = tags.find(t => t.startsWith('t'));
    if (!tTag) return false;

    const tInfo = parseTTag(tTag);
    if (!tInfo) return false;

    const lines = textWidget.value.split('\n');
    const totalLines = lines.length;
    if (totalLines === 0) return false;

    let { current, maxExec, count } = tInfo;
    current--; // 0-indexed

    // [1] 全行無効化
    let newText = deactivatePromptText(textWidget.value);

    // [2] カレント行を有効化（スキップ条件）
    let validLineFound = false;
    let attempts = 0;
    while (!validLineFound && attempts < totalLines) {
        if (current >= totalLines) current = 0;

        const line = lines[current];
        const trimmed = line.trimStart();
        const isEmpty = trimmed === '';
        const isCommentOnly = trimmed === '//';
        const isSeparator = trimmed.match(/^(\s*\/\/\s*,\s*\/\/\s*)/);

        if (!isEmpty && !isCommentOnly && !isSeparator) {
            validLineFound = true;
            const leadingSpaces = line.match(/^(\s*)/)[0];
            const cleanLine = trimmed.replace(/^\/\/\s*/, '');
            newText = newText.split('\n');
            newText[current] = leadingSpaces + cleanLine;
            newText = newText.join('\n');
        } else {
            current++;
            attempts++;
        }
    }

    // 更新
    textWidget.value = newText;

    // [3] タイトル更新
    let nextCurrent = current + 1;
    let nextCount = count + 1;
    let newTag;

    if (nextCount > maxExec) {
        nextCount = 1;
        nextCurrent = (nextCurrent >= totalLines) ? 1 : nextCurrent + 1;
        newTag = `/T${nextCurrent}M${maxExec}-1`;
    } else {
        newTag = `/T${nextCurrent}M${maxExec}-${nextCount}`;
    }

    // /C 競合警告
    if (tags.includes('c')) {
        console.warn(`[PromptSwitch] /T と /C が競合: /T を優先します (Node: ${node.title})`);
    }

    // タイトル更新（/T 部分のみ置換）
    const title = node.title || "";
    const newTitle = title.replace(/\/T[^\/\s]*/g, '').trim() + ' ' + newTag;
    node.title = newTitle.trim();

    // 再描画（callback 呼び出し禁止）
    node.setDirtyCanvas(true, true);
    app.graph.setDirtyCanvas(true, true);

    return true;
}

// ========================================
// クリック処理関数群
// ========================================
function findClickedArea(pos) {
    const [x, y] = pos;
    for (const area of this.clickableAreas) {
        if (x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height) {
            return area;
        }
    }
    return null;
}
function handleClickableAreaAction(area, textWidget, app) {
    if (area.type === 'checkbox' || area.type === 'text_area_suppressor') {
        textWidget.value = toggleCommentOnLine(textWidget.value, area.lineIndex);
    } else if (area.type === 'weight_increase') {
        textWidget.value = adjustWeightInText(textWidget.value, area.lineIndex, CONFIG.WEIGHT_STEP);
    } else if (area.type === 'weight_decrease') {
        textWidget.value = adjustWeightInText(textWidget.value, area.lineIndex, -CONFIG.WEIGHT_STEP);
    }
    if (textWidget.callback) textWidget.callback(textWidget.value);
    app.graph.setDirtyCanvas(true, true);
}
function setupClickHandler(node, textWidget, app) {
    node.clickableAreas = [];
    node.findClickedArea = findClickedArea;
    node.handleClickableAreaAction = handleClickableAreaAction;
    const originalOnMouseDown = node.onMouseDown;
    node.onMouseDown = function(e, pos) {
        if (this.isEditMode) {
            if (originalOnMouseDown) originalOnMouseDown.apply(this, arguments);
            return;
        }
        const [x, y] = pos;
        if (y < CONFIG.headerHeight) {
            if (originalOnMouseDown) originalOnMouseDown.apply(this, arguments);
            return;
        }
        const clickedArea = this.findClickedArea(pos);
        if (clickedArea) {
            if (e.which === 1) {
                if (clickedArea.type !== 'empty_space_for_dblclick' && clickedArea.type !== 'version_info') {
                    this.handleClickableAreaAction(clickedArea, textWidget, app);
                }
                e.preventDefault();
                e.stopPropagation();
            } else if (e.which === 3) {
                e.stopPropagation();
            }
        } else {
            if (originalOnMouseDown) originalOnMouseDown.apply(this, arguments);
        }
    };
    const originalOnMouseUp = node.onMouseUp;
    node.onMouseUp = function(e, pos) {
        if (originalOnMouseUp) originalOnMouseUp.apply(this, arguments);
    };
    const originalOnContextMenu = node.onContextMenu;
    node.onContextMenu = function(e) {
        if (originalOnContextMenu) return originalOnContextMenu.apply(this, arguments);
        return true;
    };
}
function drawSeparatorLine(ctx, node, y) {
    const lineY = y + CONFIG.emptyLineHeight / 2;
    const startX = CONFIG.sideNodePadding;
    const endX = node.size[0] - CONFIG.sideNodePadding;
    ctx.strokeStyle = CONFIG.emptyLineSeparatorColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, lineY);
    ctx.lineTo(endX, lineY);
    ctx.stroke();
}
function drawCommentText(ctx, node, displayLine, y, isDisabled, startX) {
    const promptFontSize = CONFIG.fontSize;
    const colorPrompt = isDisabled ? CONFIG.COLOR_PROMPT_OFF : CONFIG.COLOR_PROMPT_ON;
    const colorComment = isDisabled ? CONFIG.COLOR_COMMENT_OFF : CONFIG.COLOR_COMMENT_ON;
    let commentFontSize = Math.max(1, Math.floor(promptFontSize * CONFIG.COMMENT_FONT_SCALE));
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    let trimLine = displayLine.trimStart();
    let weight = 1.0;
    const firstCommentIndex = trimLine.indexOf('//');
    let currentX = startX;
    let totalTextWidth = 0;
    function stripOuterParenthesesAndWeightLocal(text) {
        let currentWeight = 1.0;
        let processedText = text.trim();
        let trailingComma = '';
        if (processedText.endsWith(',')) {
            trailingComma = ',';
            processedText = processedText.substring(0, processedText.length - 1).trimEnd();
        }
        let matchWithWeight = processedText.match(/^\s*\((.*)\s*:\s*([\d\.\-]+)\s*\)\s*$/);
        if (matchWithWeight) {
            currentWeight = parseFloat(matchWithWeight[2]);
            processedText = matchWithWeight[1].trim();
            return [processedText + trailingComma, currentWeight];
        }
        let matchOnlyParens = processedText.match(/^\s*\((.*)\)\s*$/);
        if (matchOnlyParens) {
            processedText = matchOnlyParens[1].trim();
        }
        return [processedText + trailingComma, currentWeight];
    }
    if (firstCommentIndex === -1) {
        let beforeText = trimLine;
        [beforeText, weight] = stripOuterParenthesesAndWeightLocal(beforeText);
        let textToDisplay = beforeText;
        if (textToDisplay.length > CONFIG.PROMPT_MAX_LENGTH_DISPLAY) {
            textToDisplay = textToDisplay.substring(0, CONFIG.PROMPT_MAX_LENGTH_DISPLAY) + '...';
        }
        ctx.font = `${promptFontSize}px ${CONFIG.FONT_FAMILY}`;
        ctx.fillStyle = colorPrompt;
        ctx.fillText(textToDisplay, currentX, y + CONFIG.lineHeight / 2);
        totalTextWidth = ctx.measureText(textToDisplay).width;
    } else {
        let beforeText = trimLine.substring(0, firstCommentIndex).trim();
        let afterComment = trimLine.substring(firstCommentIndex + 2);
        [beforeText, weight] = stripOuterParenthesesAndWeightLocal(beforeText);
        let textToDisplay = beforeText;
        const PROMPT_DISPLAY_MAX = 20;
        if (textToDisplay.length > PROMPT_DISPLAY_MAX) {
            textToDisplay = textToDisplay.substring(0, PROMPT_DISPLAY_MAX) + '...';
        }
        ctx.font = `${promptFontSize}px ${CONFIG.FONT_FAMILY}`;
        ctx.fillStyle = colorPrompt;
        ctx.fillText(textToDisplay, currentX, y + CONFIG.lineHeight / 2);
        totalTextWidth = ctx.measureText(textToDisplay).width;
        currentX += totalTextWidth;
        ctx.font = `${commentFontSize}px ${CONFIG.FONT_FAMILY}`;
        ctx.fillStyle = colorComment;
        if (!afterComment.startsWith(' ') && afterComment.length > 0) {
            let space = " ";
            ctx.fillText(space, currentX, y + CONFIG.lineHeight / 2);
            currentX += ctx.measureText(space).width;
        }
        const visibleAfter = afterComment.substring(0, CONFIG.commentPrefixLength);
        ctx.fillText(visibleAfter, currentX, y + CONFIG.lineHeight / 2);
    }
    return ["", weight, totalTextWidth];
}
function drawCheckboxItems(ctx, node, y, isCommented, lineIndex) {
    const checkboxX = CONFIG.sideNodePadding;
    const checkboxY = y + (CONFIG.lineHeight - CONFIG.checkboxSize) / 2;
    ctx.strokeStyle = isCommented ? "#ADD8E6" : "#0F0";
    ctx.strokeRect(checkboxX, checkboxY, CONFIG.checkboxSize, CONFIG.checkboxSize);
    if (!isCommented) {
        ctx.fillStyle = "#0F0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(checkboxX + 3, checkboxY + CONFIG.checkboxSize / 2);
        ctx.lineTo(checkboxX + CONFIG.checkboxSize / 2, checkboxY + CONFIG.checkboxSize - 3);
        ctx.lineTo(checkboxX + CONFIG.checkboxSize - 3, checkboxY + 3);
        ctx.stroke();
        ctx.lineWidth = 1;
    }
    node.clickableAreas.push({
        type: 'checkbox',
        lineIndex: lineIndex,
        x: checkboxX,
        y: y,
        width: CONFIG.checkboxSize + 5,
        height: CONFIG.lineHeight,
    });
}
function drawWeightButtons(ctx, node, y, lineIndex, weight) {
    const isDefaultWeight = weight.toFixed(2) === "1.00";
    let currentX = node.size[0] - CONFIG.sideNodePadding;
    currentX -= CONFIG.weightButtonSize;
    const plusButtonX = currentX;
    const buttonY = y + (CONFIG.lineHeight - CONFIG.weightButtonSize) / 2;
    ctx.fillStyle = "#333";
    ctx.fillRect(plusButtonX, buttonY, CONFIG.weightButtonSize, CONFIG.weightButtonSize);
    ctx.strokeStyle = "#555";
    ctx.strokeRect(plusButtonX + 0.5, buttonY + 0.5, CONFIG.weightButtonSize - 1, CONFIG.weightButtonSize - 1);
    ctx.font = `${CONFIG.fontSize}px ${CONFIG.FONT_FAMILY}`;
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    ctx.fillText("+", plusButtonX + CONFIG.weightButtonSize / 2, buttonY + CONFIG.weightButtonSize / 2);
    node.clickableAreas.push({
        type: 'weight_increase',
        lineIndex: lineIndex,
        x: plusButtonX,
        y: y,
        width: CONFIG.weightButtonSize,
        height: CONFIG.lineHeight,
    });
    currentX -= CONFIG.weightButtonSize + 4;
    const minusButtonX = currentX;
    ctx.fillStyle = "#333";
    ctx.fillRect(minusButtonX, buttonY, CONFIG.weightButtonSize, CONFIG.weightButtonSize);
    ctx.strokeStyle = "#555";
    ctx.strokeRect(minusButtonX + 0.5, buttonY + 0.5, CONFIG.weightButtonSize - 1, CONFIG.weightButtonSize - 1);
    ctx.font = `${CONFIG.fontSize}px ${CONFIG.FONT_FAMILY}`;
    ctx.fillStyle = "#FFF";
    ctx.fillText("-", minusButtonX + CONFIG.weightButtonSize / 2, buttonY + CONFIG.weightButtonSize / 2);
    node.clickableAreas.push({
        type: 'weight_decrease',
        lineIndex: lineIndex,
        x: minusButtonX,
        y: y,
        width: CONFIG.weightButtonSize,
        height: CONFIG.lineHeight,
    });
    if (!isDefaultWeight) {
        const labelText = `${weight.toFixed(2)}`;
        ctx.font = `${CONFIG.fontSize}px ${CONFIG.FONT_FAMILY}`;
        const labelWidth = ctx.measureText(labelText).width;
        currentX -= labelWidth + 4;
        const labelX = currentX;
        ctx.fillStyle = "#DDD";
        ctx.textAlign = "left";
        ctx.fillText(labelText, labelX, buttonY + CONFIG.weightButtonSize / 2);
        node.clickableAreas.push({
            type: 'weight_label',
            lineIndex: lineIndex,
            x: labelX,
            y: y,
            width: labelWidth + 4,
            height: CONFIG.lineHeight,
        });
    }
 
}
function drawCheckboxList(node, ctx, text, app, isCompactMode) {
    node.clickableAreas = [];
    const lines = text.split('\n');
    let y = CONFIG.topNodePadding;
    let lineIndex = 0;
    let linesDrawnCount = 0;
    for (const line of lines) {
        const isInternalDisabled = line.match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/);
        if (isInternalDisabled) {
            lineIndex++;
            continue;
        }
        const isLineEmpty = line.trim() === '';
        const isDisabledByLeadingComment = line.trimStart().startsWith('//');
        // 【新機能】コメントセパレータ //,// 処理
        const commentLineMatch = line.trimStart().match(/^(\s*\/\/\s*,\s*\/\/\s*)(.*)$/);
        if (commentLineMatch) {
            const prefixSpaces = commentLineMatch[1];
            const commentText = commentLineMatch[2];
            const isPureSeparator = commentText.trim() === '';
            if (isPureSeparator) {
                // 紫線（高さ4px）
                const lineY = y + CONFIG.CommentLine_Height / 2;
                ctx.strokeStyle = CONFIG.CommentLine_LineColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(CONFIG.sideNodePadding, lineY);
                ctx.lineTo(node.size[0] - CONFIG.sideNodePadding, lineY);
                ctx.stroke();
                y += CONFIG.CommentLine_Height;
            } else {
                // 紫コメント行（通常行高さ）
                ctx.font = `${CONFIG.fontSize}px ${CONFIG.FONT_FAMILY}`;
                ctx.fillStyle = CONFIG.CommentLine_FontColor;
                ctx.textBaseline = "middle";
                ctx.textAlign = "left";
                const textX = CONFIG.sideNodePadding + CONFIG.checkboxSize + CONFIG.spaceBetweenCheckboxAndText;
                ctx.fillText(commentText, textX, y + CONFIG.lineHeight / 2);
                y += CONFIG.lineHeight;
                // チェックボックス・ボタン非表示
            }
            lineIndex++;
            continue;
        }
        if (isLineEmpty) {
            drawSeparatorLine(ctx, node, y);
            y += CONFIG.emptyLineHeight;
            lineIndex++;
            continue;
        }
        if (isCompactMode && !node.isEditMode) {
            if (isDisabledByLeadingComment) {
                lineIndex++;
                continue;
            }
        }
        linesDrawnCount++;
        let displayLine = line.trimStart();
        if (isDisabledByLeadingComment) {
            displayLine = displayLine.replace(/^\/\/\s*/, '').trimStart();
        }
        const textStartX = CONFIG.sideNodePadding + CONFIG.checkboxSize + CONFIG.spaceBetweenCheckboxAndText;
        drawCheckboxItems(ctx, node, y, isDisabledByLeadingComment, lineIndex);
        const [textToDraw, weight, totalTextWidth] = drawCommentText(ctx, node, displayLine, y, isDisabledByLeadingComment, textStartX);
        const textClickableX = CONFIG.sideNodePadding + CONFIG.checkboxSize + CONFIG.spaceBetweenCheckboxAndText;
        let weightButtonSpace = weight.toFixed(2) !== "1.00"
            ? CONFIG.weightButtonSize * 2 + 4 + CONFIG.weightLabelWidth + 4
            : CONFIG.weightButtonSize * 2 + 4;
        const textClickableWidth = node.size[0] - textClickableX - CONFIG.sideNodePadding - weightButtonSpace;
        node.clickableAreas.push({
            type: 'text_area_suppressor',
            lineIndex: lineIndex,
            x: textClickableX,
            y: y,
            width: textClickableWidth,
            height: CONFIG.lineHeight,
        });
        if (weight !== null) {
            drawWeightButtons(ctx, node, y, lineIndex, weight);
        }
        y += CONFIG.lineHeight;
        lineIndex++;
    }
    const newHeight = y + 10;
    const contentHeight = y - CONFIG.topNodePadding;
    if (!node.isEditMode) {
        if (node.isCompactMode) {
            let targetHeight = contentHeight <= CONFIG.lineHeight
                ? CONFIG.headerHeight + 2
                : newHeight;
            if (node.size[1] !== targetHeight) {
                node.size[1] = targetHeight;
                if (node.onResize) node.onResize();
                node.setDirtyCanvas(true, true);
            }
        } else {
            let desiredHeight = Math.max(newHeight, node.originalHeight || CONFIG.minNodeHeight);
            if (node.size[1] !== desiredHeight) {
                node.size[1] = desiredHeight;
                if (node.onResize) node.onResize();
                node.setDirtyCanvas(true, true);
            }
        }
    }
}
// ========================================
// 3. Extension Registration
// ========================================
app.registerExtension({
    name: "PromptSwitch",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptSwitch") {
            nodeType.prototype.onKeyDown = function(e) {
                const textWidget = findTextWidget(this);
                if (!textWidget) return;
                let actionTaken = false;
                // Shift+E: 全ノード編集モードトグル
                if ((e.key === 'e' || e.key === 'E') && e.shiftKey) {
                    const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
                    if (promptNodes.length === 0) return true;
                    const allInEditMode = promptNodes.every(n => n.isEditMode === true);
                    const targetEditMode = !allInEditMode;
                    for (const node of promptNodes) {
                        const w = findTextWidget(node);
                        if (!w) continue;
                        if (node.isEditMode === targetEditMode) continue;
                        toggleEditMode(node, w, targetEditMode, { skipFocus: true });
                    }
                    app.graph.setDirtyCanvas(true, true);
                    actionTaken = true;
                }
                else if (e.key === 'a' || e.key === 'A') {
                    if (e.shiftKey) {
                        if (this.isEditMode) return false;
                        const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
                        const activeNodes = promptNodes.filter(n => !isNodeExcluded(n, ['a']));
                        const hasActivePrompts = activeNodes.some(n => {
                            const w = findTextWidget(n);
                            if (w) {
                                const lines = w.value.split('\n');
                                return lines.some(line => {
                                    if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) return false;
                                    if (line.trim() === '') return false;
                                    return !isLineDisabled(line);
                                });
                            }
                            return false;
                        });
                        if (!hasActivePrompts) {
                            if (app.canvas.editor && app.canvas.editor.showMessage) {
                                app.canvas.editor.showMessage("All nodes are already deactivated.", 2000);
                            }
                            return true;
                        }
                        deactivateAllPromptSwitchNodes(app);
                        actionTaken = true;
                    } else {
                        textWidget.value = toggleAllPrompts(textWidget.value);
                        actionTaken = true;
                    }
                }
                else if (e.key === 'w' || e.key === 'W') {
                    textWidget.value = resetAllWeights(textWidget.value);
                    actionTaken = true;
                }
                else if (e.key === 'r' || e.key === 'R') {
                    if (e.shiftKey) {
                        const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
                        const targetNodes = promptNodes.filter(n => {
                            const isMuted = n.mode === 2 || n.mode === 4;
                            const isRExcluded = isNodeExcluded(n, ['r']);
                            return !isMuted && !isRExcluded;
                        });
                        for (const node of targetNodes) {
                            const w = findTextWidget(node);
                            if (w) {
                                w.value = randomPickupPrompts(w.value, node);
                                if (w.callback) w.callback(w.value);
                                node.setDirtyCanvas(true, true);
                            }
                        }
                        app.graph.setDirtyCanvas(true, true);
                        actionTaken = true;
                    } else {
                        textWidget.value = randomPickupPrompts(textWidget.value, this);
                        actionTaken = true;
                    }
                }
                else if (e.key === 'v' || e.key === 'V') {
                    if (e.shiftKey) {
                        const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
                        if (promptNodes.length === 0) return true;
                        const togglableNodes = promptNodes.filter(n => !isNodeExcluded(n, ['v']));
                        if (togglableNodes.length === 0) return true;
                        const allAreCompact = togglableNodes.every(n => n.isCompactMode);
                        const targetMode = allAreCompact ? false : true;
                        for (const node of togglableNodes) {
                            if (!node.isEditMode) {
                                node.isCompactMode = targetMode;
                                if (!node.isCompactMode && node.originalHeight && node.size[1] !== node.originalHeight) {
                                    node.size[1] = node.originalHeight;
                                    if (node.onResize) node.onResize();
                                }
                            }
                        }
                        actionTaken = true;
                    } else {
                        if (!this.isEditMode) {
                            this.isCompactMode = !this.isCompactMode;
                            if (!this.isCompactMode && this.originalHeight && this.size[1] !== this.originalHeight) {
                                this.size[1] = this.originalHeight;
                                if (this.onResize) this.onResize();
                            }
                            actionTaken = true;
                        }
                    }
                }
                // 【C / Shift+C】: /C タグのトグル or 全削除
                else if (e.key === 'c' || e.key === 'C') {
                    if (e.shiftKey) {
                        // Shift+C: 全ノードから /C を一括削除
                        const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
                        let changed = false;
                        for (const node of promptNodes) {
                            const currentTitle = node.title || "";
                            const tagMatches = [...currentTitle.matchAll(/\/([^\/\s]*)/g)];
                            if (tagMatches.length === 0) continue;
                            const cleanTags = tagMatches
                                .filter(m => m[1].toLowerCase() !== 'c')
                                .map(m => '/' + m[1]);
                            const nonTagParts = currentTitle.split(/\/[^\/\s]*/);
                            let baseName = nonTagParts[0].trim();
                            let newTitle = baseName;
                            if (cleanTags.length > 0) {
                                if (newTitle && !newTitle.endsWith(' ')) newTitle += ' ';
                                newTitle += cleanTags.join(' ');
                            }
                            newTitle = newTitle.trim();
                            if (node.title !== newTitle) {
                                node.title = newTitle;
                                changed = true;
                            }
                        }
                        if (changed) {
                            app.graph.setDirtyCanvas(true, true);
                        }
                        actionTaken = true;
                    } else {
                        // C: 単体ノードの /C トグル
                        const currentTitle = this.title || "";
                        const tags = parseNodeTags(this);
                        const hasCTag = tags.includes('c');
                        let newTitle = "";
                        if (hasCTag) {
                            const tagMatches = [...currentTitle.matchAll(/\/([^\/\s]*)/g)];
                            const cleanTags = tagMatches
                                .filter(m => m[1].toLowerCase() !== 'c')
                                .map(m => '/' + m[1]);
                            const nonTagParts = currentTitle.split(/\/[^\/\s]*/);
                            let baseName = nonTagParts[0].trim();
                            newTitle = baseName;
                            if (cleanTags.length > 0) {
                                if (newTitle && !newTitle.endsWith(' ')) newTitle += ' ';
                                newTitle += cleanTags.join(' ');
                            }
                        } else {
                            newTitle = currentTitle.trim();
                            if (newTitle && !newTitle.endsWith(' ')) newTitle += ' ';
                            newTitle += '/C';
                        }
                        this.title = newTitle.trim();
                        app.graph.setDirtyCanvas(true, true);
                        actionTaken = true;
                    }
                }
                else if (e.key === 'F2' || (e.key === 'e' || e.key === 'E') && !e.shiftKey) {
                    toggleEditMode(this, textWidget);
                    actionTaken = true;
                }
                else if (e.key === 'F1') {
                    const coreHelpLines = [
                        `PromptSwitch - 主要なショートカット`,
                        `----------------------------------------`,
                        ` F1 : このヘルプを表示`,
                        ` F2/E : 編集モード切替 (ノードの枠のDblClickでも可)`,
                        ` Shift+E : 全ノード編集モードトグル（既に編集中のものは維持）`,
                        ` A : All Prompts (選択ノードの全消し優先トグル切替)`,
                        ` Shift+A: 全ノードを一括で全無効化 (除外: /a)`,
                        ` R : Random Pickup (セクションからランダム選択)`,
                        ` -> タグ: /R2 /R0-5 /R-8-2 (ノードタイトル末尾)`,
                        ` /R0-5: 0~5ランダム(6通り), /R-8-2: -8~2=0~2+外れ8(11通り,負=0選択)`,
                        ` Shift+R: 全ノード一括ランダム (除外: /r)`,
                        ` W : 全てのウェイトをリセット (1.0)`,
                        ` V : Visible/Invisible (選択ノードのトグル)`,
                        ` Shift+V: 全ノード一括トグル (除外: /v)`,
                        ` C : /C タグのトグル（生成前に自動ランダム）`,
                        ` Shift+C : 全ノードから /C タグを一括削除`,
                        ` T : /T タグ（順番に回す）`,
                        ` -> /T → /T2, /T2M3-1 → /T2M3-2 → /T3M3-1`,
                        ``,
                        `【タグは / で区切ってください】`,
                        `例: おまじない/r/a/C　（スペースなしでもOK）`,
                        `→ 全角スペース・タブ・改行も無視`,
                        `複合タグ (/R2a, /var) は無効 → 警告が出ます`,
                        ``,
                        `[操作]`,
                        `・行のクリック: プロンプトのON/OFF切替`,
                        `・[+/-]ボタン: ウェイト調整`,
                        `・ノードタイトル右クリック: 標準メニュー`,
                    ];
                    const fullHelp = coreHelpLines.join('\n');
                    if (app.canvas.editor && app.canvas.editor.showMessage) {
                        app.canvas.editor.showMessage(fullHelp, 8000);
                    } else {
                        alert(fullHelp);
                    }
                    actionTaken = true;
                }
                if (actionTaken) {
                    if (e.key !== 'F1') {
                        if (textWidget.callback) {
                            textWidget.callback(textWidget.value);
                        }
                    }
                    this.setDirtyCanvas(true, true);
                    if (e.shiftKey && (e.key === 'v' || e.key === 'V' || e.key === 'a' || e.key === 'A' || e.key === 'r' || e.key === 'R' || e.key === 'e' || e.key === 'E' || e.key === 'c' || e.key === 'C')) {
                        app.graph.setDirtyCanvas(true, true);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return true;
                }
            };
            this.setupNodeCreatedCallback(nodeType, CONFIG, app);
        }
    },
    setupNodeCreatedCallback(nodeType, config, app) {
        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            if (origOnNodeCreated) {
                origOnNodeCreated.apply(this, arguments);
            }
            const textWidget = findTextWidget(this);
            if (textWidget) {
                if (this.size[0] < CONFIG.minNodeWidth) {
                    this.size[0] = CONFIG.minNodeWidth;
                }
                this.isCompactMode = false;
                this.originalHeight = this.size[1];
                textWidget.value = "";
                if (textWidget.callback) textWidget.callback(textWidget.value);
                this.isEditMode = false;
                textWidget.y = CONFIG.topNodePadding;
                textWidget.options.minHeight = this.size[1] - textWidget.y - 10;
                textWidget.hidden = true;
                const forceHide = (node) => {
                    if (!node.isEditMode) {
                        textWidget.hidden = true;
                    }
                    if (node.setDirtyCanvas) {
                        node.setDirtyCanvas(true, true);
                    }
                };
                setupClickHandler(this, textWidget, app);
                const node = this;
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        forceHide(node);
                    });
                });
                const originalOnAdded = this.onAdded;
                this.onAdded = function() {
                    if (originalOnAdded) originalOnAdded.apply(this, arguments);
                    this.isEditMode = false;
                    textWidget.hidden = true;
                    if (this.size[1] > CONFIG.minNodeHeight) {
                        this.originalHeight = this.size[1];
                    }
                    forceHide(this);
                };
                this.onMouseMove = null;
                const originalOnDblClick = this.onDblClick;
                this.onDblClick = function(e, pos) {
                    const [x, y] = pos;
                    if (y < CONFIG.headerHeight) {
                        if (originalOnDblClick) {
                            return originalOnDblClick.apply(this, arguments);
                        }
                        return true;
                    }
                    const clickedArea = this.findClickedArea(pos);
                    if (clickedArea) {
                        e.preventDefault();
                        e.stopPropagation();
                        return true;
                    }
                    if (!clickedArea && y >= CONFIG.headerHeight) {
                        toggleEditMode(this, textWidget);
                        e.preventDefault();
                        e.stopPropagation();
                        return true;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return true;
                };
                const originalOnDrawForeground = this.onDrawForeground;
                this.onDrawForeground = function(ctx) {
                    if (!this.isEditMode) {
                        drawCheckboxList(this, ctx, textWidget.value, app, this.isCompactMode);
                    }
                    if (originalOnDrawForeground) {
                        originalOnDrawForeground.call(this, ctx);
                    }
                    requestAnimationFrame(() => {
                        if (!this.isEditMode && textWidget && textWidget.hidden !== true) {
                            textWidget.hidden = true;
                            this.setDirtyCanvas(true, true);
                        }
                    });
                };
                const originalOnResize = this.onResize;
                this.onResize = function(size) {
                    if (originalOnResize) originalOnResize.apply(this, arguments);
                    if (textWidget) {
                        const widgetY = CONFIG.topNodePadding;
                        textWidget.y = widgetY;
                        textWidget.options.minHeight = this.size[1] - widgetY - 10;
                        if (this.size[1] > CONFIG.minNodeHeight && !this.isCompactMode) {
                            this.originalHeight = this.size[1];
                        }
                    }
                    this.setDirtyCanvas(true, true);
                };
                if (this.onResize) this.onResize();
                if (this.setDirtyCanvas) this.setDirtyCanvas(true, true);
            }
        };
    }
});
// ===============================================
// 生成前に1回だけランダム（/C タグ）
// /T タグを先に処理（/Cより優先）
// onAfterExecutePrompt での再ランダムは完全に削除
// ===============================================
if (typeof app !== 'undefined') {
    const originalQueuePrompt = app.queuePrompt;
    app.queuePrompt = async function (...args) {
        // /T タグ処理（/Cより先に）
        const tNodes = app.graph._nodes
            .filter(n => n.type === 'PromptSwitch' && parseNodeTags(n).some(t => t.startsWith('t')));
        for (const node of tNodes) {
            const w = findTextWidget(node);
            if (w) {
                applyTTag(node, w, app);
            }
        }

        // /C タグ処理（/T があるノードはスキップ）
        app.graph._nodes
            .filter(n => n.type === 'PromptSwitch' && parseNodeTags(n).includes('c'))
            .filter(n => !parseNodeTags(n).some(t => t.startsWith('t')))  // /T があるならスキップ
            .forEach(n => {
                const w = findTextWidget(n);
                if (w && typeof randomPickupPrompts === 'function') {
                    w.value = randomPickupPrompts(w.value, n);
                    if (w.callback) w.callback(w.value);
                    n.setDirtyCanvas(true, true);
                }
            });

        app.graph.setDirtyCanvas(true, true);
        return await originalQueuePrompt.apply(this, args);
    };

    const originalAfterExec = app.onAfterExecutePrompt || function() {};
    app.onAfterExecutePrompt = function() {
        return originalAfterExec.apply(this, arguments);
    };
}

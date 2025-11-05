// File: web/index.js
// Program: PromptSwitch (ComfyUI-PromptPaletteの改編版)
// PromptSwitch #2890
// カンマの扱いを統一性のあるもの修正
// 改造内容：
// ・Rキーをランダムピックアップ（単一/Shift+Rで全ノード）に置き換え
// ・既存のウェイトリセットRキーをWキーに変更
// ・ヘルプメッセージを更新
// ・【追加】ランダムピックアップ機能拡張（/R<N>, /R<Min>-<Max>, /R-<Max> の指定に対応）
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
// 【/C 挙動】
// ・生成前：初回ランダム（queuePrompt）
// ・1枚生成完了ごと：次のランダム（onNodeExecuted）
// → 32枚生成でも1枚ごとに違うプロンプト！
// → onExecuted → onNodeExecuted に変更（確実）

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
    emptyLineSeparatorColor: "#888",
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
};

// ========================================
// 1. タグパース関数（全角スペース対応 + 複合タグ禁止 + 全タグ抽出）
// ========================================
function parseNodeTags(node) {
    if (!node.title) return [];
    const trimmed = node.title.trim();

    // すべての /tag を抽出（スペースや改行は含まない）
    const tagMatches = [...trimmed.matchAll(/\/([^\s\/]+)/g)];
    if (tagMatches.length === 0) return [];

    const rawTags = tagMatches.map(m => m[1]);

    // 全角スペース・タブ・改行を半角スペースに変換 → 統一
    const normalizedTags = rawTags.map(tag =>
        tag
            .replace(/[\u{3000}\u{2002}\u{2003}\u{2004}\u{2005}\u{2009}\u{200A}\u{202F}\u{205F}\t\n\r]+/gu, ' ')
            .trim()
    ).filter(t => t);

    if (normalizedTags.length === 0) return [];

    // 無効タグチェック
    const invalid = normalizedTags.some(tag => {
        if (/^R[\d-]*$/i.test(tag)) return false; // /R3, /R1-5
        if (/^[avrc]$/i.test(tag)) return false; // /a, /v, /r, /c
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

function toggleEditMode(node, textWidget) {
    node.isEditMode = !node.isEditMode;
    textWidget.hidden = !node.isEditMode;
    if (node.isEditMode && textWidget.inputEl) {
        textWidget.inputEl.focus();
        textWidget.inputEl.selectionStart = textWidget.inputEl.selectionEnd = textWidget.inputEl.value.length;
    }
    node.setDirtyCanvas(true);
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

function getRTagSelectionRange(node) {
    const tags = parseNodeTags(node);
    const rTag = tags.find(t => t.startsWith('r'));
    if (!rTag || rTag === 'r') return [1, 1];
    const value = rTag.substring(1);
    if (value.includes('-')) {
        const parts = value.split('-');
        let min = parts[0] === '' ? 1 : parseInt(parts[0]);
        let max = parseInt(parts[1]);
        if (isNaN(min) || isNaN(max) || min > max || min < 0 || max < 0) return [1, 1];
        return [min, max];
    } else {
        const count = parseInt(value);
        if (isNaN(count) || count < 0) return [1, 1];
        return [count, count];
    }
}

function randomPickupPrompts(text, node) {
    const lines = text.split('\n');
    const commentPrefix = "// ";
    const prefixRegex = /^\s*\/\/\s*/;
    const [globalMinSelection, globalMaxSelection] = getRTagSelectionRange(node);

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
            if (line.trim() !== '') validPromptIndices.push(i);
        }
        const numValidPrompts = validPromptIndices.length;
        if (numValidPrompts === 0) {
            newLines.push(...section);
            continue;
        }
        let minSelect = globalMinSelection;
        let maxSelect = globalMaxSelection;
        maxSelect = Math.min(maxSelect, numValidPrompts);
        minSelect = Math.min(minSelect, maxSelect);
        let numToSelect = minSelect === maxSelect
            ? minSelect
            : Math.floor(Math.random() * (maxSelect - minSelect + 1)) + minSelect;

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

                if (e.key === 'a' || e.key === 'A') {
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
                else if (e.key === 'F2' || e.key === 'E' || e.key === 'e') {
                    toggleEditMode(this, textWidget);
                    actionTaken = true;
                }
                else if (e.key === 'F1') {
                    const coreHelpLines = [
                        `PromptSwitch - 主要なショートカット`,
                        `----------------------------------------`,
                        `F1 : このヘルプを表示`,
                        `F2/E : 編集モード切替 (ノードの枠のDblClickでも可)`,
                        `A : All Prompts (選択ノードの全消し優先トグル切替)`,
                        `Shift+A: 全ノードを一括で全無効化 (除外: /a)`,
                        `R : Random Pickup (セクションからランダム選択)`,
                        ` -> タグ: /R2 /R1-3 /R-3 (ノードタイトル末尾)`,
                        `Shift+R: 全ノード一括ランダム (除外: /r)`,
                        `W : 全てのウェイトをリセット (1.0)`,
                        `V : Visible/Invisible (選択ノードのトグル)`,
                        `Shift+V: 全ノード一括トグル (除外: /v)`,
                        `C : Auto Random (生成前 + 1枚ごとにランダム)`,
                        ``,
                        `【タグは / で区切ってください】`,
                        `例: MyNode /v　/a /R0-3 /C`,
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
                    if (e.shiftKey && (e.key === 'v' || e.key === 'V' || e.key === 'a' || e.key === 'A' || e.key === 'r' || e.key === 'R')) {
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

                // 編集モード開始防止
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
                        forceHide(this);
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
// 初回 + 1枚ごとにランダム（queuePrompt + onNodeExecuted）
// ===============================================
if (typeof app !== 'undefined') {
    const originalQueuePrompt = app.queuePrompt;
    app.queuePrompt = async function (...args) {
        // 初回ランダム（1枚目用）
        app.graph._nodes
            .filter(n => n.type === 'PromptSwitch' && parseNodeTags(n).includes('c'))
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

    // 2枚目以降：1枚ごとに確実にランダム
    const originalOnNodeExecuted = app.graph.onNodeExecuted || function() {};
    app.graph.onNodeExecuted = function(node) {
        originalOnNodeExecuted.call(this, node);

        if (node.type !== 'PromptSwitch') return;
        const tags = parseNodeTags(node);
        if (!tags.includes('c')) return;

        const textWidget = findTextWidget(node);
        if (!textWidget || typeof randomPickupPrompts !== 'function') return;

        textWidget.value = randomPickupPrompts(textWidget.value, node);
        if (textWidget.callback) {
            textWidget.callback(textWidget.value);
        }
        node.setDirtyCanvas(true, true);
        app.graph.setDirtyCanvas(true, true);
    };
}

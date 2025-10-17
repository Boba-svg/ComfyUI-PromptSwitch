// File: web/index.js
// Program: PromptSwitch (ComfyUI-PromptPaletteの改編版)
// PromptSwitch 最終統合版: ID(#2892) - プレフィックスによる除外機能（※, -）を削除。除外は末尾タグのみに統一。

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
    ENABLE_DBLCLICK_TOGGLE: true,
    ENABLE_R_KEY_RESET: true,
    
    // Shift+Aの実行前確認ダイアログを制御 (機能は残し、デフォルトでOFF)
    ENABLE_SHIFT_A_CONFIRMATION: false,
    
    // ノード内のバージョン表記（// #2892 ...）の表示/非表示を制御
    ENABLE_VERSION_TEXT: false, // true: 表示, false: 非表示
    
    // 最終ID 
    FIXED_ID: "#2892", 
    // バージョン表記のテキスト
    VERSION_COMMENT_TEXT: "// #2892 PromptSwitch",
    
    // カラーパレット
    COLOR_PROMPT_ON: "#FFF",
    COLOR_COMMENT_ON: "#ADD8E6",
    COLOR_PROMPT_OFF: "#AAAAAA",
    COLOR_COMMENT_OFF: "#AAAAAA",
};

let globalConfirmationActive = false;

// ========================================
// 1. UI Control Helper Functions
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

/**
 * ノードタイトルが指定された除外キーに該当するかどうかを判定する
 * 除外キーはノードタイトルの末尾に /key の形式で指定されている必要がある
 * (例: Shift+A除外は isNodeExcluded(node, ['a']), Shift+V除外は isNodeExcluded(node, ['v']) )
 * 複合指定も可能 (例: /av, /va)
 * * **ver #2892: プレフィックス（※, -）による除外ロジックは削除されました。**
 * * @param {object} node - 対象のノードオブジェクト
 * @param {string[]} keys - 判定したい除外キーの配列 (例: ['a'], ['v'])
 * @returns {boolean} - 除外対象であれば true
 */
function isNodeExcluded(node, keys) {
    if (!node.title) return false;
    const trimmedTitle = node.title.trim();
    
    // ----------------------------------------------------
    // 既存の除外プレフィックス ('※' または '-') のチェックを削除
    // ----------------------------------------------------

    // ノードタイトルから最後の '/tag' 部分を抽出してチェック
    // 末尾の / で始まり、英字小文字で終わる部分を抽出 (大文字・小文字を無視)
    const tagMatch = trimmedTitle.match(/\/([a-z]+)$/i);
    if (!tagMatch) {
        return false;
    }
    
    const tagString = tagMatch[1].toLowerCase(); // 例: 'av'
    
    // 指定されたキーのいずれかがタグ文字列に含まれていれば除外
    for (const key of keys) {
        if (tagString.includes(key)) {
            return true;
        }
    }
    
    return false;
}

/**
 * プロンプト行がコメントアウトされているか（無効化されているか）を判定する
 */
function isLineDisabled(line) {
    const trimmedLine = line.trimStart();
    const isVersionLine = trimmedLine === CONFIG.VERSION_COMMENT_TEXT.trimStart();
    const isEmpty = trimmedLine === '';
    
    if (isVersionLine || isEmpty) return false;
    
    return trimmedLine.startsWith('//');
}

/**
 * 全てのプロンプトの有効/無効を一括で切り替える (Aキーのトグル用)
 */
function toggleAllPrompts(text) {
    const lines = text.split('\n');
    const commentPrefix = "// ";
    const prefixRegex = /^\s*\/\/\s*/;

    let needsDeactivation = false;
    for (const line of lines) {
        if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) continue;
        if (line.trim() === CONFIG.VERSION_COMMENT_TEXT.trimStart()) continue;
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
        const isVersionLine = trimmedLine === CONFIG.VERSION_COMMENT_TEXT.trimStart();
        
        if (isVersionLine || trimmedLine === '') {
            return line;
        }

        if (targetMode === 'ON') {
            if (isCommented) {
                return line.replace(prefixRegex, '').trimStart();
            }
        } else { // targetMode === 'OFF'
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

/**
 * プロンプトテキストを強制的に全無効化（コメントアウト）する
 */
function deactivatePromptText(text) {
    const lines = text.split('\n');
    const commentPrefix = "// ";
    
    const newLines = lines.map(line => {
        if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) {
            return line;
        }
        
        let trimmedLine = line.trimStart();
        const isCommented = trimmedLine.startsWith('//');
        const isVersionLine = trimmedLine === CONFIG.VERSION_COMMENT_TEXT.trimStart();
        
        if (isVersionLine || trimmedLine === '') {
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

/**
 * 全ての PromptSwitch ノードを全無効化する
 */
function deactivateAllPromptSwitchNodes(app) {
    const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
    
    for (const node of promptNodes) {
        // Shift+A除外ロジック: 除外キー 'a'
        if (isNodeExcluded(node, ['a'])) { 
            continue; // スキップ
        }
        
        const textWidget = findTextWidget(node);
        if (textWidget) {
            textWidget.value = deactivatePromptText(textWidget.value);
            if (textWidget.callback) {
                textWidget.callback(textWidget.value);
            }
        }
    }
    app.graph.setDirtyCanvas(true, true);
    if (app.canvas.editor && app.canvas.editor.showMessage) {
        const messagePrefix = CONFIG.ENABLE_SHIFT_A_CONFIRMATION ? "✅" : "💥 [確認スキップ]";
        app.canvas.editor.showMessage(`${messagePrefix} 全ての PromptSwitch ノードを無効化しました。`, 3000);
    }
}


/**
 * モード切り替えロジックを分離
 */
function toggleEditMode(node, textWidget) {
    node.isEditMode = !node.isEditMode;
    textWidget.hidden = !node.isEditMode;
    
    if (node.isEditMode && textWidget.inputEl) {
        textWidget.inputEl.focus();
        textWidget.inputEl.selectionStart = textWidget.inputEl.selectionEnd = textWidget.inputEl.value.length;
    }
    
    node.setDirtyCanvas(true);
}

/**
 * プロンプト行からウェイトと括弧を分離するヘルパー
 */
function stripOuterParenthesesAndWeight(text) {
    let currentWeight = 1.0;
    let processedText = text.trim();

    let matchWithWeight = processedText.match(/^\s*\((.*)\s*:\s*([\d\.\-]+)\s*\)\s*$/);
    
    if (matchWithWeight) {
        currentWeight = parseFloat(matchWithWeight[2]);
        processedText = matchWithWeight[1].trim();
        return [processedText, currentWeight];
    }
    
    let matchOnlyParens = processedText.match(/^\s*\((.*)\)\s*$/);
    if (matchOnlyParens) {
        processedText = matchOnlyParens[1].trim();
    }
    
    return [processedText, currentWeight];
}

/**
 * 全てのプロンプトのウェイトを 1.0 にリセットする (Rキー用)
 */
function resetAllWeights(text) {
    const lines = text.split('\n');
    
    const newLines = lines.map(line => {
        let originalLeadingSpaces = line.match(/^(\s*)/)[0];
        let trimmedLine = line.trimStart();

        if (trimmedLine === CONFIG.VERSION_COMMENT_TEXT.trimStart() || trimmedLine === '') return line;

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
        
        let newPromptPart = promptBody;
        
        return originalLeadingSpaces + prefix + newPromptPart + commentPart;
    });

    return newLines.join('\n');
}

/**
 * 特定の行のプロンプトウェイトを調整
 */
function adjustWeightInText(text, lineIndex, delta) {
    const lines = text.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return text;

    let line = lines[lineIndex];
    let originalLeadingSpaces = line.match(/^(\s*)/)[0];
    let trimmedLine = line.trimStart();

    if (trimmedLine === CONFIG.VERSION_COMMENT_TEXT.trimStart()) return text;

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

    let [promptBody, currentWeight] = stripOuterParenthesesAndWeight(promptPartWithWeight);
    
    if (promptBody === '') {
         promptBody = promptPartWithWeight;
    }
    
    let newWeight = Math.min(CONFIG.maxWeight, Math.max(CONFIG.minWeight, currentWeight + delta));
    newWeight = Math.round(newWeight * 100) / 100;
    
    let newPromptPart = "";
    
    if (newWeight.toFixed(2) !== "1.00" || currentWeight.toFixed(2) !== "1.00" || delta !== 0) {
         newPromptPart = `(${promptBody}:${newWeight})`;
    } else {
         newPromptPart = promptBody;
    }
    
    lines[lineIndex] = originalLeadingSpaces + prefix + newPromptPart + commentPart;
    
    return lines.join('\n');
}

/**
 * 特定の行のコメント（有効/無効）を切り替える
 */
function toggleCommentOnLine(text, lineIndex) {
    const lines = text.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return text;

    let line = lines[lineIndex];
    
    if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/) || line.trim() === CONFIG.VERSION_COMMENT_TEXT.trim()) return text;
    
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

/**
 * クリックされたエリア（チェックボックス/ウェイトボタン）を特定
 */
function findClickedArea(pos) {
    const [x, y] = pos;
    for (const area of this.clickableAreas) {
        if (x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height) {
            return area;
        }
    }
    return null;
}

/**
 * クリックされたエリアに応じてアクションを実行
 */
function handleClickableAreaAction(area, textWidget, app) {
    if (area.type === 'checkbox' || area.type === 'text_area_suppressor') {
        textWidget.value = toggleCommentOnLine(textWidget.value, area.lineIndex);
    } else if (area.type === 'weight_increase') {
        textWidget.value = adjustWeightInText(textWidget.value, area.lineIndex, CONFIG.WEIGHT_STEP);
    } else if (area.type === 'weight_decrease') {
        textWidget.value = adjustWeightInText(textWidget.value, area.lineIndex, -CONFIG.WEIGHT_STEP);
    }
    
    if (textWidget.callback) {
        textWidget.callback(textWidget.value);
    }
    app.graph.setDirtyCanvas(true, true);
}


/**
 * チェックボックス/ウェイトボタンのクリックハンドラを設定
 */
function setupClickHandler(node, textWidget, app) {
    node.clickableAreas = [];
    node.findClickedArea = findClickedArea;
    node.handleClickableAreaAction = handleClickableAreaAction;
    
    const originalOnMouseDown = node.onMouseDown;
    node.onMouseDown = function(e, pos) {
        if (this.isEditMode) {
            if (originalOnMouseDown) { originalOnMouseDown.apply(this, arguments); }
            return;
        }

        const [x, y] = pos;
        
        if (y < CONFIG.headerHeight) {
            if (originalOnMouseDown) { originalOnMouseDown.apply(this, arguments); }
            return;
        }
        
        const clickedArea = this.findClickedArea(pos);
        
        if (clickedArea) {
            
            // 左クリック (e.which === 1) のみアクションを実行
            if (e.which === 1) {
                if (clickedArea.type !== 'empty_space_for_dblclick' && clickedArea.type !== 'version_info') {
                    this.handleClickableAreaAction(clickedArea, textWidget, app);
                }
                e.preventDefault();
                e.stopPropagation();
            }
            else if (e.which === 3) { // 右クリックはデフォルトの動作に任せる（ノードメニューが出る）
                e.stopPropagation();
            }
        } else {
            // 空白部分のクリック
            if (originalOnMouseDown) { originalOnMouseDown.apply(this, arguments); }
        }
    };
    
    const originalOnMouseUp = node.onMouseUp;
    node.onMouseUp = function(e, pos) {
        if (originalOnMouseUp) { originalOnMouseUp.apply(this, arguments); }
    };
    
    const originalOnContextMenu = node.onContextMenu;
    node.onContextMenu = function(e) {
        if (originalOnContextMenu) {
            return originalOnContextMenu.apply(this, arguments);
        }
        return true;
    }
}

/**
 * 空行に区切り線を描画するヘルパー
 */
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

/**
 * コメントの状態とウェイトを考慮してテキストを描画
 */
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

        let matchWithWeight = processedText.match(/^\s*\((.*)\s*:\s*([\d\.\-]+)\s*\)\s*$/);
        
        if (matchWithWeight) {
            currentWeight = parseFloat(matchWithWeight[2]);
            processedText = matchWithWeight[1].trim();
            return [processedText, currentWeight];
        }
        
        let matchOnlyParens = processedText.match(/^\s*\((.*)\)\s*$/);
        if (matchOnlyParens) {
            processedText = matchOnlyParens[1].trim();
        }
        
        return [processedText, currentWeight];
    }

    if (firstCommentIndex === -1) {
        let beforeText = trimLine;
        
        [beforeText, weight] = stripOuterParenthesesAndWeightLocal(beforeText);
        
        let textToDisplay = beforeText;
        
        if (textToDisplay.length > CONFIG.PROMPT_MAX_LENGTH_DISPLAY) {
            textToDisplay = textToDisplay.substring(0, CONFIG.PROMPT_MAX_LENGTH_DISPLAY) + '...';
        }
        
        let currentPromptFontSize = promptFontSize;
        
        ctx.font = `${currentPromptFontSize}px ${CONFIG.FONT_FAMILY}`;
        ctx.fillStyle = colorPrompt;
        ctx.fillText(textToDisplay, currentX, y + CONFIG.lineHeight / 2);
        totalTextWidth = ctx.measureText(textToDisplay).width;
        
    } else {
        let beforeText = trimLine.substring(0, firstCommentIndex).trim();
        let afterComment = trimLine.substring(firstCommentIndex + 2);
        
        beforeText = beforeText.replace(/[\s,]+$/, '');
        
        [beforeText, weight] = stripOuterParenthesesAndWeightLocal(beforeText);
        
        let textToDisplay = beforeText;
        
        const PROMPT_DISPLAY_MAX = 20;
        
        if (textToDisplay.length > PROMPT_DISPLAY_MAX) {
            textToDisplay = textToDisplay.substring(0, PROMPT_DISPLAY_MAX) + '...';
        }
        
        let currentPromptFontSize = promptFontSize;

        ctx.font = `${currentPromptFontSize}px ${CONFIG.FONT_FAMILY}`;
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

/**
 * チェックボックスと、それに対応するクリックエリアを描画
 */
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

/**
 * ウェイト調整ボタン (+/-) を描画
 */
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

/**
 * チェックボックスとテキストリストを描画 (ノードのサイズ調整ロジックを修正)
 */
function drawCheckboxList(node, ctx, text, app, isCompactMode) {
    node.clickableAreas = [];
    const lines = text.split('\n');
    
    let y = CONFIG.topNodePadding;
    let lineIndex = 0;
    
    let linesDrawnCount = 0; // 実際に描画された行数 (空行/コメント行含む)

    for (const line of lines) {
        
        const isInternalDisabled = line.match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/);
        if (isInternalDisabled) {
            lineIndex++;
            continue;
        }
        
        const isLineEmpty = line.trim() === '';
        const isVersionLine = line.trim() === CONFIG.VERSION_COMMENT_TEXT.trim();
        const isDisabledByLeadingComment = line.trimStart().startsWith('//');
        
        // 空行の描画チェックを最優先
        if (isLineEmpty) {
            drawSeparatorLine(ctx, node, y);
            y += CONFIG.emptyLineHeight;
            lineIndex++;
            continue;
        }

        // ENABLE_VERSION_TEXT が false の場合、バージョン行は描画もカウントもスキップ
        if (isVersionLine && !CONFIG.ENABLE_VERSION_TEXT) {
            lineIndex++;
            continue;
        }

        // ノード固有のコンパクトモードを参照
        if (isCompactMode && !node.isEditMode) {
            // バージョン情報行、空行、コメント行は非表示
            if (isVersionLine || isDisabledByLeadingComment) {
                lineIndex++;
                continue;
            }
        }
        
        // 描画処理
        linesDrawnCount++;
        
        let displayLine = line.trimStart();
        if (isDisabledByLeadingComment) {
            displayLine = displayLine.replace(/^\/\/\s*/, '').trimStart();
        }
        
        const textStartX = CONFIG.sideNodePadding + CONFIG.checkboxSize + CONFIG.spaceBetweenCheckboxAndText;

        drawCheckboxItems(ctx, node, y, isDisabledByLeadingComment, lineIndex);

        const [textToDraw, weight, totalTextWidth] = drawCommentText(
            ctx, node, displayLine, y, isDisabledByLeadingComment, textStartX
        );
        
        const textClickableX = CONFIG.sideNodePadding + CONFIG.checkboxSize + CONFIG.spaceBetweenCheckboxAndText;
        
        let weightButtonSpace = 0;
        
        if (weight.toFixed(2) !== "1.00") {
            weightButtonSpace = CONFIG.weightButtonSize * 2 + 4 + CONFIG.weightLabelWidth + 4;
        } else {
            weightButtonSpace = CONFIG.weightButtonSize * 2 + 4;
        }
        
        const textClickableWidth = node.size[0] - textClickableX - CONFIG.sideNodePadding - weightButtonSpace;
        
        // クリックでON/OFF切り替えができるエリア
        node.clickableAreas.push({
            type: isVersionLine ? 'version_info' : 'text_area_suppressor',
            lineIndex: lineIndex,
            x: textClickableX,
            y: y,
            width: textClickableWidth,
            height: CONFIG.lineHeight,
        });
        
        // バージョン行はウェイトボタンを描画しない
        if (weight !== null && !isVersionLine) {
            drawWeightButtons(ctx, node, y, lineIndex, weight);
        }

        y += CONFIG.lineHeight;
        lineIndex++;
    }
    
    // ノードの自動リサイズロジック（isCompactModeを参照）
    const newHeight = y + 10;
    
    // ヘッダー部分を除いた、実際に描画された行のコンテンツの高さ
    const contentHeight = y - CONFIG.topNodePadding;

    if (!node.isEditMode) {
        if (node.isCompactMode) {
            
            let targetHeight;
            
            // 有効な行がない場合はヘッダーの最小サイズに強制
            if (contentHeight <= CONFIG.lineHeight) {
                targetHeight = CONFIG.headerHeight + 2; // ヘッダーの最小サイズに強制 (42px)
            } else {
                // 有効な行が1行以上ある場合
                targetHeight = newHeight; // 有効な行に必要な高さに合わせる
            }

            if (node.size[1] !== targetHeight) {
                node.size[1] = targetHeight;
                if (node.onResize) { node.onResize(); }
                node.setDirtyCanvas(true, true);
            }
        } else {
            // 通常モード（Grow）に戻す際
            
            let desiredHeight = Math.max(newHeight, node.originalHeight || CONFIG.minNodeHeight);

            if (node.size[1] !== desiredHeight) {
                node.size[1] = desiredHeight;
                if (node.onResize) { node.onResize(); }
                node.setDirtyCanvas(true, true);
            }
        }
    }
}


// ========================================
// 2. Extension Registration
// ========================================

app.registerExtension({
    name: "PromptSwitch",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptSwitch") {
            
            // グローバルなキーダウンリスナーの設定 (ENABLE_SHIFT_A_CONFIRMATION: true の場合に機能) 
            if (!app.shiftAConfirmationSetup) {
                document.addEventListener('keydown', (e) => {
                    // ENABLE_SHIFT_A_CONFIRMATION が false の場合、このリスナーは動作しない
                    if (!CONFIG.ENABLE_SHIFT_A_CONFIRMATION) return;
                    
                    if (globalConfirmationActive) {
                        
                        const key = e.key.toLowerCase();
                        
                        if (key === 'escape' || key === 'n') {
                            globalConfirmationActive = false;
                            if (app.canvas.editor && app.canvas.editor.showMessage) {
                                app.canvas.editor.showMessage("❌ 全ノード無効化をキャンセルしました。", 2000);
                            }
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        else if (key === 'y' || key === 'a' || (e.key === 'a' && e.shiftKey)) {
                            deactivateAllPromptSwitchNodes(app);
                            globalConfirmationActive = false;
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                }, true); // キャプチャフェーズで処理
                
                app.shiftAConfirmationSetup = true;
            }
            // グローバルなキーダウンリスナー設定ここまで


            // A/D/F2/E/R/V キーショートカット
            nodeType.prototype.onKeyDown = function(e) {
                const textWidget = findTextWidget(this);
                if (!textWidget) return;

                // グローバル確認ダイアログが表示中の場合は、ノード内の処理はスキップ
                if (globalConfirmationActive) {
                    e.preventDefault();
                    e.stopPropagation();
                    return true;
                }

                let actionTaken = false;
                
                if (e.key === 'a' || e.key === 'A') {
                    
                    if (e.shiftKey) { // Shift+A: 全ノード全無効化（確認付き、またはスキップ）
                        
                        // 編集モード中は動作させない
                        if (this.isEditMode) return false;
                        
                        // 全ての PromptSwitch ノードに有効なプロンプト行があるかチェック (除外ノードはスキップ)
                        const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
                        
                        // Shift+Aの除外キー: 'a'
                        const activeNodes = promptNodes.filter(n => !isNodeExcluded(n, ['a']));

                        const hasActivePrompts = activeNodes.some(n => {
                            const w = findTextWidget(n);
                            if (w) {
                                const lines = w.value.split('\n');
                                return lines.some(line => {
                                    if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) return false;
                                    if (line.trim() === CONFIG.VERSION_COMMENT_TEXT.trimStart()) return false;
                                    if (line.trim() === '') return false;
                                    return !isLineDisabled(line);
                                });
                            }
                            return false;
                        });
                        
                        if (!hasActivePrompts) {
                            if (app.canvas.editor && app.canvas.editor.showMessage) {
                                app.canvas.editor.showMessage("ℹ️ 全てのノードが既に無効化されています。", 2000);
                            }
                            return true;
                        }

                        // ENABLE_SHIFT_A_CONFIRMATION の値に応じて動作を分岐
                        if (CONFIG.ENABLE_SHIFT_A_CONFIRMATION) {
                            
                            const message = [
                                `⚠️ 全ての PromptSwitch ノードのプロンプトを無効化（全消し）します。`,
                                `    (除外タグ: /a /av /va)`,
                                ``,
                                `続行しますか？`,
                                `[Y]es / [A]ct / [Shift+A]: 実行`,
                                `[N]o / [Esc]: キャンセル`,
                            ].join('\n');
                            
                            if (app.canvas.editor && app.canvas.editor.showMessage) {
                                app.canvas.editor.showMessage(message, 8000);
                            } else {
                                if (!confirm(message.replace(/\n\n/, '\n').replace(/\n/g, ' '))) {
                                    return true;
                                }
                                deactivateAllPromptSwitchNodes(app);
                                return true;
                            }

                            globalConfirmationActive = true;
                            
                        } else {
                            // 確認をスキップして即時実行
                            deactivateAllPromptSwitchNodes(app);
                        }
                        
                        actionTaken = true;

                    } else {
                        // Aキー単独: 選択ノードのトグル
                        textWidget.value = toggleAllPrompts(textWidget.value);
                        actionTaken = true;
                    }
                }
                
                else if (e.key === 'r' || e.key === 'R') {
                    if (CONFIG.ENABLE_R_KEY_RESET) {
                        textWidget.value = resetAllWeights(textWidget.value);
                        actionTaken = true;
                    }
                }
                
                // V/Shift+V: Visible/Invisible トグル
                else if (e.key === 'v' || e.key === 'V') {
                    
                    if (e.shiftKey) { // Shift+V: 全ノード一括トグル
                        
                        const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
                        if (promptNodes.length === 0) return true;

                        // Shift+Vの除外キー: 'v'
                        const togglableNodes = promptNodes.filter(n => !isNodeExcluded(n, ['v']));

                        if (togglableNodes.length === 0) return true;

                        const allAreCompact = togglableNodes.every(n => n.isCompactMode);
                        const targetMode = allAreCompact ? false : true;

                        for (const node of togglableNodes) { // 除外されたノードはスキップ
                            if (!node.isEditMode) {
                                node.isCompactMode = targetMode;
                                
                                if (!node.isCompactMode) {
                                    if (node.originalHeight && node.size[1] !== node.originalHeight) {
                                        node.size[1] = node.originalHeight;
                                        if (node.onResize) node.onResize();
                                    }
                                }
                            }
                        }
                        actionTaken = true;
                        
                    } else { // Vキー単独: 選択ノードのトグル
                        
                        if (!this.isEditMode) {
                            this.isCompactMode = !this.isCompactMode;
                            
                            if (!this.isCompactMode) {
                                if (this.originalHeight && this.size[1] !== this.originalHeight) {
                                    this.size[1] = this.originalHeight;
                                    if (this.onResize) {
                                        this.onResize();
                                    }
                                }
                            }
                            actionTaken = true;
                        }
                    }
                }
                
                else if (e.key === 'F2' || e.key === 'e' || e.key === 'E') {
                    toggleEditMode(this, textWidget);
                    actionTaken = true;
                }
                
                else if (e.key === 'F1') {
                    
                    const confirmationStatus = CONFIG.ENABLE_SHIFT_A_CONFIRMATION ? "（確認あり）" : "（確認なし/即時実行）";
                    
                    const coreHelpLines = [
                        `PromptSwitch ${CONFIG.FIXED_ID} - 主要なショートカット`,
                        `----------------------------------------`,
                        `F1    : このヘルプを表示`,
                        `F2/E  : 編集モード切替 (ノードの枠のDblClickでも可)`,
                        `A     : All Prompts (選択ノードの全消し優先トグル切替)`,
                        `Shift+A: 全ノードを一括で全無効化 ${confirmationStatus}`, 
                        `      (除外タグ: /a, /av, /va)`,
                        `R     : 全てのウェイトをリセット (1.0)`,
                        `V     : Visible/Invisible (選択ノードのトグル切替)`,
                        `Shift+V: 全てのノードをVisible/Invisibleで一括トグル切替`,
                        `      (除外タグ: /v, /av, /va)`,
                        ``,
                        `[設定]`,
                        `Shift+Aの確認: index.js内のCONFIG.ENABLE_SHIFT_A_CONFIRMATIONで制御されます。`, 
                        `バージョン表記: index.js内のCONFIG.ENABLE_VERSION_TEXTで制御されます。`,
                        `Rキー機能のON/OFFは、index.js内のCONFIG.ENABLE_R_KEY_RESETで制御されます。`,
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
                    if (e.shiftKey && (e.key === 'v' || e.key === 'V' || e.key === 'a' || e.key === 'A')) {
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

                if (!textWidget.value || textWidget.value.trim() === '' || textWidget.value.trim().indexOf(CONFIG.FIXED_ID) === -1) {
                    
                    let containsOldVersion = false;
                    const oldVersionRegex = /^\s*\/\/\s*#?\d+\s*PromptSwitch.*?\s*-\s*\(F2\/DblClick to Edit\)\s*\n*/gm;
                    let currentValue = textWidget.value || "";
                    
                    if (currentValue.match(oldVersionRegex)) {
                        currentValue = currentValue.replace(oldVersionRegex, '').trimStart();
                        containsOldVersion = true;
                    }
                    
                    let newContent = currentValue;
                    
                    // ENABLE_VERSION_TEXT が true の場合のみバージョンコメントを追加
                    if (CONFIG.ENABLE_VERSION_TEXT) {
                        if (!newContent.startsWith(CONFIG.VERSION_COMMENT_TEXT.trim())) {
                            newContent = CONFIG.VERSION_COMMENT_TEXT + "\n" + newContent;
                        }
                    } else {
                        // バージョン表記が不要な場合、もし残っていれば削除（新しいノードには残らない）
                        newContent = newContent.replace(new RegExp(`^${CONFIG.VERSION_COMMENT_TEXT.trim()}\\n?`), '').trimStart();
                    }
                    
                    if (newContent.trim() === "") {
                        // バージョン非表示設定でも空行を描画できるように、最低限の改行を確保
                        textWidget.value = CONFIG.ENABLE_VERSION_TEXT ? CONFIG.VERSION_COMMENT_TEXT + "\n\n" : "\n\n";
                    } else {
                        textWidget.value = newContent;
                    }


                    if (textWidget.callback) {
                        textWidget.callback(textWidget.value);
                    }
                }
                
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
                
                setTimeout(() => { forceHide(this); }, 100);
                
                const originalOnAdded = this.onAdded;
                this.onAdded = function() {
                    if (originalOnAdded) { originalOnAdded.apply(this, arguments); }
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
                    if (CONFIG.ENABLE_DBLCLICK_TOGGLE) {
                        
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
                        
                    } else {
                             if (originalOnDblClick) {
                                 return originalOnDblClick.apply(this, arguments);
                                }
                    }
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
                    
                    forceHide(this);
                };

                const originalOnResize = this.onResize;
                this.onResize = function(size) {
                    if (originalOnResize) { originalOnResize.apply(this, arguments); }
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

                if (this.onResize) { this.onResize(); }
                if (this.setDirtyCanvas) { this.setDirtyCanvas(true, true); }
            }
        };
    }

});

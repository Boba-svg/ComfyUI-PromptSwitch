// File: web/index.js
// Program: PromptSwitch (ComfyUI-PromptPaletteの改編版)
// PromptSwitch #2896
// 2025-11-15 /CMn-k（Chaos Multi）機能 完全実装＋全バグ修正完了
// 2025-11-16 /T（Turn）タグ 完全実装完了（count < max時はcurrent固定、max到達でcurrent+1 & count=1）
// ・/T と /C|/CM が競合時は /T 完全優先、警告表示
// ・queuePrompt時のみ実行、onAfterExecutePromptでは実行しない
// ・callback呼び出し完全禁止 → 編集モード暴走ゼロ
// ・描画関係は一切変更なし
import { app } from "../../scripts/app.js";
const CONFIG = {
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
    COLOR_PROMPT_ON: "#FFF",
    COLOR_COMMENT_ON: "#ADD8E6",
    COLOR_PROMPT_OFF: "#AAAAAA",
    COLOR_COMMENT_OFF: "#AAAAAA",
    CommentLine_LineColor: "#888",
    CommentLine_Height: 4,
    CommentLine_FontColor: "#ADD8E6",
};

// ========================================
// 1. タグパース関数（/T 単体を正式に許可）
// ========================================
function parseNodeTags(node) {
    if (!node.title) return [];
    const trimmed = node.title.trim();
    const tagMatches = [...trimmed.matchAll(/\/([^\/\s]*)/g)];
    if (tagMatches.length === 0) return [];
    const rawTags = tagMatches.map(m => m[1]);
    const normalizedTags = rawTags.map(tag =>
        tag.replace(/[\u{3000}\t\n\r]+/gu, ' ').trim()
    ).filter(t => t);
    if (normalizedTags.length === 0) return [];
    const invalid = normalizedTags.some(tag => {
        if (/^R[\d-]*$/i.test(tag)) return false;
        if (/^[avrc]$/i.test(tag)) return false;
        if (/^T\d*M?\d*-?\d*$/i.test(tag)) return false;  // ← ここ変更：/T 単体許可
        if (/^CM\d*(?:-\d+)?$/i.test(tag)) return false;
        if (/^Compact$/i.test(tag)) return false;   // ← この1行を追加！！
        return true;
    });
    if (invalid) {
        console.warn(`[PromptSwitch] 無効なタグ: /${rawTags.join('/')} → /で区切ってください。`);
        return [];
    }
    return normalizedTags.map(t => t.toLowerCase());
}

// ========================================
// 2. UI Control Helper Functions（変更なし）
// ========================================
function findTextWidget(node) {
    if (!node.widgets) return null;
    for (const w of node.widgets) {
        if (w.name === "text") return w;
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
    // トグル対象外パターンの正規表現（半角・全角スペース対応）
    const excludePattern = /^\s*\/\/\s*,\s*\/\/\s*/;  // ← ここ変更（$ 削除）

    let needsDeactivation = false;
    for (const line of lines) {
        if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) continue;
        if (line.trim() === '') continue;
        const trimmed = line.trimStart();
        // 除外パターンに一致するかチェック（文字列があっても除外）
        if (excludePattern.test(trimmed)) continue;
        if (!isLineDisabled(line)) {
            needsDeactivation = true;
            break;
        }
    }
    const targetMode = needsDeactivation ? 'OFF' : 'ON';
    const newLines = lines.map(line => {
        if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) return line;
        const trimmed = line.trimStart();
        if (trimmed === '') return line;
        // 除外パターンに一致する行は無視（文字列があっても）
        if (excludePattern.test(trimmed)) return line;
        const isCommented = trimmed.startsWith('//');
        if (targetMode === 'ON') {
            if (isCommented) return line.replace(prefixRegex, '').trimStart();
        } else {
            if (!isCommented) {
                const leadingSpaces = line.match(/^(\s*)/);
                const spaces = leadingSpaces ? leadingSpaces[0] : "";
                return spaces + commentPrefix + trimmed;
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
        if (line.trimStart().match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/)) return line;
        let trimmedLine = line.trimStart();
        const isCommented = trimmedLine.startsWith('//');
        if (trimmedLine === '') return line;
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
        }
    }
    app.graph.setDirtyCanvas(true, true);
}

// ========================================
// 編集モード切替（変更なし）
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

// ========================================
// ウェイト関連（変更なし）
// ========================================
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
    if (matchOnlyParens) processedText = matchOnlyParens[1].trim();
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
        if (promptBody === '') promptBody = promptPartWithWeight;
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
    if (promptBody === '') promptBody = promptPartWithWeight.trim().replace(/,$/, '');
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
// /R タグ拡張（変更なし）
// ========================================
function getRTagSelectionRange(node) {
    const tags = parseNodeTags(node);
    const rTag = tags.find(t => t.startsWith('r'));
    if (!rTag || rTag === 'r') return [1, 1];
    const value = rTag.substring(1);
    const dashCount = (value.match(/-/g) || []).length;
    if (dashCount === 0) {
        const count = parseInt(value);
        if (isNaN(count) || count < 0) return [1, 1];
        return [count, count];
    } else if (dashCount === 1) {
        const parts = value.split('-');
        let min = parts[0] === '' ? 0 : parseInt(parts[0]);
        let max = parseInt(parts[1]);
        if (isNaN(min) || isNaN(max) || min > max || max < 0) return [1, 1];
        return [Math.max(0, min), max];
    } else if (dashCount === 2) {
        const parts = value.split('-');
        if (parts.length !== 3 || parts[0] !== '') return [1, 1];
        const neg = parseInt(parts[1]);
        const pos = parseInt(parts[2]);
        if (isNaN(neg) || isNaN(pos) || neg < 0 || pos < 0 || !Number.isInteger(neg) || !Number.isInteger(pos)) {
            console.warn(`[PromptSwitch] Invalid /R${value}: N,M must be non-negative integers`);
            return [1, 1];
        }
        return [-neg, pos];
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
            const commentLineMatch = line.trimStart().match(/^(\s*\/\/\s*,\s*\/\/\s*)(.*)$/);
            if (commentLineMatch) continue;
            if (line.trim() !== '') validPromptIndices.push(i);
        }
        const numValidPrompts = validPromptIndices.length;
        if (numValidPrompts === 0) {
            newLines.push(...section);
            continue;
        }
        let numToSelect;
        if (globalMinRaw < 0) {
            const N = -globalMinRaw;
            const totalOptions = N + globalMaxSelection + 1;
            const rawSelect = Math.floor(Math.random() * totalOptions) + globalMinRaw;
            numToSelect = Math.max(0, rawSelect);
        } else {
            let minSelect = Math.min(globalMinRaw, numValidPrompts);
            let maxSelect = Math.min(globalMaxSelection, numValidPrompts);
            if (minSelect > maxSelect) minSelect = maxSelect;
            numToSelect = globalMinRaw === globalMaxSelection
                ? globalMinRaw
                : Math.floor(Math.random() * (maxSelect - minSelect + 1)) + minSelect;
        }
        numToSelect = Math.min(numToSelect, numValidPrompts);
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
// /T タグ解析・実行（バグ修正版）
// ========================================
function parseTTag(tag) {
    if (!tag || !tag.toLowerCase().startsWith('t')) return null;
    const value = tag.substring(1);
    if (value === '') return { current: 1, maxExec: 1, count: 1 };
    const mMatch = value.match(/M(\d+)/i);
    const maxExec = mMatch ? parseInt(mMatch[1]) : 1;
    let current = 1;
    let count = 1;
    const beforeM = value.split(/M/i)[0];
    const currentNum = parseInt(beforeM);
    if (!isNaN(currentNum) && currentNum > 0) current = currentNum;
    const afterM = mMatch ? value.substring(mMatch.index + mMatch[0].length) : '';
    if (afterM.startsWith('-')) {
        const countNum = parseInt(afterM.substring(1));
        if (!isNaN(countNum) && countNum > 0) count = countNum;
    } else if (afterM && !mMatch) {
        const countNum = parseInt(afterM);
        if (!isNaN(countNum) && countNum > 0) count = countNum;
    }
    if (current < 1 || maxExec < 1 || count < 1) return null;
    return { current, maxExec, count };
}

function applyTTag(node, textWidget, app) {
    const tags = parseNodeTags(node);
    const tTag = tags.find(t => t.startsWith('t'));
    if (!tTag) return false;
    const tInfo = parseTTag(tTag);
    if (!tInfo) return false;
    let { current, maxExec, count } = tInfo;

    const lines = textWidget.value.split('\n');
    const totalLines = lines.length;
    if (totalLines === 0) return false;

    // 全行無効化
    let newText = deactivatePromptText(textWidget.value);
    let newLines = newText.split('\n');

    // 前行が空白/コメントだったかのフラグ（最初はfalse）
    //let wasPreviousLineEmptyOrComment = false; //削除する

    let targetLine = current - 1;
    let attempts = 0;

    //Whileの外側で宣言する必要がある
	let nextCount = count + 1;
    let nextCurrent = current; // カウント中のため 進めない
    
    while (attempts < totalLines + 10) {
        if (targetLine >= totalLines) targetLine = 0;

		const line = lines[targetLine];
		const trimmed = line.trim();  // \r も消える → Windows/Linux 完全統一
		const isEmpty = trimmed === '';
        const isCommentOnly = /^(\s*\/\/\s*,?\s*\/\/\s*)/.test(trimmed);
        
        if (!isEmpty && !isCommentOnly) {
            // ← ここで有効行発見！
            const leadingSpaces = line.match(/^(\s*)/)[0];
            const cleanLine = trimmed.replace(/^\/\/\s*/, '');
            newLines[targetLine] = leadingSpaces + cleanLine;

            if (nextCurrent > totalLines){
        		//行数が最終行を超えていたら
	            nextCount = 1;
            	nextCurrent = 1;
            }else if (nextCount > maxExec) {
				//次回のカウントが最大実行回数を超えていたら
                //（カウント+=1した結果が最大実行回数を超えた場合なので、今回は最後の処理）
                nextCount = 1;
                nextCurrent += 1; //1行次につつめる

                // ここでも行番号ループを保証
                //if (nextCurrent > totalLines) {
                //    nextCurrent = 1;
                //}
            }

            // 次回用のタグ生成
            const newTag = `/T${nextCurrent}M${maxExec}-${nextCount}`;

            // タイトル更新
            const currentTitle = (node.title || "").trim();
            const cleanedTitle = currentTitle.replace(/\/T[^\/\s]*/g, '').trim();
            const finalTitle = cleanedTitle ? cleanedTitle + " " + newTag : newTag;
            node.title = finalTitle.trim();

            break;
        } 

        // 空白行かコメント行だった
        console.log(`%c[Tタグ] スキップ → "${line.trim()}" (行${targetLine + 1})`, "color: #8888ff;");

        targetLine++;

        // 空白行の後は必ず行を進めていい　（カウント処理が発生しないため）
        nextCurrent = targetLine + 2;
        nextCount = 1;
          
        attempts++;

        
    }	//while の〆

    newText = newLines.join('\n');
    textWidget.value = newText;

    // 競合警告
    if (tags.includes('c') || tags.some(t => t.startsWith('cm'))) {
        console.warn(`[PromptSwitch] /T と /C|/CM が競合: /T を優先します (Node: ${node.title})`);
    }

    node.setDirtyCanvas(true, true);
    app.graph.setDirtyCanvas(true, true);
    return true;
}



// ========================================
// /CM タグ解析・実行（変更なし）
// ========================================
function parseCMTag(tag) {
    if (!tag || !tag.toLowerCase().startsWith('cm')) return null;
    if (tag.toLowerCase() === 'cm') return { maxExec: 1, count: 1 };
    const value = tag.substring(2);
    const match = value.match(/^(\d+)?(?:-(\d+))?$/);
    if (!match) return null;
    const nStr = match[1];
    const kStr = match[2];
    const maxExec = nStr ? parseInt(nStr) : 1;
    const count = kStr ? parseInt(kStr) : (nStr ? 1 : 1);
    if (maxExec < 1 || count < 1) return null;
    return { maxExec, count };
}

function applyCMTag(node, textWidget, app) {
    const tags = parseNodeTags(node);
    if (tags.some(t => t.startsWith('t'))) {
        console.warn(`[PromptSwitch] /T と /CM が競合: /T を優先します (Node: ${node.title})`);
        return false;
    }
    const hasPlainC = tags.includes('c');
    const cmTag = tags.find(t => t.startsWith('cm'));
    let maxExec = 1;
    let count = 1;
    if (cmTag) {
        const info = parseCMTag(cmTag);
        if (!info) return false;
        maxExec = info.maxExec;
        count = info.count;
    } else if (hasPlainC) {
        maxExec = 1;
        count = 1;
    } else {
        return false;
    }
    if (count === 1) {
        textWidget.value = randomPickupPrompts(textWidget.value, node);
    }
    let nextCount = count + 1;
    if (nextCount > maxExec) nextCount = 1;
    const newTag = maxExec === 1 ? `/CM` : `/CM${maxExec}-${nextCount}`;
    let newTitle = (node.title || "").trim();
    if (hasPlainC) {
        newTitle = newTitle.replace(/\/C\b/gi, '').trim();
        if (newTitle && !newTitle.endsWith(' ')) newTitle += ' ';
        newTitle += '/C';
    } else {
        newTitle = newTitle.replace(/\/CM[^\/\s]*/g, '').trim();
        if (newTitle && !newTitle.endsWith(' ')) newTitle += ' ';
        newTitle += newTag;
    }
    node.title = newTitle.trim();
    node.setDirtyCanvas(true, true);
    app.graph.setDirtyCanvas(true, true);
    return true;
}

// ========================================
// クリック処理・描画関数群（一切変更なし）
// ========================================
function findClickedArea(pos) {
    const [x, y] = pos;
    for (const area of this.clickableAreas) {
        if (x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height) return area;
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
        if (matchOnlyParens) processedText = matchOnlyParens[1].trim();
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
        const trimmed = line.trim();
        const isLineEmpty = trimmed === '';
        const isCommentOnly = trimmed.startsWith('//');
        const isInternalDisabled = line.match(/^\s*\/\/\s*disabled phrase\s*\d{14}$/);
        const isPureCommentLine = line.trimStart().match(/^(\s*\/\/\s*,\s*\/\/\s*)(.*)$/);

        // 内部無効行は無視
        if (isInternalDisabled) { lineIndex++; continue; }

        // Compact Mode: 空白行・コメント行・純粋なセパレータ行をスキップ
        if (isCompactMode && !node.isEditMode) {
            if (isLineEmpty || isCommentOnly || (isPureCommentLine && isPureCommentLine[2].trim() === '')) {
                lineIndex++;
                continue;
            }
        }

        // 純粋なセパレータ行（// , //）→ 線を描く
        if (isPureCommentLine) {
            const prefixSpaces = isPureCommentLine[1];
            const commentText = isPureCommentLine[2];
            const isPureSeparator = commentText.trim() === '';
            if (isPureSeparator) {
                const lineY = y + CONFIG.CommentLine_Height / 2;
                ctx.strokeStyle = CONFIG.CommentLine_LineColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(CONFIG.sideNodePadding, lineY);
                ctx.lineTo(node.size[0] - CONFIG.sideNodePadding, lineY);
                ctx.stroke();
                y += CONFIG.CommentLine_Height;
            } else {
                ctx.font = `${CONFIG.fontSize}px ${CONFIG.FONT_FAMILY}`;
                ctx.fillStyle = CONFIG.CommentLine_FontColor;
                ctx.textBaseline = "middle";
                ctx.textAlign = "left";
                const textX = CONFIG.sideNodePadding + CONFIG.checkboxSize + CONFIG.spaceBetweenCheckboxAndText;
                ctx.fillText(commentText, textX, y + CONFIG.lineHeight / 2);
                y += CONFIG.lineHeight;
            }
            lineIndex++;
            continue;
        }

        // 空行 → セパレータ線
        if (isLineEmpty) {
            drawSeparatorLine(ctx, node, y);
            y += CONFIG.emptyLineHeight;
            lineIndex++;
            continue;
        }

        // 以降は有効プロンプト行
        linesDrawnCount++;
        let displayLine = line.trimStart();
        const isDisabledByLeadingComment = displayLine.startsWith('//');
        if (isDisabledByLeadingComment) displayLine = displayLine.replace(/^\/\/\s*/, '').trimStart();

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

        if (weight !== null) drawWeightButtons(ctx, node, y, lineIndex, weight);

        y += CONFIG.lineHeight;
        lineIndex++;
    }

    // 高さ調整（変更なし）
    const newHeight = y + 10;
    const contentHeight = y - CONFIG.topNodePadding;
    if (!node.isEditMode) {
        if (node.isCompactMode) {
            let targetHeight = contentHeight <= CONFIG.lineHeight ? CONFIG.headerHeight + 2 : newHeight;
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
// 3. Extension Registration（変更なし）
// ========================================
app.registerExtension({
    name: "PromptSwitch",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "PromptSwitch") {
            nodeType.prototype.onKeyDown = function(e) {
                const textWidget = findTextWidget(this);
                if (!textWidget) return;
                let actionTaken = false;
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
                            if (!this.isCompactMode && this.originalHeight && node.size[1] !== this.originalHeight) {
                                this.size[1] = this.originalHeight;
                                if (node.onResize) node.onResize();
                            }
                            actionTaken = true;
                        }
                    }
                }
                else if (e.key === 'c' || e.key === 'C') {
                    if (e.shiftKey) {
                        const promptNodes = app.graph._nodes.filter(n => n.type === 'PromptSwitch');
                        let changed = false;
                        for (const node of promptNodes) {
                            const currentTitle = node.title || "";
                            if (!currentTitle) continue;
                            const newTitle = currentTitle
                                .replace(/\/C\b/gi, '')
                                .replace(/\/CM\d*(?:-\d+)?\b/gi, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                            if (node.title !== newTitle) {
                                node.title = newTitle || "PromptSwitch";
                                changed = true;
                            }
                        }
                        if (changed) app.graph.setDirtyCanvas(true, true);
                        actionTaken = true;
                    } else {
                        const currentTitle = this.title || "";
                        const tags = parseNodeTags(this);
                        const hasCTag = tags.includes('c');
                        const hasCMTag = tags.some(t => t.startsWith('cm'));
                        let newTitle = "";
                        if (hasCTag || hasCMTag) {
                            newTitle = currentTitle
                                .replace(/\/C\b/gi, '')
                                .replace(/\/CM\d*(?:-\d+)?\b/gi, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                        } else {
                            newTitle = currentTitle.trim();
                            if (newTitle && !newTitle.endsWith(' ')) newTitle += ' ';
                            newTitle += '/C';
                        }
                        if (!newTitle.trim()) newTitle = "PromptSwitch";
                        this.title = newTitle;
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
                        ` F1 : このヘルプを表示`,
                        ` F2/E : 編集モード切替`,
                        ` Shift+E : 全ノード編集モードトグル`,
                        ` A : All Prompts トグル`,
                        ` Shift+A: 全ノード一括無効化`,
                        ` R : Random Pickup`,
                        ` Shift+R: 全ノード一括ランダム`,
                        ` W : 全ウェイトを 1.00 にリセット`,
                        ` V : 表示/非表示切替`,
                        ` Shift+V: 全ノード一括切替`,
                        ` C : /C タグトグル（生成前1回ランダム）`,
                        ` Shift+C : 全ノードから /C と /CM タグ削除`,
                        ` /CMn-k : 最大n回までランダム実行（n回目でリセット）`,
                        ` /T : 順番に回す（Turn）`,
                        ` /TnMm-k : n行目をm回実行してから次の行へ`,
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
                        if (textWidget.callback) textWidget.callback(textWidget.value);
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
            if (origOnNodeCreated) origOnNodeCreated.apply(this, arguments);
            const textWidget = findTextWidget(this);
            if (textWidget) {
                if (this.size[0] < CONFIG.minNodeWidth) this.size[0] = CONFIG.minNodeWidth;
                this.isCompactMode = false;
                this.originalHeight = this.size[1];
                textWidget.value = "";
                if (textWidget.callback) textWidget.callback(textWidget.value);
                this.isEditMode = false;
                textWidget.y = CONFIG.topNodePadding;
                textWidget.options.minHeight = this.size[1] - textWidget.y - 10;
                textWidget.hidden = true;
                const forceHide = (node) => {
                    if (!node.isEditMode) textWidget.hidden = true;
                    if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
                };
                setupClickHandler(this, textWidget, app);
                const node = this;
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => forceHide(node));
                });
                const originalOnAdded = this.onAdded;
                this.onAdded = function() {
                    if (originalOnAdded) originalOnAdded.apply(this, arguments);
                    this.isEditMode = false;
                    textWidget.hidden = true;
                    if (this.size[1] > CONFIG.minNodeHeight) this.originalHeight = this.size[1];
                    forceHide(this);
                };

                // ======== 新機能：/Compact タグで自動コンパクトモード ========
                // ワークフロー読み込み時に1度だけ実行される
                if (!app.graph._compactModeChecked) {
                    app.graph._compactModeChecked = true;  // 重複実行防止フラグ

                    const hasCompactTag = app.graph._nodes.some(n => 
                        n.type === 'PromptSwitch' && 
                        n.title && 
                        n.title.toLowerCase().includes('/compact')
                    );

                    if (hasCompactTag) {
                        const targetNodes = app.graph._nodes.filter(n => 
                            n.type === 'PromptSwitch' && 
                            !isNodeExcluded(n, ['v'])  // /v タグのノードは除外
                        );

                        for (const node of targetNodes) {
                            if (!node.isEditMode) {
                                node.isCompactMode = true;
                                // 高さがデフォルトのままなら最小化
                                if (node.size[1] > CONFIG.headerHeight + 20) {
                                    node.size[1] = CONFIG.headerHeight + 20;
                                    if (node.onResize) node.onResize();
                                }
                            }
                        }
                        app.graph.setDirtyCanvas(true, true);
                    }
                }
                // ========================================================

                this.onMouseMove = null;
                const originalOnDblClick = this.onDblClick;
                this.onDblClick = function(e, pos) {
                    const [x, y] = pos;
                    if (y < CONFIG.headerHeight) {
                        if (originalOnDblClick) return originalOnDblClick.apply(this, arguments);
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
                    if (!this.isEditMode) drawCheckboxList(this, ctx, textWidget.value, app, this.isCompactMode);
                    if (originalOnDrawForeground) originalOnDrawForeground.call(this, ctx);
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
                        if (this.size[1] > CONFIG.minNodeHeight && !this.isCompactMode) this.originalHeight = this.size[1];
                    }
                    this.setDirtyCanvas(true, true);
                };
                if (this.onResize) this.onResize();

                // ================================================
                // 修正：ワークフロー読み込み時に /Compact タグで自動コンパクト化（重複防止＋正しいタイミング）
                // ================================================
                const origOnConfigure = this.onConfigure;
                this.onConfigure = function(info) {
                    if (origOnConfigure) origOnConfigure.apply(this, arguments);

                    // グラフ全体で1回だけ実行（複数ノードで何度も走らないように）
                    if (!app.graph._compactModeAutoApplied) {
                        app.graph._compactModeAutoApplied = true;

                        const hasCompactTag = app.graph._nodes.some(node =>
                            node.type === "PromptSwitch" &&
                            node.title &&
                            /\/compact/i.test(node.title)  // ← 大文字小文字無視で正確に検知
                        );

                        if (hasCompactTag) {
                            const nodesToCompact = app.graph._nodes.filter(node =>
                                node.type === "PromptSwitch" &&
                                !isNodeExcluded(node, ["v"]) &&  // /v（小文字）タグがあるノードは除外
                                !node.isEditMode
                            );

                            for (const node of nodesToCompact) {
                                node.isCompactMode = true;

                                // 高さがデフォルトのままであれば最小化（見た目を崩さない）
                                if (node.size && node.size[1] > CONFIG.headerHeight + 30) {
                                    node.size[1] = CONFIG.headerHeight + 20;
                                    if (node.onResize) node.onResize(node.size);
                                }
                            }

                            app.graph.setDirtyCanvas(true, true);
                        }
                    }
                };
                // ================================================

                if (this.setDirtyCanvas) this.setDirtyCanvas(true, true);
            }
        };
    }
});

// ===============================================
// 生成前に処理（/T → /CM（含/C） の順で優先）
// ===============================================
if (typeof app !== 'undefined') {
    const originalQueuePrompt = app.queuePrompt;
    app.queuePrompt = async function (...args) {
        const tNodes = app.graph._nodes
            .filter(n => n.type === 'PromptSwitch' && parseNodeTags(n).some(t => t.startsWith('t')));
        for (const node of tNodes) {
            const w = findTextWidget(node);
            if (w) applyTTag(node, w, app);
        }
        app.graph._nodes
            .filter(n => n.type === 'PromptSwitch')
            .filter(n => !parseNodeTags(n).some(t => t.startsWith('t')))
            .filter(n => parseNodeTags(n).includes('c') || parseNodeTags(n).some(t => t.startsWith('cm')))
            .forEach(n => {
                const w = findTextWidget(n);
                if (w) applyCMTag(n, w, app);
            });
        app.graph.setDirtyCanvas(true, true);
        return await originalQueuePrompt.apply(this, args);
    };
}

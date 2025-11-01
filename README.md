# ComfyUI-PromptSwitch ✨ Dramatically Speed Up Your Prompt Workflow! ✨

This is a custom node that allows you to intuitively **toggle ON/OFF prompts and adjust weights** as if using a checklist.

***

🎉 Welcome to "PromptSwitch," published on GitHub!

This is a significantly improved version based on the **excellent ideas of Prompt Palette**, focused on achieving **superior prompt management and node operation comfort.**

日本語 \`README\` はここ: [\`README\` file](https://github.com/Boba-svg/ComfyUI-PromptSwitch/blob/main/README_jp.md).

The following marks are used in this node to distinguish the origin of the features:

* **⚡️ [Original]**: Core, fundamental features inherited from Prompt Palette
* **🆕 [Switch]**: Unique features and improvements added in PromptSwitch

***

## 🚀 Key Features of PromptSwitch

What's impressive about this custom node is its ability to operate each line of the prompt independently and its detailed customization options.

### Feature Description and Operation Image 🎮

![Feature description](images/setsumei.png)
![Sample image](images/sample.png)

### 1. Ultra-Intuitive! Interactive Prompt Management

When the node is not in edit mode, each line of the prompt is displayed like a "checklist."

* **⚡️ [Original] Toggle ON/OFF (Activate/Comment Out) Lines** 🟢/⚫
    * Simply **click** a text line within the node to instantly enable/disable that prompt. Trial and error becomes super smooth!
* **⚡️ [Original] Easy Fine-Tuning of Prompt Weights** ⚖️
    * Click the **\`[+]\` / \`[-]\` buttons** to the right of each line to quickly increase or decrease the weight by **\`CONFIG.WEIGHT_STEP\` (default 0.10)**. The weight value is displayed next to the buttons.
* **⚡️ [Original] Features remain active in Edit Mode** ✏️
    * It continues to function as a normal prompt input node **even while in edit mode**. Seamlessly switch between editing and execution.
* **🆕 [Switch] Separator Line Drawn for Empty Lines** ✅
    * A thin horizontal line is automatically drawn for **empty lines** to enhance the visibility of prompt blocks (resolving a minor frustration from the original).
* **🆕 [Switch] Visually Optimized! Significant Display Improvement** 👀
    * **Automatic Text Abbreviation**: If a line is too long, it is automatically abbreviated to prevent the node's visual layout from breaking.
    * **Comment Readability Adjustment**: The following visual adjustments are made for commented-out lines (lines starting with \`//\`):
        * **The comment symbol \`//\` is hidden**.
        * The comment color and **font size are optimized** to make the main prompt stand out more prominently.

### 2. Node Mode Switching

* **✏️ Edit Mode**
    * Press **\`F2\`** or the **\`E\` key**, or **double-click the left, bottom, or right border of the node body** to toggle the display of the regular text input area.
* **🆕 [Switch] Minimum Mode (Visible/Invisible)**
    * Press the **\`V\` key** to toggle the display of the selected node!
        * **Normal Mode (Expanded)**: All lines are displayed, allowing you to focus on prompt editing.
        * **Compact Mode (Minimized)**: Invalid lines are hidden to minimize the node height. Useful for maximizing canvas space!

***

## 🚀 Shortcuts for Lightning-Fast Workflow 💨

Powerful keyboard shortcuts are provided to accelerate your work. (**Note: These are all uniquely added and enhanced features in PromptSwitch!**)

> ⚠️ **Image Note**: The feature explanation images above are based on an older version. Specifically, the R key functionality has been updated to the **Random Pickup Feature** described in this section.

| Shortcut | Feature | Description |
| :--- | :--- | :--- |
| **A** | **Toggle All ON/OFF** | Toggles (ON/OFF) all prompt lines in the selected node in a batch! |
| **Shift + A** | **Force Disable All Nodes** 🚨 | **Forcefully comments out** the prompts of **all PromptSwitch nodes on the canvas** in a batch! **【Exclusion Tag: \`/a\`】** |
| **V** | **Toggle Compact Mode** | Toggles the display/hiding of **invalid prompt lines** in the selected node (Compact ⇔ Normal)! |
| **Shift + V** | **Batch Toggle All Node Display Modes** | Toggles the display of **all PromptSwitch nodes on the canvas** (Compact ⇔ Normal) in a batch! **【Exclusion Tag: \`/v\`】** |
| **W** | **Instant Weight Reset** | Resets **all weights** in the selected node to **\`1.0\`** (removes parentheses) in a batch. |
| **R** | **Random Pickup** ✨ | Randomly activates prompts in the selected node from **sections separated by empty lines**. **The number of active elements is variable via tag specification.** |
| **Shift + R** | **Batch Random Pickup for All Nodes** 🎲 | Executes the above random pickup on **all PromptSwitch nodes on the canvas** in a batch! **【Exclusion Tag: \`/r\`】** |
| **F1** | **Display Help** | Quickly check a list of the node's main shortcuts and the **exclusion tag rules**. |

> **📌 Exclusion Tag Rules and Random Pickup Feature Expansion 【Important】**
> * To exclude a node from batch operations or change the behavior of random pickup, append the following tags to the **end of the node title**.
> * **\`/a\`**: Excludes from \`Shift+A\` batch disablement.
> * **\`/v\`**: Excludes from \`Shift+V\` batch display toggle.
> * **\`/r\`**: Excludes from \`Shift+R\` batch random pickup. (**Bypassed/Muted nodes are also excluded**).
> * **\`/R[number]\`**: Changes the behavior of the **R key and Shift+R functions**. Controls the number of elements to activate from each section separated by empty lines.
> * Multiple tags can be combined, such as **\`/avR0-3\`**.
>
> **【Random Pickup Count Control (\`/R[number]\`) Details】**
> | Tag Format | Number of Elements to Activate | Example and Behavior |
> | :--- | :--- | :--- |
> | **\`/R[n]\`** | **Exactly $n$ elements** | \`/R2\` $\rightarrow$ Activates exactly **2** elements. |
> | **\`/R[n]-[m]\`** | **$n$ to $m$ elements** | \`/R0-3\` $\rightarrow$ Randomly activates **0 to 3** elements. |
> | **\`/R-[m]\`** | **1 to $m$ elements** | \`/R-4\` $\rightarrow$ Randomly activates **1 to 4** elements. |
> | **\`/R[m]-[n]\`** | **$n$ to $m$ elements** | \`/R4-1\` $\rightarrow$ Randomly activates **1 to 4** elements. (Order of magnitude is not considered) |

***

## ⚡️ [Original] Powerful Versatility through Text Editor Prompt Management

Prompt Palette's text editor feature brings powerful versatility to prompt editing. Here are a few examples:

### 1. Ease of Importing Prompts Created by Others

After copying a prompt, replace the "commas" with "comma + newline characters" in a separate editor and paste it into this node. **All elements are immediately listed**.

### 2. Usage Method Utilizing Prompt Introduction Sites + Chat AI

By utilizing prompt introduction sites and chat AI, you can easily obtain a powerful prompt list and save the trouble of re-searching.

1.  First, type the following instruction into the Chat AI input screen (don't press Enter yet):
    \`\`\`
    Please extract the prompts and their corresponding comments from the following text in the format "prompt // comment". Group them so that a blank line separates categories, and the entire list can be copied with a single copy button.
    \`\`\`
2.  Then, copy the content from the prompt introduction site with \`Ctrl + A\` $\rightarrow$ \`Ctrl + C\`, paste it after the instruction above, and press Enter.
3.  The Chat AI will likely list the prompts from that page in the "prompt // comment" format and even provide a copy button.
4.  Paste that into PromptSwitch, and you will **immediately obtain a powerful prompt list**, saving you the effort of searching the prompt introduction site every time you forget a detail.

***

## 🔧 Customization Welcome! Configuration Variable List

You can adjust the node's detailed behavior by directly editing the \`CONFIG\` object in \`web/index.js\`.

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| \`WEIGHT_STEP\` | \`0.10\` | Sets the unit amount by which the weight adjustment buttons (\`[+]\`/\`[-]\`) increase or decrease the weight. |
| \`minWeight\` | \`-1.0\` | Sets the minimum weight value. |
| \`maxWeight\` | \`2.0\` | Sets the maximum weight value. |
| \`COMMENT_FONT_SCALE\` | \`0.8\` | Specifies the font size of comment lines as a ratio relative to the prompt's font size. |
| \`PROMPT_MAX_LENGTH_DISPLAY\` | \`30\` | Specifies the maximum number of prompt characters displayed without abbreviation on the node. |
| \`COLOR_PROMPT_ON\` | \`"#FFF"\` | Text color for active prompts. |
| \`COLOR_COMMENT_ON\` | \`"#ADD8E6"\` | Text color for comments attached to active prompts. |
| \`COLOR_PROMPT_OFF\` | \`"#AAAAAA"\` | Text color for inactive prompts (commented-out lines). |
| \`COLOR_COMMENT_OFF\` | \`"#AAAAAA"\` | Text color for comments attached to inactive prompts. |

> ⚠️ **Note**: Based on the \`web/index.js\` code, non-existent configuration items (such as \`ENABLE_SHIFT_A_CONFIRMATION\`, \`ENABLE_R_KEY_RESET\`, \`ENABLE_DBLCLICK_TOGGLE\`, \`COMMENT_COLOR\`, \`COMMENT_FONT_SIZE\`) have been removed, and the list has been adjusted to reflect the actual variable names (\`WEIGHT_STEP\`, \`minWeight\`, \`maxWeight\`, \`COMMENT_FONT_SCALE\`, \`PROMPT_MAX_LENGTH_DISPLAY\`, color codes).

***

## 🛠️ Installation and Update Method

**Registration with ComfyUI Manager is complete!** You can easily install it using the steps below.

### 1. Installation via ComfyUI Manager (Recommended)

1.  Open ComfyUI Manager.
2.  Click **"Install Custom Nodes"**.
3.  Type **\`PromptSwitch\`** into the search bar and search.
4.  Find the \`ComfyUI-PromptSwitch\` node and click the **"Install"** button.
5.  Restart ComfyUI, and you're done!

### 2. Manual Installation Steps (Git Clone)

If ComfyUI Manager is unavailable or if you prefer manual management, install using the following steps:

1.  Navigate to the **\`custom_nodes\` folder** within your ComfyUI installation directory.

    \`\`\`bash
    cd /path/to/ComfyUI/custom_nodes
    \`\`\`

2.  Clone (download) the repository with the following command:

    \`\`\`bash
    git clone https://github.com/Boba-svg/ComfyUI-PromptSwitch.git
    \`\`\`

3.  Restart ComfyUI, and you're done!

### 3. Update Steps (Git Pull) 🆕

To incorporate the latest features and fixes, follow these steps. (If using ComfyUI Manager, please use the Manager's update feature.)

1.  Completely shut down the ComfyUI process.
2.  Navigate to the **\`custom_nodes\` folder** within your ComfyUI installation directory.
3.  Navigate to the \`ComfyUI-PromptSwitch\` folder.

    \`\`\`bash
    cd /path/to/ComfyUI/custom_nodes/ComfyUI-PromptSwitch
    \`\`\`

4.  Fetch the latest changes with the following command:

    \`\`\`bash
    git pull
    \`\`\`
    (※ If you encounter an error regarding file overwrites, please delete temporary files or use \`git reset --hard\` to discard local changes.)

5.  Restart ComfyUI, and the update is complete!

***

## 💡 How to Use

1.  Call the node from the node search menu (right-click or \`Ctrl + Space\`) in the **Utilities (utils)** category or similar.
2.  Focus on the node and press the **\`F1\` key** to display the node's detailed help.

***
## 💡 Update History
1.  25/10/16 Public release
2.  25/10/17 **Added Exclusion via Trailing Tags**: Added a feature to exclude specific nodes from batch operations (\`Shift+A\` (\`/a\`) / \`Shift+V\` (\`/v\`)). Exclusion via leading tags like \`※\` or \`-\` in the node title was removed for simplification.
3.  25/10/20 Fixed an issue where weight notation remained in the actual data when weights were reset.
4.  25/10/20 Unified weight operation behavior for both comma-separated and non-comma-separated patterns.
5.  25/10/20 Removed all flag-related processing for controlling feature ON/OFF states.
6.  25/10/30 **Changed R Key to Random Pickup**: Introduced random pickup for the selected node with the single R key, and batch random pickup for all nodes with \`Shift+R\`. The existing weight reset function was moved to the **W key**.
7.  25/10/30 **Added Random Pickup Expansion Feature**: The number of elements to randomly activate can now be specified as a range or a fixed number by appending the \`/R[number]\` tag to the node title.

***

## 💡 Next Planned Updates
1.  Do not include newline characters in the prompt if a line is just a blank line.
2.  Introduce a mode that does not include newlines between concatenated prompts or at the end of the final prompt $\rightarrow$ for users who prefer clean output (The current visibility is preferred by the developer).
3.  Introduce \`Shift+E\` to open all nodes in edit mode $\rightarrow$ for enabling browser search functionality.
4.  Fix a bug where the random function defaults to non-operation if multiple trailing tags are present.
***

## 🌟 Credits / Thanks! 🙏

This custom node (ComfyUI-PromptSwitch) is a fork and significant feature expansion of the excellent project [\`ComfyUI-PromptPalette\`](https://github.com/kambara/ComfyUI-PromptPalette), originally developed by **kambara**-san.

Sincere thanks to the original author and project.

***

## 📝 License

This project is released under the **MIT License**, the same as the original.

Please check the [\`LICENSE\` file](https://github.com/Boba-svg/ComfyUI-PromptSwitch/blob/main/LICENSE) in the repository for details.

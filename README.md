# ComfyUI-PromptSwitch ✨ Dramatically Speed Up Your Prompt Workflow! ✨

A custom node that allows you to **toggle prompts ON/OFF and adjust weights** as intuitively as a checklist.

***

🎉 Welcome to **PromptSwitch** on GitHub!

This project builds upon the **brilliant concept of Prompt Palette**, focusing on **comfort and efficiency in prompt management and node operation**, with major enhancements.

This node uses the following marks to distinguish the origin of each feature:

* **⚡️ [Original]**: Core functions inherited from Prompt Palette  
* **🆕 [Switch]**: Newly added or improved features unique to PromptSwitch

***

## 🚀 Main Features of PromptSwitch

The greatest strength of this custom node lies in its ability to operate each prompt line independently, along with detailed customization options.

### Feature Overview and Operation 🎮

![Feature Overview](images/setsumei.png)  
![Sample](images/sample.png)

### 1. Super Intuitive! Interactive Prompt Management

When the node is in non-edit mode, each line of the prompt appears like a checklist.

* **⚡️ [Original] Toggle Lines ON/OFF (Activate / Comment Out)** 🟢/⚫  
    * Simply **click on a line** to instantly enable or disable that prompt. Experimenting becomes super smooth!
* **⚡️ [Original] Easy Fine-Tuning of Prompt Weights** ⚖️  
    * Click the **`[+]` / `[-]` buttons** on the right of each line to adjust weights in increments of **`CONFIG.WEIGHT_STEP` (default 0.10)**. The current weight is shown beside the buttons.
* **⚡️ [Original] Functions Remain Active in Edit Mode** ✏️  
    * While in **Edit Mode**, the node still behaves like a normal prompt input node, allowing seamless switching between editing and execution.
* **🆕 [Switch] Separator Lines for Empty Rows** ✅  
    * Thin horizontal lines are automatically drawn for **empty lines** to visually separate prompt blocks for better readability.
* **🆕 [Switch] Major Visual Improvements for Readability** 👀  
    * **Auto Text Truncation**: Long lines are automatically shortened to prevent layout breaking.  
    * **Improved Comment Visibility**: Lines starting with `//` are treated as comments with enhanced visibility:
        * **`//` symbols are hidden**
        * Comment **font size and color** are optimized to make active prompts stand out.

### 2. Node Mode Switching

* **✏️ Edit Mode**
    * Toggle visibility of the text input area using **`F2`**, **`E` key**, or **double-clicking the node’s border** (left, bottom, or right).
* **🆕 [Switch] Minimal Mode (Visible/Invisible)**
    * Toggle **compact display** with the **`V` key**:
        * **Normal Mode (Expanded)**: Displays all lines for full prompt editing.
        * **Compact Mode (Minimized)**: Hides inactive lines to save canvas space.

***

## 🚀 Shortcuts for Blazing Fast Workflow 💨

A set of powerful keyboard shortcuts designed for productivity.  
(*All of the following are unique enhancements introduced in PromptSwitch!*)

> ⚠️ **Note**: The images above may reference older versions. The **R key** has been updated to the **Random Pickup feature** described below.

| Shortcut | Function | Description |
| :--- | :--- | :--- |
| **A** | **Toggle All ON/OFF** | Toggles all prompt lines in the selected node at once. |
| **Shift + A** | **Force Disable All Nodes** 🚨 | Comments out all prompts in **every PromptSwitch node** on the canvas. **[Exclude Tag: `/a`]** |
| **V** | **Toggle Compact Mode** | Hides or shows disabled lines in the selected node. |
| **Shift + V** | **Toggle Compact Mode for All Nodes** | Switches between compact/normal view for all nodes. **[Exclude Tag: `/v`]** |
| **W** | **Reset All Weights** | Resets all weights in the selected node to **`1.0`** (removes parentheses). |
| **R** | **Random Pickup** ✨ | Randomly activates prompts within sections separated by blank lines. Controlled by tags in the node title. |
| **Shift + R** | **Global Random Pickup** 🎲 | Executes the above random pickup for all nodes. **[Exclude Tag: `/r`]** |
| **F1** | **Show Help** | Displays key shortcuts and exclusion tag rules for this node. |

> **📌 Exclusion Tag Rules & Random Pickup Extensions [Important]**
> * Add tags at the **end of the node title** to exclude it from batch operations or modify random behavior.
> * **`/a`**: Exclude from `Shift+A` batch disable.
> * **`/v`**: Exclude from `Shift+V` batch visibility toggle.
> * **`/r`**: Exclude from `Shift+R` global random pickup. (Bypassed/muted nodes also excluded)
> * **`/R[n]`**: Controls the number of active items per random section for both `R` and `Shift+R`.
> * You can combine multiple tags, e.g. **`/avR0-3`**.

> **Details for Random Pickup Count Control (`/R[n]`)**
> | Tag Format | Number of Active Elements | Example & Behavior |
> | :--- | :--- | :--- |
> | **`/R[n]`** | **Exactly $n$ elements** | `/R2` → Activates exactly **2 elements**. |
> | **`/R[n]-[m]`** | **Between $n$ and $m$ elements** | `/R0-3` → Activates **0 to 3** elements randomly. |
> | **`/R-[m]`** | **1 to $m$ elements** | `/R-4` → Activates **1 to 4** elements randomly. |
> | **`/R[m]-[n]`** | **Between $n$ and $m$ elements** | `/R4-1` → Same as `/R1-4` (order ignored). |

***

## ⚡️ [Original] Power of Text-Based Prompt Management

Prompt Palette’s text editor foundation enables powerful customization and flexibility in prompt editing.

### 1. Easy Import of Shared Prompts

After copying a prompt, use a text editor to replace commas with “comma + newline” before pasting into this node — instantly converting them into a **line-based prompt list**.

### 2. Using Prompt Websites + Chat AI

You can use Chat AI and prompt sharing websites to easily compile strong prompt lists and avoid repetitive searching.

1.  In your Chat AI, first enter the following (don’t press Enter yet):
    ```
    Please extract the prompts and their comments in the format "Prompt // Comment". Insert a blank line between categories, and format it so it can be copied all at once.
    ```
2.  Copy (`Ctrl + A`, `Ctrl + C`) a prompt-sharing webpage’s text and paste it after the above input.
3.  The AI will output a formatted list like “Prompt // Comment” with a one-click copy button.
4.  Paste that list into PromptSwitch to get an **instant ready-to-use prompt set**, avoiding the need to revisit websites.

***

## 🔧 Customization Options

You can tweak the behavior by editing the `CONFIG` object in `web/index.js`.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `WEIGHT_STEP` | `0.10` | Weight adjustment step for `[+]`/`[-]` buttons. |
| `minWeight` | `-1.0` | Minimum weight limit. |
| `maxWeight` | `2.0` | Maximum weight limit. |
| `COMMENT_FONT_SCALE` | `0.8` | Font size ratio for comment lines relative to prompt lines. |
| `PROMPT_MAX_LENGTH_DISPLAY` | `30` | Max characters displayed before truncation. |
| `COLOR_PROMPT_ON` | `"#FFF"` | Color for active prompts. |
| `COLOR_COMMENT_ON` | `"#ADD8E6"` | Color for comments attached to active prompts. |
| `COLOR_PROMPT_OFF` | `"#AAAAAA"` | Color for inactive (commented) prompts. |
| `COLOR_COMMENT_OFF` | `"#AAAAAA"` | Color for comments attached to inactive prompts. |

> ⚠️ **Note**: Removed unused options (`ENABLE_SHIFT_A_CONFIRMATION`, `ENABLE_R_KEY_RESET`, `ENABLE_DBLCLICK_TOGGLE`, `COMMENT_COLOR`, `COMMENT_FONT_SIZE`) and matched variable names to the actual implementation.

***

## 🛠️ Installation & Update

Currently **pending registration for ComfyUI Manager**.  
Until then, please manage manually using the Git commands below.

### 1. Manual Installation (Git Clone)

1.  Navigate to your ComfyUI installation’s **`custom_nodes`** folder:
    ```bash
    cd /path/to/ComfyUI/custom_nodes
    ```
2.  Clone the repository:
    ```bash
    git clone https://github.com/Boba-svg/ComfyUI-PromptSwitch.git
    ```
3.  Restart ComfyUI — done!

### 2. Update (Git Pull) 🆕

To get the latest features or fixes:

1.  Completely close ComfyUI.  
2.  Navigate to the **`custom_nodes`** folder.  
3.  Enter the `ComfyUI-PromptSwitch` directory:
    ```bash
    cd /path/to/ComfyUI/custom_nodes/ComfyUI-PromptSwitch
    ```
4.  Pull the latest changes:
    ```bash
    git pull
    ```
    If you encounter overwrite errors, delete temporary files or reset with:
    ```bash
    git reset --hard
    ```
5.  Restart ComfyUI — update complete!

***

## 💡 How to Use

1.  Open the node menu (right-click or `Ctrl + Space`) and locate the node under **utils**.  
2.  Press **`F1`** while the node is selected to display detailed help and shortcuts.

***

## 💡 Update History
1.  25/10/16 Initial release  
2.  25/10/17 Added exclusion tags (`/a`, `/v`) for batch operations; removed older exclusion methods.  
3.  25/10/20 Fixed issue where weight markers remained after reset.  
4.  25/10/20 Unified behavior of weight operations (with/without commas).  
5.  25/10/20 Removed all unnecessary flag toggling logic.  
6.  25/10/30 **R key → Random Pickup**: Added R/Shift+R random selection; moved weight reset to **W key**.  
7.  25/10/30 **Extended Random Pickup**: Added `/R[n]` tags to specify number/range of random activations.

***

## 💡 Upcoming Features
1.  Exclude newline characters for empty prompt lines.  
2.  Option to disable trailing line breaks for clean output formatting.  
3.  Add **Shift+E** to open all nodes in edit mode (for browser search support).  
4.  Fix bug preventing random behavior when multiple tags exist in node title.

***

## 🌟 Credit & Thanks 🙏

This project, **ComfyUI-PromptSwitch**, is an extended and enhanced version of  
[`ComfyUI-PromptPalette`](https://github.com/kambara/ComfyUI-PromptPalette)  
originally developed by **kambara**.  
Huge thanks to the original author and their brilliant work!

***

## 📝 License

This project is released under the **MIT License**, same as the original.  
See the [`LICENSE`](https://github.com/Boba-svg/ComfyUI-PromptSwitch/blob/main/LICENSE) file for details.

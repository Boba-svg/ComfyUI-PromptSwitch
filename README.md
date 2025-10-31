# ComfyUI-PromptSwitch ✨ Dramatically Speed Up Your Prompt Workflow! ✨

**Intuitive switching of prompt ON/OFF states and weight adjustment**, achievable as easily as checking off a list.

***

🎉 Welcome to "PromptSwitch" published on GitHub!

This version is based on the **excellent ideas of Prompt Palette** and has been significantly improved to pursue **comfort in prompt management and node operation**.

This node uses the following marks to distinguish the origin of the features:

* **⚡️ [Original]**: Core basic functions inherited from Prompt Palette.
* **🆕 [Switch]**: Features uniquely added or improved in PromptSwitch.

***

## 🚀 Main Features of PromptSwitch

The great thing about this custom node is that each line of the prompt can be operated independently, and it allows for fine-grained customization.

### Feature Description and Operation Image 🎮

![Feature Description](images/setsumei.png)
![Feature Description](images/sample.png)


### 1. Super Intuitive! Interactive Prompt Management

When the node is in non-edit mode, each line of the prompt is displayed like a "checklist."

* **⚡️ [Original] Line ON/OFF Switching (Activation/Commenting Out)** 🟢/⚫
    * Simply **click** a text line within the node to instantly enable/disable that prompt. Experimentation becomes super smooth!
* **⚡️ [Original] Easy Prompt Weight Fine-Tuning!** ⚖️
    * By clicking the **`[+]` / `[-]` buttons** on the right of each line, you can quickly increase or decrease the weight in increments of **`CONFIG.WEIGHT_STEP` (default 0.10)**. The weight value is displayed next to the button.
* **⚡️ [Original] Functions Remain Active in Edit Mode** ✏️
    * It continues to function as a normal prompt input node **while in Edit Mode**. You can move seamlessly between editing and execution.
* **🆕 [Switch] Drawing Separator Lines for Blank Lines** ✅
    * A thin horizontal line is automatically drawn for **blank lines** to enhance the visibility of prompt blocks. (Resolves a minor frustration from the original!)
* **🆕 [Switch] Greatly Improved Visuals for Readability** 👀
    * **Automatic Text Truncation**: If a line has too many characters, it will be automatically truncated to prevent the node's appearance from being ruined.
    * **Comment Readability Adjustment**: For commented-out lines (lines starting with `//`), the following visual adjustments are possible:
        * **The comment marker `//` is hidden**.
        * The comment color and **font size are optimized** to make the main prompt stand out more.

### 2. Node Mode Switching

* **✏️ Edit Mode**
    * Switch the regular text input area **ON/OFF** by pressing **`F2`** or the **`E` key**, or by **double-clicking the left, bottom, or right border** of the node itself.
* **🆕 [Switch] Minimum Mode (Visible/Invisible)**
    * Toggle the display of the selected node using the **`V` key**!
        * **Normal Mode (Expanded)**: Displays all lines, allowing you to focus on prompt editing.
        * **Compact Mode (Minimized)**: Hides disabled lines, minimizing the node's height. Useful when you want more space on the canvas!

***

## 🚀 Shortcut Functions for Lightning-Fast Workflow 💨

We provide powerful keyboard shortcuts aimed at speeding up your work. (**Note: These are all features uniquely added or enhanced in PromptSwitch!**)

> ⚠️ **Image Note**: The feature description images at the top are based on an older version. Specifically, the function of the R key has been updated to the **Random Pickup feature** described in this section.

| Shortcut | Function | Description |
| :--- | :--- | :--- |
| **A** | **Batch ON/OFF** | Toggles **ALL prompt lines** in the selected node ON/OFF (toggle)! |
| **Shift + A** | **Force Disable All Nodes** 🚨 | **Forcibly comments out** the prompts of **ALL PromptSwitch nodes** on the canvas in one go! **【Exclusion Tag: `/a`】** |
| **V** | **Toggle Compact Mode** | Toggles the display of **disabled prompt lines** (Compact $\Leftrightarrow$ Normal) for the selected node! |
| **Shift + V** | **Batch Change Display Mode for All Nodes** | Toggles the display of **ALL PromptSwitch nodes** on the canvas between **Compact $\Leftrightarrow$ Normal** in one go! **【Exclusion Tag: `/v`】** |
| **W** | **One-Click Weight Reset** | Resets the **weights of ALL** lines in the selected node **at once to `1.0`** (removes parentheses).|
| **R** | **Random Pickup** ✨ | Randomly enables prompts from **sections separated by blank lines** within the selected node. **The number of enabled prompts is variable based on tags**.|
| **Shift + R** | **Batch Random Pickup for All Nodes** 🎲 | Executes the Random Pickup described above **in batch** for **ALL PromptSwitch nodes** on the canvas. **【Exclusion Tag: `/r`】**|
| **F1** | **Display Help** | Instantly shows a list of this node's main shortcuts and the **rules for exclusion tags**. |

> **📌 Exclusion Tag Rules and Random Pickup Feature Expansion [Important]**
> * If you want to exclude a node from batch operations or change the behavior of Random Pickup, append the following tag to the **end of the node title**.
> * **`/a`**: Exclude from the batch disable operation (`Shift+A`).
> * **`/v`**: Exclude from the batch display toggle (`Shift+V`).
> * **`/r`**: Exclude from the batch random pickup (`Shift+R`). (Bypassed/muted nodes are also excluded)
> * **`/R[number]`**: Modifies the behavior of the **R key alone and the Shift+R function**. Controls the number of elements enabled from each section separated by blank lines.
> * Multiple tags can be specified, such as **`/avR0-3`**.
>
> **【Random Pickup Count Control (`/R[number]`) Details】**
> | Tag Format | Number of Elements to Enable | Example and Behavior |
> | :--- | :--- | :--- |
> | **`/R[n]`** | **Exactly $n$ items** | `/R2` $\rightarrow$ Enables **exactly 2** elements. |
> | **`/R[n]-[m]`** | **From $n$ to $m$ items** | `/R0-3` $\rightarrow$ Randomly enables **from 0 to 3** items. |
> | **`/R-[m]`** | **From 1 to $m$ items** | `/R-4` $\rightarrow$ Randomly enables **from 1 to 4** items. |
> | **`/R[m]-[n]`** | **From $n$ to $m$ items** | `/R4-1` $\rightarrow$ Randomly enables **from 1 to 4** items. (Order of min/max is not strictly enforced) |

***

## ⚡️ [Original] Powerful Applications from Prompt Management via Text Editor

The text editor functionality of Prompt Palette brings powerful possibilities to prompt editing. Here are some examples.

### 1. Ease of Importing Prompts Created by Others

After copying a prompt, if you replace "commas" with "comma + newline character" in a separate editor and paste it into this node, **all elements will be instantly listed**.

### 2. Using Prompt Sharing Sites + Chat AI

By utilizing prompt sharing sites or a chat AI, you can obtain powerful prompt lists effortlessly, saving you the trouble of searching again and again.

1.  First, type the following instruction into the chat AI's input field (but do not press Enter yet):
    ```
    I want you to extract the prompts and their corresponding comments from the text below in the format "prompt // comment". Add a blank line when the category changes, and consolidate everything so it can be copied with a single click.
    ```
2.  Then, copy the content from the prompt sharing site using `Ctrl + A` $\rightarrow$ `Ctrl + C`, paste it after the above instruction, and press Enter.
3.  The chat AI should list the prompts from the page in the "prompt // comment" format and even provide a copy button.
4.  Paste this into PromptSwitch, and you will **instantly get a powerful prompt list**, saving you the effort of searching prompt sites every time you forget something.

***

## 🔧 Greatly Welcomed Customization! Configuration Variable List

You can adjust the fine behavior of the node by directly editing the `CONFIG` object in `web/index.js`.

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `WEIGHT_STEP` | `0.10` | Sets the increment/decrement unit for the weight adjustment buttons (`[+]`/`[-]`).|
| `minWeight` | `-1.0` | Sets the minimum weight value. |
| `maxWeight` | `2.0` | Sets the maximum weight value. |
| `COMMENT_FONT_SCALE` | `0.8` | Specifies the font size of comment lines as a ratio to the main prompt's font size. |
| `PROMPT_MAX_LENGTH_DISPLAY` | `30` | Specifies the maximum number of characters to display without truncation when the node is shown. |
| `COLOR_PROMPT_ON` | `"#FFF"` | Text color for enabled prompts. |
| `COLOR_COMMENT_ON` | `"#ADD8E6"` | Text color for comments associated with enabled prompts. |
| `COLOR_PROMPT_OFF` | `"#AAAAAA"` | Text color for disabled prompts (commented-out lines). |
| `COLOR_COMMENT_OFF` | `"#AAAAAA"` | Text color for comments associated with disabled prompts. |

> ⚠️ **Note**: Based on the `web/index.js` code, non-existent configuration items (`ENABLE_SHIFT_A_CONFIRMATION`, `ENABLE_R_KEY_RESET`, `ENABLE_DBLCLICK_TOGGLE`, `COMMENT_COLOR`, `COMMENT_FONT_SIZE`) have been removed, and the settings have been adjusted to match the actual variable names (`WEIGHT_STEP`, `minWeight`, `maxWeight`, `COMMENT_FONT_SCALE`, `PROMPT_MAX_LENGTH_DISPLAY`, color codes).

***

## 🛠️ Installation and Update Instructions

Currently, **preparation for registration in the ComfyUI Manager is underway!** Until then, please manage the installation manually using the following Git commands. 🙇‍♂️

### 1. Manual Installation Procedure (Git Clone)

1.  Navigate to the **`custom_nodes` folder** within your ComfyUI installation directory.

    ```bash
    cd /path/to/ComfyUI/custom_nodes
    ```

2.  Clone (download) the repository using the following command.

    ```bash
    git clone [https://github.com/Boba-svg/ComfyUI-PromptSwitch.git](https://github.com/Boba-svg/ComfyUI-PromptSwitch.git)
    ```

3.  Restart ComfyUI, and you are done!

### 2. Update Procedure (Git Pull) 🆕

To incorporate the latest features and fixes, follow these steps:

1.  Completely shut down the ComfyUI process.
2.  Navigate to the **`custom_nodes` folder** within your ComfyUI installation directory.
3.  Navigate into the `ComfyUI-PromptSwitch` folder.

    ```bash
    cd /path/to/ComfyUI/custom_nodes/ComfyUI-PromptSwitch
    ```

4.  Fetch the latest changes using the following command.

    ```bash
    git pull
    ```
    (If you encounter errors about overwriting files, try deleting temporary files or using `git reset --hard` to discard local changes.)

5.  Restart ComfyUI to complete the update!

***

## 💡 Usage

1.  In the node search menu (right-click or `Ctrl + Space`), call up the node from the **Utilities (utils)** category or similar.
2.  Focus on the node and press **`F1`** to display the node's detailed help.

***
## 💡 Update History
1.  25/10/16 Initial Release
2.  25/10/17 **Added Exclusion Feature via Suffix Tags**: Added functionality to exclude specific nodes from batch operations like Shift+A (`/a`) / Shift+V (`/v`). Exclusion features using `※` or `-` at the start of the node title were removed for simplification.
3.  25/10/20 Fixed an issue where weight notation remained in the actual data when weights were reverted.
4.  25/10/20 Standardized the behavior for patterns with commas and those without when manipulating weights.
5.  25/10/20 Removed all processing related to feature ON/OFF flags.
6.  25/10/30 **R Key changed to Random Pickup**: Introduced Random Pickup for the selected node with the R key alone, and batch Random Pickup for all nodes with Shift+R. The existing weight reset function was moved to the **W key**.
7.  25/10/30 **Random Pickup Extension Added**: Changed to allow specifying the number of elements to randomly enable by appending the tag `/R[number]` to the node title, enabling single or range specification.

***

## 💡 Next Update Plans
1.  Do not include newline characters in the prompt if the line is just a blank line.
2.  Prepare a mode to omit newlines at the connection points and at the end of the prompt $\Rightarrow$ For those who want a cleaner output prompt. (I currently prefer the better visibility).
3.  Introduce a feature to open all nodes in Edit Mode with Shift + E $\Rightarrow$ This will make them catchable by the browser's search function.
4.  Fix a bug where the random function defaults not to work when multiple suffix tags are present.
***

## 🌟 Credits / Thanks! 🙏

This custom node (ComfyUI-PromptSwitch) is a significantly enhanced fork based on the excellent project [`ComfyUI-PromptPalette`](https://github.com/kambara/ComfyUI-PromptPalette) developed by **kambara**.

Heartfelt thanks to the original author and project.

***

## 📝 License

This project, like its original, is released under the **MIT License**.

Please refer to the [`LICENSE` file](https://github.com/Boba-svg/ComfyUI-PromptSwitch/blob/main/LICENSE) in the repository for details.

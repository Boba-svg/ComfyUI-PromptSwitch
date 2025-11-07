# ComfyUI-PromptSwitch Dramatically Speeds Up Prompt Work!

A custom node that lets you intuitively toggle prompts ON/OFF and adjust weights like a checklist.

---

Welcome to **PromptSwitch**, released on GitHub!

This is a version that builds on the ideas of **Prompt Palette**, greatly improving prompt management and node operability.

Japanese README is here:  
https://github.com/Boba-svg/ComfyUI-PromptSwitch/blob/main/README_jp.md

To distinguish the origin of features, we use the following notation:

* [Original]: Core features inherited from Prompt Palette
* [Switch]: Features added or improved in PromptSwitch

---

## Main Features

![機能説明](images/setsumei.png)
![機能説明](images/sample.png)
You can independently operate each prompt line and customize it.

### 1. Interactive Prompt Management

In non-edit mode, each line is displayed like a checklist.

* [Original] Toggle line ON/OFF  
  Click a line to enable/disable (`//` attached)  
* [Original] Weight adjustment  
  Use the `[+]` / `[-]` buttons on the right of the line to adjust in `CONFIG.WEIGHT_STEP` units (default 0.10)  
* [Original] Operable even in edit mode  
  You can repeat execution while editing  
* [Switch] Draw separator line on blank lines  
  A thin line is displayed on blank lines  
* [Switch] Display improvements  
  - Long lines are automatically truncated  
  - Comment lines (starting with `//`) hide `//`, adjust font size and color

### 2. Mode Switching

* Edit mode  
  `F2` or `E` key, or double-click the node frame  
* [Switch] Minimum mode  
  `V` key: hide disabled lines (compact display)

---

## Keyboard Shortcuts

| Key | Function | Description |
|------|----------|-------------|
| A | Bulk ON/OFF | Toggle all lines of the selected node |
| Shift + A | Force disable all nodes | Comment out all nodes (`/a` excluded) |
| V | Compact mode toggle | Hide/show disabled lines of the selected node |
| Shift + V | Bulk display mode toggle | Switch all nodes to compact/normal (`/v` excluded) |
| W | Weight reset | Reset all weights of the selected node to `1.0` |
| R | Random pickup | Randomly select from sections separated by blank lines (`/R[n]` supported) |
| Shift + R | Randomize all nodes | Apply random pickup to all nodes (`/r` excluded) |
| **C** | **Toggle `/C` tag** | **Add/remove `/C` to the title** |
| **Shift + C** | **Remove `/C` from all nodes** | **Bulk remove `/C` from all nodes** |
| Shift + E | Bulk edit mode toggle | Toggle edit mode ON/OFF for all nodes (input prevention) |
| F1 | Show help | Display shortcuts and tag explanations |
| F2 / E | Edit mode toggle | Normal mode ↔ Edit mode |

---

## The Ultimate New Feature: `/C` Tag (Auto Random Update on Each Generate)

> **“The prompt automatically changes randomly every time you press the Generate button.”**

**This is the greatest strength of PromptSwitch.**

### How to Use (Just 2 Steps)

1. Add **`/R[n] /C`** to the node title  
   (Example: `facial expression /R1-3 /C`)  
2. **Press the “Generate” button**

→ **Every press automatically selects 1–3 elements randomly and generates an image.**

**No need to press the R key at all.**

### Strengths of the `/C` Tag

| Conventional Method | With `/C` Tag |
|---------------------|---------------|
| Manually press R key each time | **Auto update with one Generate** |
| Same prompt repeats | **Different composition every time** |
| Trial-and-error is tedious | **Reach the desired image fastest** |

### Randomness Fully Controlled by `/R` Tag

- **`/R1`** → Exactly **1** random selection each time  
- **`/R1-3`** → Random between **1–3** each time  
- **`/R-5`** → Up to **5** random selections each time  

→ **While narrowing down to the “target style,”**  
　　**try variations with just one Generate button press!**

---

## Tag Rules (`/C` + `/R` Required)

Add tags to the end of the node title.  
Spaces, tabs, and line breaks are ignored. Composite tags (e.g., `/R2a`) are invalid (warning displayed).

| Tag | Meaning |
|-----|---------|
| /a | Excluded from `Shift+A` |
| /v | Excluded from `Shift+V` |
| /r | Excluded from `Shift+R` |
| /R[n] | Select exactly n items from the section |
| /R[n]-[m] | Random between n and m |
| /R-[m] | 1 to m |
| /R[m]-[n] | n to m (order doesn’t matter) |
| **/C** | **Auto random update on each Generate button press** |

> **Example: `pose /R2 /C`**  
> → Automatically selects **2 poses** each time and reflects instantly on Generate

---

## Customization Settings (`CONFIG` in `web/index.js`)

| Variable | Default | Description |
|----------|---------|-------------|
| WEIGHT_STEP | 0.10 | Unit for weight increase/decrease |
| minWeight | -1.0 | Minimum weight |
| maxWeight | 2.0 | Maximum weight |
| COMMENT_FONT_SCALE | 0.8 | Comment font size ratio |
| PROMPT_MAX_LENGTH_DISPLAY | 30 | Max characters displayed (truncated if exceeded) |
| COLOR_PROMPT_ON | "#FFF" | Enabled prompt color |
| COLOR_COMMENT_ON | "#ADD8E6" | Enabled comment color |
| COLOR_PROMPT_OFF | "#AAAAAA" | Disabled prompt color |
| COLOR_COMMENT_OFF | "#AAAAAA" | Disabled comment color |

---

## Installation and Update

### 1. Via ComfyUI Manager (Recommended)

1. Open Manager  
2. Click "Install Custom Nodes"  
3. Search for `PromptSwitch`  
4. Install `ComfyUI-PromptSwitch`  
5. Restart ComfyUI

### 2. Manual Installation

1. Navigate to the following folder  
   `/path/to/ComfyUI/custom_nodes`  
2. Run the following command  
   `git clone https://github.com/Boba-svg/ComfyUI-PromptSwitch.git`

### 3. Update

1. Navigate to the following folder  
   `/path/to/ComfyUI/custom_nodes/ComfyUI-PromptSwitch`  
2. Run the following command  
   `git pull`

---

## How to Use

1. Add `PromptSwitch` from node search (utils category)  
2. Set **`/R[n] /C`** in the title  
3. **Press “Generate” → Different prompt image each time!**

---

## Update History

1. 25/10/16 Released  
2. 25/10/17 Added exclusion tags (`/a`, `/v`)  
3. 25/10/20 Unified weight operations  
4. 25/10/30 R key → Random, W key → Reset  
5. 25/10/30 Extended `/R[n]`  
6. 25/11/05 Unified tag parsing (composite tags prohibited)  
7. **25/11/07 Final Update**  
   - **`/C` tag: Auto random update on each Generate**  
   - **C key: Toggle `/C`**  
   - **Shift+C: Remove `/C` from all nodes**  
   - **Shift+E: Bulk edit mode toggle (input prevention)**  
   - Fixed edit mode bugs

---

## Upcoming Plans

1. Remove line breaks from blank lines only  
2. Mode that doesn’t add line break at the end  
3. Fix random bug when multiple tags exist

---

## Credits

This node is a fork and extension of **kambara**’s `ComfyUI-PromptPalette`.

---

## License

MIT License  
See the `LICENSE` file for details

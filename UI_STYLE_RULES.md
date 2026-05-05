# Mahjong Page UI Style Rules

## Scope

This document defines the current visual rules for the Mahjong page and its related components.

Applies to:

- `miniprogram/pages/majiang/`
- `miniprogram/components/userinfo/`
- `miniprogram/components/rank/`
- `miniprogram/components/majiang-log/`
- `miniprogram/components/majiang-game/`

Goal:

- Keep all future UI changes visually consistent with the current page style.
- Reuse the same color language, card system, spacing rhythm, and button logic.
- Avoid local optimizations that break overall page harmony.

## Core Style Keywords

- Light card UI
- Soft gradient surfaces
- Rounded corners
- Low-saturation accent colors
- Clear information hierarchy
- Refined borders instead of heavy blocks
- Breathing space over dense layouts

## Global Principles

1. Keep the page bright, light, and readable.
2. Prefer soft gradients over flat hard color blocks.
3. Prefer border, shadow, and spacing hierarchy over strong saturation.
4. Important information can be highlighted, but only one major highlight per information cluster.
5. Similar content must use repeated structure and repeated visual rules.
6. Background image should remain visible at page edges where possible.

## Page-Level Layout Rules

### Three-Frame Structure

The page is treated as three stacked blocks:

1. User info card
2. Middle content card
3. Bottom action/navigation card

Rules:

- Left and right outer margins should stay visually aligned.
- Vertical gaps between the three blocks should stay consistent.
- Bottom action area should behave as a card, not as a toolbar strip.
- Background image can be visible around the outer edges of the cards.

Recommended spacing:

- Horizontal page margin: `20rpx`
- Card-to-card vertical gap: around `20rpx`
- Inner card padding: `16rpx` to `20rpx`

## Surface System

### Main Card Style

Used by user info card, rank container, and bottom action area.

- Background:
  - `linear-gradient(180deg, rgba(255, 255, 255, 0.96~0.98) 0%, rgba(248, 252, 255, 0.96~0.98) 100%)`
- Border:
  - `1rpx solid rgba(126, 159, 209, 0.16)`
- Shadow:
  - `0 8rpx 22rpx rgba(62, 91, 135, 0.1)`
- Radius:
  - `22rpx`

### Inner Sub-Card Style

Used by ranking rows, stat cards, and light function blocks.

- Background:
  - low-contrast light gradient
- Border:
  - `1rpx solid rgba(93, 131, 191, 0.12~0.18)`
- Shadow:
  - `0 3rpx 10rpx rgba(86, 115, 156, 0.05~0.08)`
- Radius:
  - `13rpx` to `18rpx`

## Color System

### Base Neutrals

- Main text: `#1f2f45` or `#25364e`
- Secondary text: `#516882`, `#7f8fa5`
- Divider/border blue-gray: `rgba(93, 131, 191, 0.12~0.18)`

### Accent Families

Use accent colors with low saturation and controlled scope.

#### Gold / Warm Highlight

Used for:

- Gold amount
- Important score emphasis
- Main action button
- Some key badge surfaces

Recommended tones:

- `#ffb300`
- `#ff9900`
- `rgba(255, 183, 77, 0.24)`
- background:
  - `linear-gradient(135deg, rgba(255, 251, 242, 0.98) 0%, rgba(255, 240, 204, 0.98) 100%)`

#### Cyan / Blue

Used for:

- Ranking tab state
- "总场次" information emphasis
- Light ranking number badges when using cool tone

Recommended tones:

- `#0f6e82`
- `#4f8b9c`
- `rgba(0, 162, 194, 0.14~0.22)`
- background:
  - `linear-gradient(180deg, #effcff 0%, #d6f5ff 100%)`

#### Purple

Used for:

- History tab state
- "胜场" information emphasis

Recommended tones:

- `#5a4db0`
- `#7d72be`
- `rgba(132, 118, 230, 0.14~0.24)`
- background:
  - `linear-gradient(180deg, #f7f5ff 0%, #ece8ff 100%)`

#### Green

Used only for state meaning:

- Negative win rate
- Negative score / loss value

Recommended tones:

- `#2f9b63`
- `#2b7b67`

Rules:

- Green should mean negative/downward state.
- Do not use green as a random decorative accent.

## Typography Rules

### Hierarchy

- Page important title or user name:
  - around `38rpx` to `40rpx`
- Core value:
  - around `36rpx` to `44rpx`
- Section button title:
  - around `30rpx`
- Normal name text:
  - around `32rpx` to `34rpx`
- Tag or meta label:
  - around `22rpx` to `25rpx`

### Text Weight

- Main identity / key value:
  - `700`
- Secondary label:
  - `500`
- Avoid too many weight levels in the same card.

### Overflow

- Long nicknames should ellipsize.
- Numeric values should stay on one line.

## User Info Module Rules

### Structure

Top row:

- Avatar
- Nickname
- Gold box
- Settings

Bottom row:

- Three separated stat cards

### Avatar

- Keep circular
- Maintain visual center within the whole user info block
- Do not oversize relative to top-row text block

### Gold Box

- Uses gold family background
- Label is `金币`
- Includes a small coin icon
- Must keep left breathing room from nickname
- Should not stretch blindly; keep stable badge-like proportion

### Stats Row

Should remain three separate cards:

1. 总场次
2. 胜场
3. 胜率

Current intended color direction:

- 总场次: cyan/blue family
- 胜场: purple family
- 胜率: khaki/golden family

Win rate negative state:

- Keep warm card background
- Only number changes to green
- Preserve minus sign

## Ranking Module Rules

### Container

- Same main-card system as user info block
- Ranking rows should look like inner cards, not flat list rows

### Top 3

- Use dedicated king badge assets
- Keep gold ring/base language
- Visual priority higher than ranks below

### Rank 4+

- Number badge should be circular and refined
- Use one unified badge tone, not random bright colors
- Use thin inner ring for quality
- `4-10` can have slightly stronger ring than `11+`
- Badge must not be darker than the list row itself
- Badge color must not fight with the page background

### Score Area

- Use `金币` instead of `积分`
- Add small coin icon
- Positive score uses gold/orange
- Negative score uses green

## Bottom Action Area Rules

### Structure

Four separate buttons:

1. 玩家排行
2. 游戏历史
3. 记录游戏
4. 深蹲

### Style

- Minimal design
- No subtitle
- Same card radius family as upper modules
- Use light accent backgrounds, not plain white
- Active state can lift slightly with stronger shadow

### Color Mapping

- 玩家排行:
  - cyan/blue family
- 游戏历史:
  - purple family
- 记录游戏:
  - gold family, stronger emphasis than the other two
- 深蹲:
  - standalone functional accent, can use dedicated green gradient when the feature is exercise-related

### Logic Mapping

- 玩家排行:
  - switch middle card to ranking content
- 游戏历史:
  - switch middle card to history content
- 记录游戏:
  - open recording workflow / drawer
- 深蹲:
  - open squat counter popup / exercise workflow

## Overlay And Popup Rules

These rules are required for popup, mask, drawer, and full-screen overlay UI on the Mahjong page.

### Root Mounting Rule

- Full-screen popup containers should be mounted as direct siblings of the main `scroll-view`, not inside the scroll area.
- Do not place modal mask layers inside scrolling content when the popup is expected to be viewport-centered.
- On iOS real devices under Skyline, overlays inside `scroll-view` may use the wrong layout reference and appear in the upper-left area even if DevTools looks correct.

### Full-Screen Positioning Rule

- Prefer explicit edge declarations:
  - `top: 0`
  - `right: 0`
  - `bottom: 0`
  - `left: 0`
- Also set:
  - `width: 100%`
  - `height: 100%`
- Do not rely on `inset: 0` alone for critical overlay positioning in this project.

### Centering Rule

- Prefer centering through the full-screen container:
  - `display: flex`
  - `align-items: center`
  - `justify-content: center`
- The popup panel itself should stay in normal flow within the overlay container:
  - `position: relative`
  - `width: 100%`
  - `max-width: 686rpx`
- Avoid using popup self-centering as the primary strategy when not necessary:
  - `top: 50%`
  - `left: 50%`
  - `transform`
- In this project, container-level centering is the default choice for overlay components.

### Real Device Verification Rule

- Overlay UI that looks correct in WeChat DevTools must still be verified on iOS real devices.
- When DevTools is correct but iOS real device is wrong, first inspect:
  1. whether the overlay is mounted inside `scroll-view`
  2. whether `inset: 0` is being used
  3. whether the full-screen container actually has explicit width and height
- Treat real-device behavior as the source of truth for popup positioning compatibility.

## Pull-To-Refresh Rules

Two refresh layers must remain distinct:

1. Top-level page refresher
2. Rank component inner refresher

Rules:

- Pulling in outer page area refreshes:
  - current user info
  - full ranking list
- Pulling inside ranking list refreshes ranking only
- Top-level refresh should show a custom floating pill hint
- The pill hint should use the same card language:
  - rounded capsule
  - light blue/gold mixed surface
  - soft border and shadow

## Forbidden Patterns

Do not introduce:

- Pure white default buttons in the bottom action area
- Hard black shadow
- High-saturation random colors
- Inconsistent border radius between nearby modules
- Dense text blocks with little breathing room
- Multiple equally strong highlight colors in one small module
- Flat list rows that ignore the established card system

## Change Checklist

Before changing related UI, confirm:

1. Does the new component use the same card language?
2. Does the new color belong to the established blue / purple / gold / green logic?
3. Is the spacing rhythm aligned with the three-frame layout?
4. Are button states minimal and consistent?
5. Are highlights limited to the truly important information?
6. Will this change still look like part of the same page after screenshot comparison?
7. If this is a popup or mask layer, is it mounted outside `scroll-view` and verified on iOS real device?

## Source Of Truth

When future updates are made, use these files as implementation references:

- `miniprogram/components/userinfo/userinfo.wxml`
- `miniprogram/components/userinfo/userinfo.wxss`
- `miniprogram/components/rank/rank.wxml`
- `miniprogram/components/rank/rank.wxss`
- `miniprogram/pages/majiang/index.wxml`
- `miniprogram/pages/majiang/index.wxss`
- `miniprogram/pages/majiang/index.ts`

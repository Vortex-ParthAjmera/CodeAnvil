# Accessibility

## Goal

CodeAnvil should be usable by students on different devices, screens, keyboards, and vision conditions.

## Core Requirements

- keyboard navigation for main controls
- visible focus states
- readable contrast
- no information conveyed only by color
- captions/labels for icons
- responsive layouts
- reduced motion support

## Playback Accessibility

Required:

- play/pause buttons have labels
- step controls have labels
- current line is indicated by color and icon/marker
- variable changes use text or border changes, not color only
- timeline can be operated by keyboard later
- output console is readable by screen readers where practical

## Code Editor

Requirements:

- readable font size
- line numbers
- high contrast theme
- avoid tiny labels
- preserve copy/paste behavior

## Motion

Respect `prefers-reduced-motion`.

Reduced motion mode should:

- remove large animated transitions
- keep simple highlights
- preserve step-by-step clarity

## Mobile Accessibility

- tap targets should be large enough
- no horizontal scroll for main layout
- controls should not overlap
- panels should stack predictably

## Content Accessibility

- explain terms simply
- avoid unnecessary jargon
- support beginner-friendly descriptions
- later: allow explanation level selection


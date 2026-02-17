# Scholar Board Installation Guide

## macOS
1. Download the correct build for your Mac CPU:
   - Apple Silicon (M1/M2/M3): `Scholar Board-x.x.x-arm64.dmg`
   - Intel: `Scholar Board-x.x.x.dmg`
2. Open the DMG file.
3. Drag **Scholar Board** into **Applications**.
4. First launch: right-click app -> **Open**.

## Windows
1. Download `Scholar Board Setup x.x.x.exe`.
2. Run the installer.
3. Follow setup prompts.
4. Launch from Start Menu or desktop shortcut.

## Linux
1. Download `Scholar Board-x.x.x.AppImage`.
2. Make it executable:
   ```bash
   chmod +x Scholar\ Board-x.x.x.AppImage
   ```
3. Run:
   ```bash
   ./Scholar\ Board-x.x.x.AppImage
   ```

## Offline and Sync Behavior
- Desktop mode works fully offline using local SQLite.
- Changes queue locally while offline.
- When online, sync runs automatically and can be triggered manually from the header sync badge.

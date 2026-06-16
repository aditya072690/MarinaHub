# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac.spec.ts >> RBAC route guards >> unauthenticated users cannot access fleet
- Location: e2e/rbac.spec.ts:20:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at /var/folders/cc/v6dtqkmd4bg3721nfmp509_c0000gn/T/cursor-sandbox-cache/f41b8da92baf2c582ac7d1935fa0b299/playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-x64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```
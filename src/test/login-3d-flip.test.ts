import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Login 3D Flip Card & Progressive Disclosure Verification", () => {
  const rootDir = process.cwd();
  const stylesPath = path.resolve(rootDir, "src/styles.css");
  const loginPath = path.resolve(rootDir, "src/routes/login.tsx");
  const agentsPath = path.resolve(rootDir, "AGENTS.md");

  it("TC-FLIP-01: styles.css contains industrial 3D flip card CSS utilities with GPU stabilization", () => {
    const stylesSrc = fs.readFileSync(stylesPath, "utf-8");

    expect(stylesSrc).toContain(".flip-card-container");
    expect(stylesSrc).toContain("perspective: 1200px");
    expect(stylesSrc).toContain("transform: translateZ(0)");
    expect(stylesSrc).toContain("-webkit-font-smoothing: antialiased");
    expect(stylesSrc).toContain(".flip-card-inner");
    expect(stylesSrc).toContain("transform-style: preserve-3d");
    expect(stylesSrc).toContain("transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)");
    expect(stylesSrc).toContain("will-change: transform");
    expect(stylesSrc).toContain("transform: translate3d(0, 0, 0)");
    expect(stylesSrc).toContain(".flip-card-inner.is-flipped");
    expect(stylesSrc).toContain("transform: rotateY(180deg) translate3d(0, 0, 0)");
    expect(stylesSrc).toContain(".flip-card-front");
    expect(stylesSrc).toContain(".flip-card-back");
    expect(stylesSrc).toContain("backface-visibility: hidden");
    expect(stylesSrc).toContain("-webkit-backface-visibility: hidden");

    // mes-card must not use transition: all to prevent animation frame jitter
    expect(stylesSrc).not.toContain("transition: all 0.15s");
    expect(stylesSrc).toContain("transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out, background-color 0.15s ease-in-out");
  });

  it("TC-FLIP-02: login.tsx implements Progressive Disclosure with 3D Flip Card architecture", () => {
    const loginSrc = fs.readFileSync(loginPath, "utf-8");

    // 3D card structure
    expect(loginSrc).toContain("flip-card-container");
    expect(loginSrc).toContain("flip-card-inner");
    expect(loginSrc).toContain("flip-card-front");
    expect(loginSrc).toContain("flip-card-back");

    // State management
    expect(loginSrc).toContain("const [isFlipped, setIsFlipped] = useState(false)");
    expect(loginSrc).toContain("handleSelectPosition");
    expect(loginSrc).toContain("handleBackToStep1");

    // Return to step 1 navigation
    expect(loginSrc).toContain("ArrowLeft");
    expect(loginSrc).toContain("Đổi vị trí");
    expect(loginSrc).toContain("Quay lại chọn vị trí");

    // Keyboard shortcut Escape for returning to Step 1
    expect(loginSrc).toContain("Escape");
    expect(loginSrc).toContain("addEventListener(\"keydown\", handleKeyDown)");
  });

  it("TC-FLIP-03: Step 1 uses unified primary color scheme across all 4 position buttons", () => {
    const loginSrc = fs.readFileSync(loginPath, "utf-8");

    // Unified primary active/inactive styling
    expect(loginSrc).toContain("bg-primary/40");
    expect(loginSrc).toContain("bg-primary fx-run-dot");

    // Disparate multi-color LED classes must NOT be present in positions config
    expect(loginSrc).not.toContain("bg-dynamo text-white");
    expect(loginSrc).not.toContain("bg-warning text-warning-foreground");
    expect(loginSrc).not.toContain("bg-run text-run-foreground");
    expect(loginSrc).not.toContain("bg-titan text-white");
  });

  it("TC-FLIP-04: Strict removal of ULID terminology in favor of pure admin-issued ID", () => {
    const loginSrc = fs.readFileSync(loginPath, "utf-8");
    const agentsSrc = fs.readFileSync(agentsPath, "utf-8");

    // login.tsx should not expose ULID to users
    expect(loginSrc).not.toContain("ULID");

    // AGENTS.md route architecture should reflect pure admin-issued ID
    expect(agentsSrc).toContain("/login`: Xác thực mã bảo mật");
    expect(agentsSrc).not.toContain("Xác thực mã bảo mật ULID");
  });

  it("TC-FLIP-05: Step 2 backface includes all essential login controls", () => {
    const loginSrc = fs.readFileSync(loginPath, "utf-8");

    // Access code input field
    expect(loginSrc).toContain("inputRef");
    expect(loginSrc).toContain("code");
    expect(loginSrc).toContain("setCode");

    // Kiosk touchscreen numpad toggle
    expect(loginSrc).toContain("kioskMode");
    expect(loginSrc).toContain("setKioskMode");

    // Security lockout & brute-force defense
    expect(loginSrc).toContain("locked");
    expect(loginSrc).toContain("attemptsLeft");

    // Submit button
    expect(loginSrc).toContain("XÁC THỰC VÀO HỆ THỐNG");

    // Support footer text
    expect(loginSrc).toContain("Chưa có mã? Vui lòng liên hệ Quản trị viên");
  });

  it("TC-FLIP-06: Elimination of legacy authentication progress <ol> stepper block", () => {
    const loginSrc = fs.readFileSync(loginPath, "utf-8");

    // Must not contain the ol stepper block in either face
    expect(loginSrc).not.toContain("<ol");
    expect(loginSrc).not.toContain("auth.steps.aria");
    expect(loginSrc).not.toContain("Tiến trình xác thực");
  });

  it("TC-FLIP-07: Visual symmetry, dimension parity and coordinate alignment between front and back faces", () => {
    const loginSrc = fs.readFileSync(loginPath, "utf-8");

    // Both faces enforce optimized base height min-h-[360px] and uniform padding p-7
    expect(loginSrc).toContain("min-h-[360px]");
    expect(loginSrc).toContain("flip-card-front mes-card p-7 shadow-xs flex flex-col justify-start min-h-[360px] gap-5");
    expect(loginSrc).toContain("flip-card-back mes-card p-7 shadow-xs flex flex-col justify-start min-h-[360px] gap-5");

    // Footers adhere to natural layout anchoring via mt-auto
    const mtAutoMatches = loginSrc.match(/mt-auto border-t border-border\/60 pt-4/g);
    expect(mtAutoMatches).not.toBeNull();
    expect(mtAutoMatches?.length).toBeGreaterThanOrEqual(2);

    // Standardized Top Bar height h-7 on both faces
    const topBarMatches = loginSrc.match(/h-7 mb-2 flex items-center justify-between/g);
    expect(topBarMatches).not.toBeNull();
    expect(topBarMatches?.length).toBeGreaterThanOrEqual(2);

    // Identical typography scale text-2xl font-bold on both headings
    const h2Matches = loginSrc.match(/font-display text-2xl font-bold tracking-tight text-foreground/g);
    expect(h2Matches).not.toBeNull();
    expect(h2Matches?.length).toBeGreaterThanOrEqual(2);

    // Stepper step indicator badge alignment
    expect(loginSrc).toContain("BƯỚC 1/2");
    expect(loginSrc).toContain("BƯỚC 2/2");
  });
});

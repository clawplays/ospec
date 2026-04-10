"use strict";
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");
const helpers_1 = require("../utils/helpers");
const { spawn, spawnSync } = require("child_process");
const { createRequire } = require("module");
async function pathExists(targetPath) {
    try {
        await fsp.access(targetPath, fs.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
async function ensureDir(targetPath) {
    await fsp.mkdir(targetPath, { recursive: true });
}
function parseArgs(argv) {
    const args = argv.slice(2);
    const parsed = {
        changePath: "",
        projectPath: "",
    };
    for (let index = 0; index < args.length; index += 1) {
        const arg = String(args[index] || "").trim();
        if (arg === "--change") {
            parsed.changePath = path.resolve(String(args[index + 1] || "").trim());
            index += 1;
            continue;
        }
        if (arg === "--project") {
            parsed.projectPath = path.resolve(String(args[index + 1] || "").trim());
            index += 1;
            continue;
        }
    }
    if (!parsed.changePath || !parsed.projectPath) {
        throw new Error("Usage: node playwright-checkpoint-adapter.js --change <change-path> --project <project-path>");
    }
    return parsed;
}
function firstString(...values) {
    return values.find(value => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}
const ISSUE_METADATA_BY_CODE = {
    auth_failed: { category: "runtime", severity: "error" },
    auth_storage_state_missing: { category: "runtime", severity: "error" },
    auth_storage_state_unconfigured: { category: "config", severity: "error" },
    api_json_failed: { category: "data", severity: "error" },
    api_status_failed: { category: "data", severity: "error" },
    api_text_failed: { category: "data", severity: "error" },
    assert_command_failed: { category: "flow", severity: "error" },
    baseline_missing: { category: "config", severity: "error" },
    baseline_size_mismatch: { category: "config", severity: "error" },
    checkpoint_runtime_failed: { category: "runtime", severity: "error" },
    clipped_text: { category: "typography", severity: "error" },
    color_config_invalid: { category: "config", severity: "error" },
    color_mismatch: { category: "design-token", severity: "error" },
    color_selector_missing: { category: "design-token", severity: "error" },
    color_value_unresolved: { category: "design-token", severity: "error" },
    contrast_failed: { category: "design-token", severity: "error" },
    covered_element: { category: "visibility", severity: "error" },
    element_overlap: { category: "layout", severity: "error" },
    flow_failed: { category: "flow", severity: "error" },
    flows_config_missing: { category: "config", severity: "error" },
    font_family_mismatch: { category: "typography", severity: "error" },
    font_size_mismatch: { category: "typography", severity: "error" },
    font_weight_mismatch: { category: "typography", severity: "error" },
    horizontal_overflow: { category: "responsive", severity: "error" },
    json_assertion_failed: { category: "data", severity: "error" },
    line_height_mismatch: { category: "typography", severity: "error" },
    overlap_selector_hidden: { category: "visibility", severity: "error" },
    overlap_selector_missing: { category: "layout", severity: "error" },
    playwright_missing: { category: "runtime", severity: "error" },
    readiness_failed: { category: "runtime", severity: "error" },
    required_selector_hidden: { category: "visibility", severity: "error" },
    required_selector_missing: { category: "visibility", severity: "error" },
    required_selector_offscreen: { category: "responsive", severity: "error" },
    route_failed: { category: "runtime", severity: "error" },
    routes_config_missing: { category: "config", severity: "error" },
    text_wrap_failed: { category: "typography", severity: "error" },
    typography_selector_missing: { category: "typography", severity: "error" },
    visual_diff_failed: { category: "layout", severity: "error" },
    visual_diff_unavailable: { category: "config", severity: "error" },
    checkpoint_steps_missing: { category: "config", severity: "error" },
};
const ISSUE_EVIDENCE_KEYS = new Set([
    "actual",
    "background",
    "covered_by",
    "details",
    "diff_ratio",
    "distance",
    "estimated_lines",
    "expected",
    "first",
    "foreground",
    "min_ratio",
    "overlap_area",
    "path",
    "property",
    "ratio",
    "rule",
    "second",
    "text",
    "tolerance",
    "url",
]);
function inferIssueCategory(code, extra = {}) {
    const normalizedCode = String(code || "").trim();
    if (normalizedCode && ISSUE_METADATA_BY_CODE[normalizedCode]?.category) {
        return ISSUE_METADATA_BY_CODE[normalizedCode].category;
    }
    if (extra.flow) {
        return "flow";
    }
    if (extra.route || extra.viewport) {
        return "layout";
    }
    return "runtime";
}
function inferIssueSeverity(code, category) {
    const normalizedCode = String(code || "").trim();
    if (normalizedCode && ISSUE_METADATA_BY_CODE[normalizedCode]?.severity) {
        return ISSUE_METADATA_BY_CODE[normalizedCode].severity;
    }
    return category === "config" ? "error" : "error";
}
function normalizeIssueEvidence(extra) {
    const evidence = isObject(extra?.evidence) ? { ...extra.evidence } : {};
    for (const [key, value] of Object.entries(extra || {})) {
        if (!ISSUE_EVIDENCE_KEYS.has(key)) {
            continue;
        }
        if (value === undefined || value === null || value === "") {
            continue;
        }
        evidence[key] = value;
    }
    return Object.keys(evidence).length > 0 ? evidence : undefined;
}
function createIssue(message, extra = {}) {
    const normalizedExtra = isObject(extra) ? extra : {};
    const code = firstString(normalizedExtra.code, "checkpoint_issue");
    const category = firstString(normalizedExtra.category, inferIssueCategory(code, normalizedExtra));
    const severity = firstString(normalizedExtra.severity, inferIssueSeverity(code, category));
    const evidence = normalizeIssueEvidence(normalizedExtra);
    const passthrough = Object.fromEntries(Object.entries(normalizedExtra)
        .filter(([key]) => !["category", "code", "evidence", "flow", "message", "route", "selector", "severity", "step", "viewport"].includes(key)));
    return {
        message: String(message || "").trim(),
        code,
        category,
        severity,
        step: firstString(normalizedExtra.step),
        route: firstString(normalizedExtra.route),
        viewport: firstString(normalizedExtra.viewport),
        flow: firstString(normalizedExtra.flow),
        selector: firstString(normalizedExtra.selector),
        ...(evidence ? { evidence } : {}),
        ...passthrough,
    };
}
function createUiIssue(message, extra = {}) {
    return createIssue(message, {
        step: "checkpoint_ui_review",
        ...extra,
    });
}
function createRouteIssue(routeName, viewportName, message, extra = {}) {
    return createUiIssue(message, {
        route: routeName,
        viewport: viewportName,
        ...extra,
    });
}
function createFlowIssue(flowName, message, extra = {}) {
    return createIssue(message, {
        step: "checkpoint_flow_check",
        flow: flowName,
        ...extra,
    });
}
function createRuntimeIssue(message, extra = {}) {
    return createIssue(message, {
        step: firstString(extra?.step, "checkpoint_runtime"),
        ...extra,
    });
}
function debugLog(...parts) {
    if (process.env.OSPEC_CHECKPOINT_DEBUG !== "1") {
        return;
    }
    process.stderr.write(`[checkpoint-debug] ${parts.map(part => String(part)).join(" ")}\n`);
}
function normalizeStatus(value, fallback = "pending") {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "pass") {
        return "passed";
    }
    if (normalized === "fail" || normalized === "error") {
        return "failed";
    }
    if (normalized === "passed" || normalized === "failed" || normalized === "pending" || normalized === "skipped") {
        return normalized;
    }
    return fallback;
}
function sanitizeName(value, fallback) {
    const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
    return normalized || fallback;
}
function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function readStringList(value) {
    const rawValues = Array.isArray(value)
        ? value
        : value === undefined || value === null || value === false
            ? []
            : [value];
    return Array.from(new Set(rawValues
        .map(item => String(item || "").trim())
        .filter(Boolean)));
}
function toOptionalNumber(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}
function clampByte(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(255, Math.round(value)));
}
function normalizeCssPropertyName(value) {
    const raw = firstString(value, "color");
    return raw
        .replace(/_/g, "-")
        .replace(/[A-Z]/g, character => `-${character.toLowerCase()}`)
        .toLowerCase();
}
function parseColor(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) {
        return null;
    }
    if (normalized === "transparent") {
        return { r: 0, g: 0, b: 0, a: 0 };
    }
    const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        let hexValue = hexMatch[1];
        if (hexValue.length === 3 || hexValue.length === 4) {
            hexValue = hexValue.split("").map(character => `${character}${character}`).join("");
        }
        return {
            r: parseInt(hexValue.slice(0, 2), 16),
            g: parseInt(hexValue.slice(2, 4), 16),
            b: parseInt(hexValue.slice(4, 6), 16),
            a: hexValue.length === 8 ? parseInt(hexValue.slice(6, 8), 16) / 255 : 1,
        };
    }
    const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/);
    if (!rgbMatch) {
        return null;
    }
    const parts = rgbMatch[1].split(",").map(part => part.trim());
    if (parts.length < 3) {
        return null;
    }
    const channels = parts.slice(0, 3).map(part => Number.parseFloat(part));
    if (channels.some(channel => !Number.isFinite(channel))) {
        return null;
    }
    const alpha = parts[3] !== undefined ? Number.parseFloat(parts[3]) : 1;
    return {
        r: clampByte(channels[0]),
        g: clampByte(channels[1]),
        b: clampByte(channels[2]),
        a: Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1,
    };
}
function formatColor(color) {
    if (!color) {
        return "(unresolved)";
    }
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a.toFixed(2)})`;
}
function blendColor(foreground, background) {
    const alpha = Number.isFinite(foreground?.a) ? Math.max(0, Math.min(1, foreground.a)) : 1;
    return {
        r: clampByte((foreground?.r || 0) * alpha + (background?.r || 0) * (1 - alpha)),
        g: clampByte((foreground?.g || 0) * alpha + (background?.g || 0) * (1 - alpha)),
        b: clampByte((foreground?.b || 0) * alpha + (background?.b || 0) * (1 - alpha)),
        a: 1,
    };
}
function relativeLuminance(channel) {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}
function getContrastRatio(foreground, background) {
    const effectiveBackground = background?.a !== undefined && background.a < 1
        ? blendColor(background, { r: 255, g: 255, b: 255, a: 1 })
        : { ...(background || { r: 255, g: 255, b: 255, a: 1 }), a: 1 };
    const effectiveForeground = foreground?.a !== undefined && foreground.a < 1
        ? blendColor(foreground, effectiveBackground)
        : { ...(foreground || { r: 0, g: 0, b: 0, a: 1 }), a: 1 };
    const foregroundLuminance = (0.2126 * relativeLuminance(effectiveForeground.r)) +
        (0.7152 * relativeLuminance(effectiveForeground.g)) +
        (0.0722 * relativeLuminance(effectiveForeground.b));
    const backgroundLuminance = (0.2126 * relativeLuminance(effectiveBackground.r)) +
        (0.7152 * relativeLuminance(effectiveBackground.g)) +
        (0.0722 * relativeLuminance(effectiveBackground.b));
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
}
function getColorDistance(left, right) {
    const alphaLeft = Number.isFinite(left?.a) ? left.a * 255 : 255;
    const alphaRight = Number.isFinite(right?.a) ? right.a * 255 : 255;
    return Math.sqrt(Math.pow((left?.r || 0) - (right?.r || 0), 2) +
        Math.pow((left?.g || 0) - (right?.g || 0), 2) +
        Math.pow((left?.b || 0) - (right?.b || 0), 2) +
        Math.pow(alphaLeft - alphaRight, 2));
}
function getRouteViewports(routeConfig, defaultsConfig) {
    const rawViewports = Array.isArray(routeConfig?.viewports) && routeConfig.viewports.length > 0
        ? routeConfig.viewports
        : Array.isArray(defaultsConfig?.viewports) && defaultsConfig.viewports.length > 0
            ? defaultsConfig.viewports
            : routeConfig?.viewport
                ? [routeConfig.viewport]
                : defaultsConfig?.viewport
                    ? [defaultsConfig.viewport]
                    : ["desktop"];
    const seen = new Set();
    const resolved = [];
    for (const rawViewport of rawViewports) {
        const viewport = getViewportConfig(rawViewport);
        const key = `${viewport.name}:${viewport.width}x${viewport.height}`;
        if (!seen.has(key)) {
            seen.add(key);
            resolved.push(viewport);
        }
    }
    return resolved;
}
function resolveViewportBaselinePath(routeConfig, defaultsConfig, viewportName, workspaceRoot, projectPath) {
    const pickBaseline = (value) => {
        if (typeof value === "string") {
            return value;
        }
        if (!isObject(value)) {
            return "";
        }
        return firstString(value[viewportName], value.default, value.desktop);
    };
    const baselineRef = firstString(pickBaseline(routeConfig?.baseline), pickBaseline(defaultsConfig?.baseline));
    return baselineRef ? resolveMaybePath(baselineRef, workspaceRoot, projectPath) : "";
}
function getRouteRequirements(routeConfig, defaultsConfig) {
    return [
        ...readStringList(defaultsConfig?.requirements),
        ...readStringList(routeConfig?.requirements),
    ];
}
function getRouteIgnoreSelectors(routeConfig, defaultsConfig) {
    return Array.from(new Set([
        ...readStringList(defaultsConfig?.ignore_selectors),
        ...readStringList(routeConfig?.ignore_selectors),
    ]));
}
function getRequiredVisibleSelectors(routeConfig, defaultsConfig) {
    return Array.from(new Set([
        ...readStringList(defaultsConfig?.required_visible),
        ...readStringList(defaultsConfig?.selectors?.required_visible),
        ...readStringList(routeConfig?.required_visible),
        ...readStringList(routeConfig?.selectors?.required_visible),
    ]));
}
function normalizeNoOverlapRule(value, fallbackName) {
    if (Array.isArray(value) && value.length >= 2) {
        const first = firstString(value[0]);
        const second = firstString(value[1]);
        if (first && second) {
            return {
                name: sanitizeName(fallbackName, fallbackName),
                first,
                second,
            };
        }
        return null;
    }
    if (!isObject(value)) {
        return null;
    }
    const first = firstString(value.first, value.left, value.primary);
    const second = firstString(value.second, value.right, value.secondary);
    if (!first || !second) {
        return null;
    }
    return {
        name: sanitizeName(firstString(value.name, fallbackName), fallbackName),
        first,
        second,
    };
}
function getNoOverlapRules(routeConfig, defaultsConfig) {
    const rawRules = [
        ...((Array.isArray(defaultsConfig?.no_overlap) ? defaultsConfig.no_overlap : [])),
        ...((Array.isArray(defaultsConfig?.selectors?.no_overlap) ? defaultsConfig.selectors.no_overlap : [])),
        ...((Array.isArray(routeConfig?.no_overlap) ? routeConfig.no_overlap : [])),
        ...((Array.isArray(routeConfig?.selectors?.no_overlap) ? routeConfig.selectors.no_overlap : [])),
    ];
    return rawRules
        .map((rule, index) => normalizeNoOverlapRule(rule, `no-overlap-${index + 1}`))
        .filter(Boolean);
}
function normalizeTypographyRule(value, fallbackName) {
    if (!isObject(value)) {
        return null;
    }
    const selector = firstString(value.selector);
    if (!selector) {
        return null;
    }
    const maxLines = toOptionalNumber(value.max_lines);
    return {
        name: sanitizeName(firstString(value.name, fallbackName), fallbackName),
        selector,
        font_family_includes: readStringList(value.font_family_includes || value.font_families || value.expected_fonts),
        font_size_min: toOptionalNumber(value.font_size_min),
        font_size_max: toOptionalNumber(value.font_size_max),
        font_weight_min: toOptionalNumber(value.font_weight_min),
        font_weight_max: toOptionalNumber(value.font_weight_max),
        line_height_min: toOptionalNumber(value.line_height_min),
        line_height_max: toOptionalNumber(value.line_height_max),
        single_line: value.single_line === true || value.no_wrap === true,
        max_lines: Number.isFinite(maxLines) && maxLines > 0 ? Math.floor(maxLines) : null,
    };
}
function getTypographyRules(routeConfig, defaultsConfig) {
    const rawRules = [
        ...((Array.isArray(defaultsConfig?.typography) ? defaultsConfig.typography : [])),
        ...((Array.isArray(routeConfig?.typography) ? routeConfig.typography : [])),
    ];
    return rawRules
        .map((rule, index) => normalizeTypographyRule(rule, `typography-${index + 1}`))
        .filter(Boolean);
}
function normalizeColorRule(value, fallbackName) {
    if (!isObject(value)) {
        return null;
    }
    const selector = firstString(value.selector);
    const expected = firstString(value.equals, value.expected, value.value);
    if (!selector || !expected) {
        return null;
    }
    const tolerance = toOptionalNumber(value.tolerance);
    return {
        name: sanitizeName(firstString(value.name, fallbackName), fallbackName),
        selector,
        property: normalizeCssPropertyName(value.property),
        expected,
        tolerance: Number.isFinite(tolerance) && tolerance >= 0 ? tolerance : 0,
    };
}
function getColorRules(routeConfig, defaultsConfig) {
    const rawRules = [
        ...((Array.isArray(defaultsConfig?.colors) ? defaultsConfig.colors : [])),
        ...((Array.isArray(routeConfig?.colors) ? routeConfig.colors : [])),
    ];
    return rawRules
        .map((rule, index) => normalizeColorRule(rule, `color-${index + 1}`))
        .filter(Boolean);
}
function normalizeContrastRule(value, fallbackName) {
    if (typeof value === "string") {
        return {
            name: sanitizeName(fallbackName, fallbackName),
            selectors: [value.trim()],
            min_ratio: 4.5,
            max_issues: 8,
        };
    }
    if (!isObject(value)) {
        return null;
    }
    if (value.enabled === false) {
        return null;
    }
    const selectors = Array.from(new Set([
        ...readStringList(value.selector),
        ...readStringList(value.selectors),
    ]));
    const minRatio = toOptionalNumber(value.min_ratio);
    const maxIssues = toOptionalNumber(value.max_issues);
    return {
        name: sanitizeName(firstString(value.name, fallbackName), fallbackName),
        selectors: selectors.length > 0
            ? selectors
            : ["h1", "h2", "h3", "h4", "p", "a", "button", "label", "input", "textarea", "li"],
        min_ratio: Number.isFinite(minRatio) && minRatio > 0 ? minRatio : 4.5,
        max_issues: Number.isFinite(maxIssues) && maxIssues > 0 ? Math.floor(maxIssues) : 8,
    };
}
function getContrastRules(routeConfig, defaultsConfig) {
    if (routeConfig?.contrast === false) {
        return [];
    }
    const rawRules = [];
    if (defaultsConfig?.contrast !== false) {
        rawRules.push(...(Array.isArray(defaultsConfig?.contrast) ? defaultsConfig.contrast : defaultsConfig?.contrast ? [defaultsConfig.contrast] : []));
    }
    if (routeConfig?.contrast !== undefined) {
        rawRules.push(...(Array.isArray(routeConfig.contrast) ? routeConfig.contrast : routeConfig.contrast ? [routeConfig.contrast] : []));
    }
    if (rawRules.length === 0) {
        rawRules.push({
            name: "default-text-contrast",
            selectors: ["h1", "h2", "h3", "h4", "p", "a", "button", "label", "input", "textarea", "li"],
            min_ratio: 4.5,
            max_issues: 8,
        });
    }
    return rawRules
        .map((rule, index) => normalizeContrastRule(rule, `contrast-${index + 1}`))
        .filter(Boolean);
}
function resolveTemplateValue(value, context) {
    return String(value || "")
        .replace(/\{change_path\}|\$\{change_path\}/g, context.change_path)
        .replace(/\{project_path\}|\$\{project_path\}/g, context.project_path)
        .replace(/\{ospec_package_path\}|\$\{ospec_package_path\}/g, context.ospec_package_path)
        .replace(/\{base_url\}|\$\{base_url\}/g, String(context.base_url || ""))
        .replace(/\{storage_state_path\}|\$\{storage_state_path\}/g, String(context.storage_state_path || ""));
}
function resolveMaybePath(filePath, cwd, projectPath) {
    const normalized = String(filePath || "").trim();
    if (!normalized) {
        return "";
    }
    if (path.isAbsolute(normalized)) {
        return normalized;
    }
    if (normalized.startsWith(".") || normalized.includes("/") || normalized.includes("\\")) {
        return path.resolve(cwd, normalized);
    }
    return path.resolve(projectPath, normalized);
}
function joinUrl(baseUrl, nextPath) {
    const normalizedBase = String(baseUrl || "").trim();
    const normalizedPath = String(nextPath || "").trim();
    if (!normalizedBase) {
        return normalizedPath;
    }
    return new URL(normalizedPath || "/", normalizedBase.endsWith("/") ? normalizedBase : `${normalizedBase}/`).toString();
}
function getViewportConfig(viewport) {
    const raw = typeof viewport === "string" ? viewport.trim().toLowerCase() : "";
    if (viewport && typeof viewport === "object" && !Array.isArray(viewport)) {
        const width = Number.isFinite(viewport.width) ? Math.max(320, Math.floor(viewport.width)) : 1440;
        const height = Number.isFinite(viewport.height) ? Math.max(320, Math.floor(viewport.height)) : 960;
        return {
            name: sanitizeName(viewport.name || `${width}x${height}`, "custom"),
            width,
            height,
        };
    }
    if (raw === "mobile") {
        return { name: "mobile", width: 390, height: 844 };
    }
    if (raw === "tablet") {
        return { name: "tablet", width: 1024, height: 1366 };
    }
    return { name: raw || "desktop", width: 1440, height: 960 };
}
function resolveModule(projectPath, moduleName) {
    const candidates = [
        path.join(projectPath, "package.json"),
        path.join(path.resolve(__dirname, "..", ".."), "package.json"),
        path.join(projectPath, "index.js"),
        path.join(path.resolve(__dirname, "..", ".."), "index.js"),
    ];
    for (const candidate of candidates) {
        try {
            const scopedRequire = createRequire(candidate);
            return scopedRequire(moduleName);
        }
        catch {
        }
    }
    return null;
}
async function loadJson(filePath) {
    return JSON.parse((await fsp.readFile(filePath, "utf8")).replace(/^\uFEFF/, ""));
}
async function readYamlIfExists(filePath) {
    if (!(await pathExists(filePath))) {
        return null;
    }
    return yaml.load(await fsp.readFile(filePath, "utf8"));
}
async function startRuntime(startupConfig, context, traceLogPath) {
    const command = firstString(startupConfig?.command);
    if (!command) {
        return {
            started: false,
            child: null,
            logPath: "",
        };
    }
    const args = Array.isArray(startupConfig?.args) ? startupConfig.args.map(value => resolveTemplateValue(String(value), context)) : [];
    const cwdValue = firstString(startupConfig?.cwd, "${project_path}");
    const cwd = resolveMaybePath(resolveTemplateValue(cwdValue, context), context.project_path, context.project_path);
    await ensureDir(path.dirname(traceLogPath));
    const logStream = fs.createWriteStream(traceLogPath, { flags: "a" });
    const child = spawn(command, args, {
        cwd,
        env: process.env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.pipe(logStream, { end: false });
    child.stderr?.pipe(logStream, { end: false });
    await new Promise((resolve, reject) => {
        let settled = false;
        child.once("spawn", () => {
            settled = true;
            resolve();
        });
        child.once("error", error => {
            if (!settled) {
                reject(error);
            }
        });
        setTimeout(() => {
            if (!settled) {
                resolve();
            }
        }, 250);
    });
    return {
        started: true,
        child,
        logPath: traceLogPath,
        logStream,
    };
}
async function stopRuntime(shutdownConfig, startupState, context) {
    const command = firstString(shutdownConfig?.command);
    if (command) {
        const args = Array.isArray(shutdownConfig?.args) ? shutdownConfig.args.map(value => resolveTemplateValue(String(value), context)) : [];
        const cwdValue = firstString(shutdownConfig?.cwd, "${project_path}");
        const cwd = resolveMaybePath(resolveTemplateValue(cwdValue, context), context.project_path, context.project_path);
        const result = spawnSync(command, args, {
            cwd,
            env: process.env,
            encoding: "utf-8",
            shell: false,
            timeout: Number.isFinite(shutdownConfig?.timeout_ms) && shutdownConfig.timeout_ms > 0 ? Math.floor(shutdownConfig.timeout_ms) : 120000,
        });
        startupState.logStream?.end();
        if (result.error) {
            throw result.error;
        }
        return;
    }
    if (startupState?.child && startupState.child.exitCode === null && !startupState.child.killed) {
        if (process.platform === "win32") {
            spawnSync("taskkill", ["/pid", String(startupState.child.pid), "/t", "/f"], {
                encoding: "utf-8",
                shell: false,
            });
        }
        else {
            try {
                process.kill(-startupState.child.pid, "SIGTERM");
            }
            catch {
                try {
                    startupState.child.kill("SIGTERM");
                }
                catch {
                }
            }
        }
    }
    startupState.logStream?.end();
}
async function waitForReadiness(readinessConfig, baseUrl, startupState) {
    const type = firstString(readinessConfig?.type, "url").toLowerCase();
    if (type !== "url") {
        return {
            ok: false,
            message: `Unsupported readiness type: ${type || "(empty)"}`,
        };
    }
    const readinessUrl = firstString(readinessConfig?.url, baseUrl);
    if (!readinessUrl) {
        return {
            ok: false,
            message: "No readiness URL is configured and runtime.base_url is empty.",
        };
    }
    const timeoutMs = Number.isFinite(readinessConfig?.timeout_ms) && readinessConfig.timeout_ms > 0
        ? Math.floor(readinessConfig.timeout_ms)
        : 180000;
    const startedAt = Date.now();
    let lastError = "";
    while (Date.now() - startedAt < timeoutMs) {
        if (startupState?.child && startupState.child.exitCode !== null && startupState.child.exitCode !== 0) {
            return {
                ok: false,
                message: `Startup command exited before readiness succeeded with code ${startupState.child.exitCode}`,
            };
        }
        try {
            const response = await fetch(readinessUrl, {
                method: "GET",
                redirect: "follow",
            });
            if (response.status < 500) {
                return {
                    ok: true,
                    message: `Readiness probe succeeded with status ${response.status}`,
                };
            }
            lastError = `HTTP ${response.status}`;
        }
        catch (error) {
            lastError = error.message;
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    return {
        ok: false,
        message: `Readiness probe timed out after ${timeoutMs}ms (${lastError || "no successful response"})`,
    };
}
async function runAuthCommand(authConfig, context, storageStatePath, traceLogPath) {
    const command = firstString(authConfig?.command);
    if (!command) {
        return {
            ran: false,
            logPath: "",
            message: "No auth command is configured.",
        };
    }
    const when = firstString(authConfig?.when, "missing_storage_state").toLowerCase();
    const storageStateExists = storageStatePath ? await pathExists(storageStatePath) : false;
    if (when !== "always" && storageStateExists) {
        return {
            ran: false,
            logPath: "",
            message: "Auth command was skipped because storage_state already exists.",
        };
    }
    const args = Array.isArray(authConfig?.args) ? authConfig.args.map(value => resolveTemplateValue(String(value), context)) : [];
    const cwdValue = firstString(authConfig?.cwd, "${project_path}");
    const cwd = resolveMaybePath(resolveTemplateValue(cwdValue, context), context.project_path, context.project_path);
    const timeoutMs = Number.isFinite(authConfig?.timeout_ms) && authConfig.timeout_ms > 0 ? Math.floor(authConfig.timeout_ms) : 300000;
    await ensureDir(path.dirname(traceLogPath));
    const result = spawnSync(command, args, {
        cwd,
        env: {
            ...process.env,
            OSPEC_CHECKPOINT_BASE_URL: String(context.base_url || ""),
            OSPEC_CHECKPOINT_PROJECT_PATH: context.project_path,
            OSPEC_CHECKPOINT_CHANGE_PATH: context.change_path,
            OSPEC_CHECKPOINT_STORAGE_STATE: String(storageStatePath || ""),
            OSPEC_CHECKPOINT_AUTH_DIR: storageStatePath ? path.dirname(storageStatePath) : path.join(context.project_path, ".ospec", "plugins", "checkpoint", "auth"),
            OSPEC_CHECKPOINT_OSPEC_PACKAGE_PATH: context.ospec_package_path,
        },
        encoding: "utf-8",
        shell: false,
        timeout: timeoutMs,
    });
    const combinedOutput = [String(result.stdout || "").trim(), String(result.stderr || "").trim()]
        .filter(Boolean)
        .join("\n");
    if (combinedOutput) {
        await fsp.writeFile(traceLogPath, `${combinedOutput}\n`);
    }
    else {
        await fsp.writeFile(traceLogPath, "");
    }
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`Auth command exited with status ${result.status}: ${combinedOutput || "no output"}`);
    }
    return {
        ran: true,
        logPath: traceLogPath,
        message: "Auth command completed successfully.",
    };
}
async function collectLayoutSignals(page) {
    return page.evaluate(() => {
        const describe = (element) => {
            const parts = [element.tagName.toLowerCase()];
            if (element.id) {
                parts.push(`#${element.id}`);
            }
            if (element.classList && element.classList.length > 0) {
                parts.push(`.${Array.from(element.classList).slice(0, 2).join(".")}`);
            }
            return parts.join("");
        };
        const nodes = Array.from(document.querySelectorAll("body *"));
        const clippedText = [];
        const coveredElements = [];
        for (const element of nodes) {
            const text = (element.textContent || "").trim();
            const style = window.getComputedStyle(element);
            if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity || "1") === 0) {
                continue;
            }
            const rect = element.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                continue;
            }
            if (text) {
                const horizontalClip = element.scrollWidth - element.clientWidth > 4 &&
                    (style.overflowX === "hidden" || style.overflowX === "clip" || style.textOverflow === "ellipsis");
                const verticalClip = element.scrollHeight - element.clientHeight > 4 &&
                    (style.overflowY === "hidden" || style.overflowY === "clip" || style.webkitLineClamp !== "none");
                if (horizontalClip || verticalClip) {
                    clippedText.push({
                        selector: describe(element),
                        text: text.slice(0, 120),
                    });
                }
                if (clippedText.length >= 8) {
                    break;
                }
            }
            if (coveredElements.length < 6 && rect.width >= 24 && rect.height >= 16 && (text || /^(button|a|input|textarea|select)$/i.test(element.tagName))) {
                const centerX = Math.max(0, Math.min(window.innerWidth - 1, rect.left + (rect.width / 2)));
                const centerY = Math.max(0, Math.min(window.innerHeight - 1, rect.top + (rect.height / 2)));
                const topElement = document.elementFromPoint(centerX, centerY);
                if (topElement &&
                    topElement !== element &&
                    !element.contains(topElement) &&
                    !topElement.contains(element)) {
                    coveredElements.push({
                        selector: describe(element),
                        coveredBy: describe(topElement),
                        text: text.slice(0, 120),
                    });
                }
            }
        }
        const doc = document.documentElement;
        return {
            horizontalOverflow: doc.scrollWidth - doc.clientWidth > 1,
            clippedText,
            coveredElements,
        };
    });
}
async function applyIgnoredSelectors(page, selectors) {
    if (!Array.isArray(selectors) || selectors.length === 0) {
        return;
    }
    await page.evaluate((selectorList) => {
        for (const selector of selectorList) {
            try {
                document.querySelectorAll(selector).forEach(element => {
                    element.setAttribute("data-ospec-checkpoint-ignored", "true");
                    element.style.setProperty("visibility", "hidden", "important");
                    element.style.setProperty("opacity", "0", "important");
                    element.style.setProperty("pointer-events", "none", "important");
                });
            }
            catch {
            }
        }
    }, selectors);
}
async function runVisibilityChecks(page, selectors, routeName, viewportName) {
    const issues = [];
    for (const selector of selectors) {
        const inspection = await page.evaluate((targetSelector) => {
            const describe = (element) => {
                const parts = [element.tagName.toLowerCase()];
                if (element.id) {
                    parts.push(`#${element.id}`);
                }
                if (element.classList && element.classList.length > 0) {
                    parts.push(`.${Array.from(element.classList).slice(0, 2).join(".")}`);
                }
                return parts.join("");
            };
            const element = document.querySelector(targetSelector);
            if (!element) {
                return { found: false };
            }
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            const visible = style.visibility !== "hidden" &&
                style.display !== "none" &&
                Number(style.opacity || "1") > 0 &&
                rect.width > 0 &&
                rect.height > 0;
            const inViewport = rect.bottom > 0 &&
                rect.right > 0 &&
                rect.top < window.innerHeight &&
                rect.left < window.innerWidth;
            return {
                found: true,
                visible,
                inViewport,
                resolvedSelector: describe(element),
                text: (element.textContent || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 120),
            };
        }, selector);
        if (!inspection.found) {
            issues.push(createRouteIssue(routeName, viewportName, `Required selector "${selector}" was not found on ${routeName} [${viewportName}].`, { code: "required_selector_missing" }));
            continue;
        }
        if (!inspection.visible) {
            issues.push(createRouteIssue(routeName, viewportName, `Required selector "${selector}" is hidden on ${routeName} [${viewportName}].`, {
                code: "required_selector_hidden",
                selector: inspection.resolvedSelector,
            }));
            continue;
        }
        if (!inspection.inViewport) {
            issues.push(createRouteIssue(routeName, viewportName, `Required selector "${selector}" is outside the current viewport on ${routeName} [${viewportName}].`, {
                code: "required_selector_offscreen",
                selector: inspection.resolvedSelector,
                text: inspection.text,
            }));
        }
    }
    return issues;
}
async function runOverlapChecks(page, rules, routeName, viewportName) {
    const issues = [];
    for (const rule of rules) {
        const inspection = await page.evaluate((input) => {
            const describe = (element) => {
                const parts = [element.tagName.toLowerCase()];
                if (element.id) {
                    parts.push(`#${element.id}`);
                }
                if (element.classList && element.classList.length > 0) {
                    parts.push(`.${Array.from(element.classList).slice(0, 2).join(".")}`);
                }
                return parts.join("");
            };
            const left = document.querySelector(input.first);
            const right = document.querySelector(input.second);
            if (!left || !right) {
                return {
                    foundLeft: Boolean(left),
                    foundRight: Boolean(right),
                };
            }
            const leftStyle = window.getComputedStyle(left);
            const rightStyle = window.getComputedStyle(right);
            const leftRect = left.getBoundingClientRect();
            const rightRect = right.getBoundingClientRect();
            const leftVisible = leftStyle.visibility !== "hidden" && leftStyle.display !== "none" && Number(leftStyle.opacity || "1") > 0 && leftRect.width > 0 && leftRect.height > 0;
            const rightVisible = rightStyle.visibility !== "hidden" && rightStyle.display !== "none" && Number(rightStyle.opacity || "1") > 0 && rightRect.width > 0 && rightRect.height > 0;
            const overlapWidth = Math.max(0, Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left));
            const overlapHeight = Math.max(0, Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top));
            return {
                foundLeft: true,
                foundRight: true,
                leftVisible,
                rightVisible,
                leftSelector: describe(left),
                rightSelector: describe(right),
                overlapArea: overlapWidth * overlapHeight,
            };
        }, rule);
        if (!inspection.foundLeft || !inspection.foundRight) {
            issues.push(createRouteIssue(routeName, viewportName, `No-overlap rule "${rule.name}" could not resolve both selectors on ${routeName} [${viewportName}].`, {
                code: "overlap_selector_missing",
                rule: rule.name,
                first: rule.first,
                second: rule.second,
            }));
            continue;
        }
        if (!inspection.leftVisible || !inspection.rightVisible) {
            issues.push(createRouteIssue(routeName, viewportName, `No-overlap rule "${rule.name}" matched a hidden element on ${routeName} [${viewportName}].`, {
                code: "overlap_selector_hidden",
                first: inspection.leftSelector,
                second: inspection.rightSelector,
            }));
            continue;
        }
        if ((inspection.overlapArea || 0) > 4) {
            issues.push(createRouteIssue(routeName, viewportName, `Selectors "${rule.first}" and "${rule.second}" overlap on ${routeName} [${viewportName}].`, {
                code: "element_overlap",
                rule: rule.name,
                first: inspection.leftSelector,
                second: inspection.rightSelector,
                overlap_area: inspection.overlapArea,
            }));
        }
    }
    return issues;
}
async function runTypographyChecks(page, rules, routeName, viewportName) {
    const issues = [];
    for (const rule of rules) {
        const inspection = await page.evaluate((input) => {
            const normalizeFontWeight = (value) => {
                if (value === "normal") {
                    return 400;
                }
                if (value === "bold") {
                    return 700;
                }
                const numeric = Number.parseFloat(value);
                return Number.isFinite(numeric) ? numeric : null;
            };
            const describe = (element) => {
                const parts = [element.tagName.toLowerCase()];
                if (element.id) {
                    parts.push(`#${element.id}`);
                }
                if (element.classList && element.classList.length > 0) {
                    parts.push(`.${Array.from(element.classList).slice(0, 2).join(".")}`);
                }
                return parts.join("");
            };
            const samples = Array.from(document.querySelectorAll(input.selector))
                .slice(0, 4)
                .map(element => {
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                const lineHeight = style.lineHeight === "normal" ? null : Number.parseFloat(style.lineHeight);
                const estimatedLines = Number.isFinite(lineHeight) && lineHeight > 0
                    ? Math.max(1, Math.round(rect.height / lineHeight))
                    : null;
                return {
                    selector: describe(element),
                    text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
                    visible: style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || "1") > 0 && rect.width > 0 && rect.height > 0,
                    fontFamily: style.fontFamily || "",
                    fontSize: Number.parseFloat(style.fontSize),
                    fontWeight: normalizeFontWeight(style.fontWeight),
                    lineHeight,
                    estimatedLines,
                    wraps: element.scrollWidth - element.clientWidth > 2 || (Number.isFinite(estimatedLines) && estimatedLines > 1),
                };
            });
            return {
                count: samples.length,
                samples,
            };
        }, rule);
        if ((inspection.count || 0) === 0) {
            issues.push(createRouteIssue(routeName, viewportName, `Typography selector "${rule.selector}" was not found on ${routeName} [${viewportName}].`, {
                code: "typography_selector_missing",
                rule: rule.name,
            }));
            continue;
        }
        for (const sample of inspection.samples || []) {
            if (!sample.visible) {
                continue;
            }
            const actualFontFamily = String(sample.fontFamily || "").toLowerCase();
            if (rule.font_family_includes.length > 0 && !rule.font_family_includes.some(expectedFamily => actualFontFamily.includes(String(expectedFamily).toLowerCase()))) {
                issues.push(createRouteIssue(routeName, viewportName, `Typography rule "${rule.name}" expected ${rule.selector} to use ${rule.font_family_includes.join(", ")}, but ${sample.selector} resolved to "${sample.fontFamily}".`, {
                    code: "font_family_mismatch",
                    selector: sample.selector,
                    rule: rule.name,
                    text: sample.text,
                    expected: rule.font_family_includes.join(", "),
                    actual: sample.fontFamily,
                }));
            }
            if (Number.isFinite(rule.font_size_min) && Number.isFinite(sample.fontSize) && sample.fontSize < rule.font_size_min) {
                issues.push(createRouteIssue(routeName, viewportName, `Typography rule "${rule.name}" expected ${rule.selector} font-size >= ${rule.font_size_min}px, but ${sample.selector} resolved to ${sample.fontSize}px.`, {
                    code: "font_size_mismatch",
                    selector: sample.selector,
                    rule: rule.name,
                    text: sample.text,
                    expected: `>= ${rule.font_size_min}px`,
                    actual: `${sample.fontSize}px`,
                }));
            }
            if (Number.isFinite(rule.font_size_max) && Number.isFinite(sample.fontSize) && sample.fontSize > rule.font_size_max) {
                issues.push(createRouteIssue(routeName, viewportName, `Typography rule "${rule.name}" expected ${rule.selector} font-size <= ${rule.font_size_max}px, but ${sample.selector} resolved to ${sample.fontSize}px.`, {
                    code: "font_size_mismatch",
                    selector: sample.selector,
                    rule: rule.name,
                    text: sample.text,
                    expected: `<= ${rule.font_size_max}px`,
                    actual: `${sample.fontSize}px`,
                }));
            }
            if (Number.isFinite(rule.font_weight_min) && Number.isFinite(sample.fontWeight) && sample.fontWeight < rule.font_weight_min) {
                issues.push(createRouteIssue(routeName, viewportName, `Typography rule "${rule.name}" expected ${rule.selector} font-weight >= ${rule.font_weight_min}, but ${sample.selector} resolved to ${sample.fontWeight}.`, {
                    code: "font_weight_mismatch",
                    selector: sample.selector,
                    rule: rule.name,
                    text: sample.text,
                    expected: `>= ${rule.font_weight_min}`,
                    actual: String(sample.fontWeight),
                }));
            }
            if (Number.isFinite(rule.font_weight_max) && Number.isFinite(sample.fontWeight) && sample.fontWeight > rule.font_weight_max) {
                issues.push(createRouteIssue(routeName, viewportName, `Typography rule "${rule.name}" expected ${rule.selector} font-weight <= ${rule.font_weight_max}, but ${sample.selector} resolved to ${sample.fontWeight}.`, {
                    code: "font_weight_mismatch",
                    selector: sample.selector,
                    rule: rule.name,
                    text: sample.text,
                    expected: `<= ${rule.font_weight_max}`,
                    actual: String(sample.fontWeight),
                }));
            }
            if (Number.isFinite(rule.line_height_min) && Number.isFinite(sample.lineHeight) && sample.lineHeight < rule.line_height_min) {
                issues.push(createRouteIssue(routeName, viewportName, `Typography rule "${rule.name}" expected ${rule.selector} line-height >= ${rule.line_height_min}px, but ${sample.selector} resolved to ${sample.lineHeight}px.`, {
                    code: "line_height_mismatch",
                    selector: sample.selector,
                    rule: rule.name,
                    text: sample.text,
                    expected: `>= ${rule.line_height_min}px`,
                    actual: `${sample.lineHeight}px`,
                }));
            }
            if (Number.isFinite(rule.line_height_max) && Number.isFinite(sample.lineHeight) && sample.lineHeight > rule.line_height_max) {
                issues.push(createRouteIssue(routeName, viewportName, `Typography rule "${rule.name}" expected ${rule.selector} line-height <= ${rule.line_height_max}px, but ${sample.selector} resolved to ${sample.lineHeight}px.`, {
                    code: "line_height_mismatch",
                    selector: sample.selector,
                    rule: rule.name,
                    text: sample.text,
                    expected: `<= ${rule.line_height_max}px`,
                    actual: `${sample.lineHeight}px`,
                }));
            }
            if (rule.single_line && sample.wraps) {
                issues.push(createRouteIssue(routeName, viewportName, `Typography rule "${rule.name}" expected ${rule.selector} to remain on one line, but ${sample.selector} appears wrapped on ${routeName} [${viewportName}].`, {
                    code: "text_wrap_failed",
                    selector: sample.selector,
                    rule: rule.name,
                    text: sample.text,
                    expected: "single line",
                    estimated_lines: sample.estimatedLines,
                }));
            }
            if (Number.isFinite(rule.max_lines) && Number.isFinite(sample.estimatedLines) && sample.estimatedLines > rule.max_lines) {
                issues.push(createRouteIssue(routeName, viewportName, `Typography rule "${rule.name}" expected ${rule.selector} to stay within ${rule.max_lines} lines, but ${sample.selector} appears to use ${sample.estimatedLines} lines.`, {
                    code: "text_wrap_failed",
                    selector: sample.selector,
                    rule: rule.name,
                    text: sample.text,
                    expected: `<= ${rule.max_lines} lines`,
                    actual: `${sample.estimatedLines} lines`,
                    estimated_lines: sample.estimatedLines,
                }));
            }
        }
    }
    return issues;
}
async function runColorChecks(page, rules, routeName, viewportName) {
    const issues = [];
    for (const rule of rules) {
        const expectedColor = parseColor(rule.expected);
        if (!expectedColor) {
            issues.push(createRouteIssue(routeName, viewportName, `Color rule "${rule.name}" uses an unsupported expected color "${rule.expected}".`, {
                code: "color_config_invalid",
                rule: rule.name,
                expected: rule.expected,
            }));
            continue;
        }
        const inspection = await page.evaluate((input) => {
            const describe = (element) => {
                const parts = [element.tagName.toLowerCase()];
                if (element.id) {
                    parts.push(`#${element.id}`);
                }
                if (element.classList && element.classList.length > 0) {
                    parts.push(`.${Array.from(element.classList).slice(0, 2).join(".")}`);
                }
                return parts.join("");
            };
            const samples = Array.from(document.querySelectorAll(input.selector))
                .slice(0, 4)
                .map(element => {
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                const cssValue = style.getPropertyValue(input.property) || style[input.camelProperty] || "";
                return {
                    selector: describe(element),
                    text: (element.textContent || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 120),
                    visible: style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || "1") > 0 && rect.width > 0 && rect.height > 0,
                    value: String(cssValue || "").trim(),
                };
            });
            return {
                count: samples.length,
                samples,
            };
        }, {
            selector: rule.selector,
            property: rule.property,
            camelProperty: rule.property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
        });
        if ((inspection.count || 0) === 0) {
            issues.push(createRouteIssue(routeName, viewportName, `Color selector "${rule.selector}" was not found on ${routeName} [${viewportName}].`, {
                code: "color_selector_missing",
                rule: rule.name,
                selector: rule.selector,
            }));
            continue;
        }
        for (const sample of inspection.samples || []) {
            if (!sample.visible) {
                continue;
            }
            const actualColor = parseColor(sample.value);
            if (!actualColor) {
                issues.push(createRouteIssue(routeName, viewportName, `Color rule "${rule.name}" could not resolve ${rule.property} for ${sample.selector} on ${routeName} [${viewportName}].`, {
                    code: "color_value_unresolved",
                    selector: sample.selector,
                    rule: rule.name,
                    property: rule.property,
                }));
                continue;
            }
            const distance = getColorDistance(actualColor, expectedColor);
            if (distance > rule.tolerance) {
                issues.push(createRouteIssue(routeName, viewportName, `Color rule "${rule.name}" expected ${rule.selector} ${rule.property} near ${rule.expected}, but ${sample.selector} resolved to ${sample.value} on ${routeName} [${viewportName}].`, {
                    code: "color_mismatch",
                    selector: sample.selector,
                    rule: rule.name,
                    property: rule.property,
                    text: sample.text,
                    actual: formatColor(actualColor),
                    expected: formatColor(expectedColor),
                    tolerance: rule.tolerance,
                    distance: Number(distance.toFixed(2)),
                }));
            }
        }
    }
    return issues;
}
async function runContrastChecks(page, rules, routeName, viewportName) {
    const issues = [];
    for (const rule of rules) {
        const samples = await page.evaluate((input) => {
            const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
            const parse = (value) => {
                const normalized = String(value || "").trim().toLowerCase();
                if (!normalized) {
                    return null;
                }
                if (normalized === "transparent") {
                    return { r: 0, g: 0, b: 0, a: 0 };
                }
                const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
                if (hexMatch) {
                    let hexValue = hexMatch[1];
                    if (hexValue.length === 3 || hexValue.length === 4) {
                        hexValue = hexValue.split("").map(character => `${character}${character}`).join("");
                    }
                    return {
                        r: Number.parseInt(hexValue.slice(0, 2), 16),
                        g: Number.parseInt(hexValue.slice(2, 4), 16),
                        b: Number.parseInt(hexValue.slice(4, 6), 16),
                        a: hexValue.length === 8 ? Number.parseInt(hexValue.slice(6, 8), 16) / 255 : 1,
                    };
                }
                const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/);
                if (!rgbMatch) {
                    return null;
                }
                const parts = rgbMatch[1].split(",").map(part => part.trim());
                if (parts.length < 3) {
                    return null;
                }
                const alpha = parts[3] !== undefined ? Number.parseFloat(parts[3]) : 1;
                return {
                    r: clamp(Number.parseFloat(parts[0])),
                    g: clamp(Number.parseFloat(parts[1])),
                    b: clamp(Number.parseFloat(parts[2])),
                    a: Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1,
                };
            };
            const blend = (foreground, background) => {
                const alpha = Number.isFinite(foreground?.a) ? Math.max(0, Math.min(1, foreground.a)) : 1;
                return {
                    r: clamp((foreground?.r || 0) * alpha + (background?.r || 0) * (1 - alpha)),
                    g: clamp((foreground?.g || 0) * alpha + (background?.g || 0) * (1 - alpha)),
                    b: clamp((foreground?.b || 0) * alpha + (background?.b || 0) * (1 - alpha)),
                    a: 1,
                };
            };
            const luminance = (channel) => {
                const normalized = channel / 255;
                return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
            };
            const contrastRatio = (foreground, background) => {
                const effectiveBackground = background?.a !== undefined && background.a < 1
                    ? blend(background, { r: 255, g: 255, b: 255, a: 1 })
                    : { ...(background || { r: 255, g: 255, b: 255, a: 1 }), a: 1 };
                const effectiveForeground = foreground?.a !== undefined && foreground.a < 1
                    ? blend(foreground, effectiveBackground)
                    : { ...(foreground || { r: 0, g: 0, b: 0, a: 1 }), a: 1 };
                const foregroundLuminance = (0.2126 * luminance(effectiveForeground.r)) +
                    (0.7152 * luminance(effectiveForeground.g)) +
                    (0.0722 * luminance(effectiveForeground.b));
                const backgroundLuminance = (0.2126 * luminance(effectiveBackground.r)) +
                    (0.7152 * luminance(effectiveBackground.g)) +
                    (0.0722 * luminance(effectiveBackground.b));
                const lighter = Math.max(foregroundLuminance, backgroundLuminance);
                const darker = Math.min(foregroundLuminance, backgroundLuminance);
                return (lighter + 0.05) / (darker + 0.05);
            };
            const describe = (element) => {
                const parts = [element.tagName.toLowerCase()];
                if (element.id) {
                    parts.push(`#${element.id}`);
                }
                if (element.classList && element.classList.length > 0) {
                    parts.push(`.${Array.from(element.classList).slice(0, 2).join(".")}`);
                }
                return parts.join("");
            };
            const uniqueElements = Array.from(new Set(input.selectors
                .flatMap(selector => {
                try {
                    return Array.from(document.querySelectorAll(selector));
                }
                catch {
                    return [];
                }
            })));
            const results = [];
            for (const element of uniqueElements) {
                if (results.length >= input.maxIssues) {
                    break;
                }
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity || "1") === 0 || rect.width <= 0 || rect.height <= 0) {
                    continue;
                }
                const text = (element.textContent || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ");
                if (!text) {
                    continue;
                }
                const foreground = parse(style.color);
                if (!foreground) {
                    continue;
                }
                let cursor = element;
                let background = null;
                while (cursor) {
                    const backgroundColor = parse(window.getComputedStyle(cursor).backgroundColor);
                    if (backgroundColor && backgroundColor.a > 0.01) {
                        background = backgroundColor;
                        break;
                    }
                    cursor = cursor.parentElement;
                }
                const ratio = contrastRatio(foreground, background || { r: 255, g: 255, b: 255, a: 1 });
                if (ratio < input.minRatio) {
                    results.push({
                        selector: describe(element),
                        text: text.slice(0, 120),
                        ratio,
                        foreground: style.color,
                        background: background ? `rgba(${background.r}, ${background.g}, ${background.b}, ${background.a.toFixed(2)})` : "rgba(255, 255, 255, 1.00)",
                    });
                }
            }
            return results;
        }, {
            selectors: rule.selectors,
            minRatio: rule.min_ratio,
            maxIssues: rule.max_issues,
        });
        for (const sample of samples) {
            issues.push(createRouteIssue(routeName, viewportName, `Contrast rule "${rule.name}" found low contrast (${sample.ratio.toFixed(2)}) on ${sample.selector} in ${routeName} [${viewportName}].`, {
                code: "contrast_failed",
                selector: sample.selector,
                rule: rule.name,
                text: sample.text,
                ratio: Number(sample.ratio.toFixed(2)),
                min_ratio: rule.min_ratio,
                foreground: sample.foreground,
                background: sample.background,
            }));
        }
    }
    return issues;
}
async function compareAgainstBaseline(modules, screenshotPath, baselinePath, diffPath, routeConfig, issueContext = {}) {
    if (!baselinePath) {
        return {
            ok: false,
            issues: [createUiIssue("Baseline screenshot is not configured for this route.", {
                    code: "baseline_missing",
                    ...issueContext,
                })],
            artifacts: [],
        };
    }
    if (!(await pathExists(baselinePath))) {
        return {
            ok: false,
            issues: [createUiIssue(`Baseline screenshot is missing: ${baselinePath}`, {
                    code: "baseline_missing",
                    path: baselinePath,
                    ...issueContext,
                })],
            artifacts: [],
        };
    }
    if (!modules.pixelmatch || !modules.PNG) {
        return {
            ok: false,
            issues: [createUiIssue("pixelmatch/pngjs is not available, so visual diff cannot run.", {
                    code: "visual_diff_unavailable",
                    ...issueContext,
                })],
            artifacts: [],
        };
    }
    const threshold = Number.isFinite(routeConfig?.diff_threshold) && routeConfig.diff_threshold >= 0
        ? Number(routeConfig.diff_threshold)
        : 0.01;
    const baselinePng = modules.PNG.sync.read(await fsp.readFile(baselinePath));
    const actualPng = modules.PNG.sync.read(await fsp.readFile(screenshotPath));
    if (baselinePng.width !== actualPng.width || baselinePng.height !== actualPng.height) {
        return {
            ok: false,
            issues: [createUiIssue(`Baseline dimensions ${baselinePng.width}x${baselinePng.height} do not match actual screenshot ${actualPng.width}x${actualPng.height}.`, {
                    code: "baseline_size_mismatch",
                    expected: `${baselinePng.width}x${baselinePng.height}`,
                    actual: `${actualPng.width}x${actualPng.height}`,
                    ...issueContext,
                })],
            artifacts: [],
        };
    }
    const diffPng = new modules.PNG({ width: actualPng.width, height: actualPng.height });
    const diffPixels = modules.pixelmatch(actualPng.data, baselinePng.data, diffPng.data, actualPng.width, actualPng.height, {
        threshold: 0.1,
    });
    const diffRatio = diffPixels / Math.max(1, actualPng.width * actualPng.height);
    if (diffPixels > 0) {
        await fsp.writeFile(diffPath, modules.PNG.sync.write(diffPng));
    }
    return {
        ok: diffRatio <= threshold,
        issues: diffRatio <= threshold
            ? []
            : [createUiIssue(`Visual diff ratio ${diffRatio.toFixed(4)} exceeds threshold ${threshold.toFixed(4)}.`, {
                    code: "visual_diff_failed",
                    diff_ratio: Number(diffRatio.toFixed(4)),
                    tolerance: Number(threshold.toFixed(4)),
                    path: diffPath,
                    ...issueContext,
                })],
        artifacts: diffPixels > 0 ? [{ path: diffPath, label: "visual diff", type: "diff" }] : [],
        diffRatio,
    };
}
async function runUiReview(playwright, modules, projectPath, checkpointConfig, artifactPaths, storageStatePath) {
    debugLog("ui_review:start", projectPath);
    const workspaceRoot = path.join(projectPath, ".ospec", "plugins", "checkpoint");
    const routesPath = path.join(workspaceRoot, "routes.yaml");
    const routesConfig = await readYamlIfExists(routesPath);
    if (!routesConfig || !Array.isArray(routesConfig.routes) || routesConfig.routes.length === 0) {
        return {
            status: "failed",
            issues: [createUiIssue("routes.yaml is missing or does not define any routes.", { code: "routes_config_missing", category: "config" })],
            routes: [],
            artifacts: [],
        };
    }
    const browser = await playwright.chromium.launch({ headless: true });
    const defaultsConfig = isObject(routesConfig?.defaults) ? routesConfig.defaults : {};
    const contextOptions = {
        ignoreHTTPSErrors: true,
        baseURL: firstString(checkpointConfig?.runtime?.base_url),
    };
    if (storageStatePath && await pathExists(storageStatePath)) {
        contextOptions.storageState = storageStatePath;
    }
    const browserContext = await browser.newContext(contextOptions);
    const tracePath = path.join(artifactPaths.tracesDir, "ui-review-trace.zip");
    await browserContext.tracing.start({ screenshots: true, snapshots: true });
    const issues = [];
    const routes = [];
    const artifacts = [];
    try {
        for (let index = 0; index < routesConfig.routes.length; index += 1) {
            const routeConfig = routesConfig.routes[index] || {};
            const routeName = sanitizeName(firstString(routeConfig.name, routeConfig.path, `route-${index + 1}`), `route-${index + 1}`);
            const routeUrl = joinUrl(firstString(routeConfig.base_url, checkpointConfig?.runtime?.base_url), firstString(routeConfig.path, routeConfig.url, "/"));
            const viewports = getRouteViewports(routeConfig, defaultsConfig);
            const requiredVisibleSelectors = getRequiredVisibleSelectors(routeConfig, defaultsConfig);
            const noOverlapRules = getNoOverlapRules(routeConfig, defaultsConfig);
            const typographyRules = getTypographyRules(routeConfig, defaultsConfig);
            const colorRules = getColorRules(routeConfig, defaultsConfig);
            const contrastRules = getContrastRules(routeConfig, defaultsConfig);
            const ignoreSelectors = getRouteIgnoreSelectors(routeConfig, defaultsConfig);
            const routeRequirements = getRouteRequirements(routeConfig, defaultsConfig);
            const routeTimeoutMs = Number.isFinite(routeConfig.timeout_ms) && routeConfig.timeout_ms > 0
                ? Math.floor(routeConfig.timeout_ms)
                : Number.isFinite(defaultsConfig?.timeout_ms) && defaultsConfig.timeout_ms > 0
                    ? Math.floor(defaultsConfig.timeout_ms)
                    : 60000;
            const waitAfterLoadMs = Number.isFinite(routeConfig.wait_after_load_ms) && routeConfig.wait_after_load_ms > 0
                ? Math.floor(routeConfig.wait_after_load_ms)
                : Number.isFinite(defaultsConfig?.wait_after_load_ms) && defaultsConfig.wait_after_load_ms > 0
                    ? Math.floor(defaultsConfig.wait_after_load_ms)
                    : 0;
            const fullPage = routeConfig.full_page !== undefined
                ? routeConfig.full_page !== false
                : defaultsConfig?.full_page !== false;
            const diffThreshold = Number.isFinite(routeConfig.diff_threshold) && routeConfig.diff_threshold >= 0
                ? Number(routeConfig.diff_threshold)
                : Number.isFinite(defaultsConfig?.diff_threshold) && defaultsConfig.diff_threshold >= 0
                    ? Number(defaultsConfig.diff_threshold)
                    : undefined;
            for (const viewport of viewports) {
                debugLog("ui_review:route", routeName, viewport.name, routeUrl);
                const page = await browserContext.newPage();
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
                const routeIssues = [];
                let screenshotPath = "";
                let baselinePath = "";
                let diffPath = "";
                try {
                    await page.goto(routeUrl, {
                        waitUntil: "networkidle",
                        timeout: routeTimeoutMs,
                    });
                    await page.evaluate(async () => {
                        if (document.fonts && document.fonts.ready) {
                            await document.fonts.ready;
                        }
                    });
                    if (waitAfterLoadMs > 0) {
                        await page.waitForTimeout(waitAfterLoadMs);
                    }
                    await applyIgnoredSelectors(page, ignoreSelectors);
                    screenshotPath = path.join(artifactPaths.screenshotsDir, `${routeName}-${viewport.name}.png`);
                    await page.screenshot({
                        path: screenshotPath,
                        fullPage: fullPage !== false,
                    });
                    artifacts.push({
                        path: screenshotPath,
                        label: `${routeName} screenshot`,
                        type: "screenshot",
                    });
                    const layoutSignals = await collectLayoutSignals(page);
                    if (layoutSignals.horizontalOverflow) {
                        routeIssues.push(createRouteIssue(routeName, viewport.name, `Horizontal overflow was detected on ${routeName} [${viewport.name}].`, { code: "horizontal_overflow" }));
                    }
                    for (const clippedEntry of layoutSignals.clippedText) {
                        routeIssues.push(createRouteIssue(routeName, viewport.name, `Potential clipped text at ${clippedEntry.selector} on ${routeName} [${viewport.name}]: ${clippedEntry.text}`, {
                            code: "clipped_text",
                            selector: clippedEntry.selector,
                            text: clippedEntry.text,
                        }));
                    }
                    for (const coveredEntry of layoutSignals.coveredElements || []) {
                        routeIssues.push(createRouteIssue(routeName, viewport.name, `Potentially covered element ${coveredEntry.selector} on ${routeName} [${viewport.name}] is blocked by ${coveredEntry.coveredBy}.`, {
                            code: "covered_element",
                            selector: coveredEntry.selector,
                            covered_by: coveredEntry.coveredBy,
                            text: coveredEntry.text,
                        }));
                    }
                    routeIssues.push(...await runVisibilityChecks(page, requiredVisibleSelectors, routeName, viewport.name));
                    routeIssues.push(...await runOverlapChecks(page, noOverlapRules, routeName, viewport.name));
                    routeIssues.push(...await runTypographyChecks(page, typographyRules, routeName, viewport.name));
                    routeIssues.push(...await runColorChecks(page, colorRules, routeName, viewport.name));
                    routeIssues.push(...await runContrastChecks(page, contrastRules, routeName, viewport.name));
                    baselinePath = resolveViewportBaselinePath(routeConfig, defaultsConfig, viewport.name, workspaceRoot, projectPath);
                    diffPath = path.join(artifactPaths.diffsDir, `${routeName}-${viewport.name}.png`);
                    const visualDiff = await compareAgainstBaseline(modules, screenshotPath, baselinePath, diffPath, diffThreshold === undefined ? routeConfig : { diff_threshold: diffThreshold }, {
                        route: routeName,
                        viewport: viewport.name,
                    });
                    routeIssues.push(...visualDiff.issues);
                    if (visualDiff.artifacts.length > 0) {
                        artifacts.push(...visualDiff.artifacts);
                    }
                    routes.push({
                        name: routeName,
                        url: routeUrl,
                        viewport: viewport.name,
                        viewport_size: `${viewport.width}x${viewport.height}`,
                        screenshot_path: screenshotPath,
                        baseline_path: baselinePath,
                        diff_path: visualDiff.artifacts[0]?.path || "",
                        diff_ratio: Number.isFinite(visualDiff.diffRatio) ? visualDiff.diffRatio : null,
                        requirements: routeRequirements,
                        status: routeIssues.length === 0 ? "passed" : "failed",
                        issues: routeIssues,
                    });
                    debugLog("ui_review:route_done", routeName, viewport.name, routeIssues.length === 0 ? "passed" : "failed");
                }
                catch (error) {
                    debugLog("ui_review:route_error", routeName, viewport.name, error.message || String(error));
                    routeIssues.push(createRouteIssue(routeName, viewport.name, `Route ${routeName} [${viewport.name}] failed: ${error.message}`, { code: "route_failed" }));
                    routes.push({
                        name: routeName,
                        url: routeUrl,
                        viewport: viewport.name,
                        viewport_size: `${viewport.width}x${viewport.height}`,
                        screenshot_path: screenshotPath,
                        baseline_path: baselinePath,
                        diff_path: diffPath,
                        diff_ratio: null,
                        requirements: routeRequirements,
                        status: "failed",
                        issues: routeIssues,
                    });
                }
                issues.push(...routeIssues);
                await page.close();
            }
        }
    }
    finally {
        debugLog("ui_review:trace_stop");
        await browserContext.tracing.stop({ path: tracePath }).catch(() => undefined);
        if (await pathExists(tracePath)) {
            artifacts.push({
                path: tracePath,
                label: "ui review trace",
                type: "trace",
            });
        }
        await browserContext.close();
        await browser.close();
        debugLog("ui_review:done");
    }
    return {
        status: issues.length === 0 ? "passed" : "failed",
        issues,
        routes,
        artifacts,
    };
}
async function executeFlowStep(page, step, baseUrl, artifactPaths, flowName) {
    const action = String(step?.action || "").trim().toLowerCase();
    const timeoutMs = Number.isFinite(step?.timeout_ms) && step.timeout_ms > 0 ? Math.floor(step.timeout_ms) : 30000;
    if (action === "goto" || action === "visit") {
        await page.goto(joinUrl(baseUrl, firstString(step.url, step.path, "/")), {
            waitUntil: firstString(step.wait_until, "networkidle"),
            timeout: timeoutMs,
        });
        return [];
    }
    if (action === "wait_for_load") {
        await page.waitForLoadState(firstString(step.state, "networkidle"), { timeout: timeoutMs });
        return [];
    }
    if (action === "wait_for_selector") {
        await page.waitForSelector(firstString(step.selector), {
            timeout: timeoutMs,
            state: firstString(step.state, "visible"),
        });
        return [];
    }
    if (action === "click") {
        await page.locator(firstString(step.selector)).click({ timeout: timeoutMs });
        return [];
    }
    if (action === "fill") {
        await page.locator(firstString(step.selector)).fill(firstString(step.value), { timeout: timeoutMs });
        return [];
    }
    if (action === "press") {
        await page.locator(firstString(step.selector)).press(firstString(step.key, "Enter"), { timeout: timeoutMs });
        return [];
    }
    if (action === "assert_text") {
        const expectedText = firstString(step.text, step.value);
        const actualText = step.selector
            ? await page.locator(firstString(step.selector)).textContent({ timeout: timeoutMs })
            : await page.locator("body").textContent({ timeout: timeoutMs });
        if (!String(actualText || "").includes(expectedText)) {
            throw new Error(`Expected text "${expectedText}" was not found.`);
        }
        return [];
    }
    if (action === "assert_url") {
        const currentUrl = page.url();
        const expectedExact = firstString(step.exact);
        const expectedIncludes = firstString(step.includes, step.url);
        if (expectedExact && currentUrl !== expectedExact) {
            throw new Error(`Expected URL "${expectedExact}" but found "${currentUrl}".`);
        }
        if (expectedIncludes && !currentUrl.includes(expectedIncludes)) {
            throw new Error(`Expected URL to include "${expectedIncludes}" but found "${currentUrl}".`);
        }
        return [];
    }
    if (action === "screenshot") {
        const screenshotName = sanitizeName(firstString(step.name, `${flowName}-step`), `${flowName}-step`);
        const screenshotPath = path.join(artifactPaths.screenshotsDir, `${screenshotName}.png`);
        await page.screenshot({
            path: screenshotPath,
            fullPage: step.full_page !== false,
        });
        return [{
                path: screenshotPath,
                label: `${flowName} screenshot`,
                type: "screenshot",
            }];
    }
    throw new Error(`Unsupported flow action: ${action || "(empty)"}`);
}
function assertJsonSubset(actual, expected, trail = "", issueContext = {}) {
    if (expected === null || typeof expected !== "object" || Array.isArray(expected)) {
        const matches = JSON.stringify(actual) === JSON.stringify(expected);
        return matches ? [] : [createIssue(`JSON assertion failed at ${trail || "$"}: expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}.`, {
                code: "json_assertion_failed",
                expected,
                actual,
                ...issueContext,
            })];
    }
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
        return [createIssue(`JSON assertion failed at ${trail || "$"}: expected an object.`, {
                code: "json_assertion_failed",
                expected,
                actual,
                ...issueContext,
            })];
    }
    const issues = [];
    for (const [key, value] of Object.entries(expected)) {
        issues.push(...assertJsonSubset(actual[key], value, trail ? `${trail}.${key}` : key, issueContext));
    }
    return issues;
}
async function runFlowCheck(playwright, projectPath, checkpointConfig, artifactPaths, storageStatePath) {
    const workspaceRoot = path.join(projectPath, ".ospec", "plugins", "checkpoint");
    const flowsPath = path.join(workspaceRoot, "flows.yaml");
    const flowsConfig = await readYamlIfExists(flowsPath);
    if (!flowsConfig || !Array.isArray(flowsConfig.flows) || flowsConfig.flows.length === 0) {
        return {
            status: "failed",
            issues: [createIssue("flows.yaml is missing or does not define any flows.", {
                    code: "flows_config_missing",
                    category: "config",
                    severity: "error",
                    step: "checkpoint_flow_check",
                })],
            flows: [],
            artifacts: [],
        };
    }
    const browser = await playwright.chromium.launch({ headless: true });
    const contextOptions = {
        ignoreHTTPSErrors: true,
        baseURL: firstString(checkpointConfig?.runtime?.base_url),
    };
    if (storageStatePath && await pathExists(storageStatePath)) {
        contextOptions.storageState = storageStatePath;
    }
    const browserContext = await browser.newContext(contextOptions);
    const requestContext = await playwright.request.newContext({
        baseURL: firstString(checkpointConfig?.runtime?.base_url),
        ignoreHTTPSErrors: true,
        storageState: storageStatePath && await pathExists(storageStatePath) ? storageStatePath : undefined,
    });
    const tracePath = path.join(artifactPaths.tracesDir, "flow-check-trace.zip");
    await browserContext.tracing.start({ screenshots: true, snapshots: true });
    const issues = [];
    const flows = [];
    const artifacts = [];
    try {
        for (let index = 0; index < flowsConfig.flows.length; index += 1) {
            const flowConfig = flowsConfig.flows[index] || {};
            const flowName = sanitizeName(firstString(flowConfig.name, `flow-${index + 1}`), `flow-${index + 1}`);
            const page = await browserContext.newPage();
            const flowIssues = [];
            const flowArtifacts = [];
            try {
                const startUrl = firstString(flowConfig.start_url, flowConfig.url);
                if (startUrl) {
                    await page.goto(joinUrl(firstString(checkpointConfig?.runtime?.base_url), startUrl), {
                        waitUntil: "networkidle",
                        timeout: 60000,
                    });
                }
                for (const step of Array.isArray(flowConfig.steps) ? flowConfig.steps : []) {
                    const producedArtifacts = await executeFlowStep(page, step, firstString(checkpointConfig?.runtime?.base_url), artifactPaths, flowName);
                    flowArtifacts.push(...producedArtifacts);
                }
                for (const assertion of Array.isArray(flowConfig.api_assertions) ? flowConfig.api_assertions : []) {
                    const response = await requestContext.fetch(joinUrl(firstString(checkpointConfig?.runtime?.base_url), firstString(assertion.url, assertion.path)), {
                        method: firstString(assertion.method, "GET"),
                        headers: assertion.headers && typeof assertion.headers === "object" ? assertion.headers : {},
                    });
                    const expectedStatus = Number.isFinite(assertion.expect_status) ? Math.floor(assertion.expect_status) : 200;
                    if (response.status() !== expectedStatus) {
                        flowIssues.push(createFlowIssue(flowName, `API assertion for ${assertion.url || assertion.path} expected status ${expectedStatus} but received ${response.status()}.`, {
                            code: "api_status_failed",
                            url: firstString(assertion.url, assertion.path),
                            expected: expectedStatus,
                            actual: response.status(),
                        }));
                    }
                    if (assertion.expect_text) {
                        const responseText = await response.text();
                        if (!responseText.includes(String(assertion.expect_text))) {
                            flowIssues.push(createFlowIssue(flowName, `API assertion for ${assertion.url || assertion.path} did not include expected text "${assertion.expect_text}".`, {
                                code: "api_text_failed",
                                url: firstString(assertion.url, assertion.path),
                                expected: assertion.expect_text,
                                actual: responseText.slice(0, 240),
                            }));
                        }
                    }
                    if (assertion.expect_json && response.ok()) {
                        try {
                            const responseJson = await response.json();
                            flowIssues.push(...assertJsonSubset(responseJson, assertion.expect_json, "", {
                                step: "checkpoint_flow_check",
                                flow: flowName,
                                url: firstString(assertion.url, assertion.path),
                            }).map(issue => ({
                                ...issue,
                                code: issue.code || "api_json_failed",
                            })));
                        }
                        catch (error) {
                            flowIssues.push(createFlowIssue(flowName, `API assertion for ${assertion.url || assertion.path} could not parse JSON: ${error.message}`, {
                                code: "api_json_failed",
                                url: firstString(assertion.url, assertion.path),
                            }));
                        }
                    }
                }
                const assertCommand = firstString(flowConfig.assert_command);
                if (assertCommand) {
                    const result = spawnSync(assertCommand, {
                        cwd: projectPath,
                        env: {
                            ...process.env,
                            OSPEC_CHECKPOINT_BASE_URL: firstString(checkpointConfig?.runtime?.base_url),
                            OSPEC_CHECKPOINT_FLOW_NAME: flowName,
                        },
                        encoding: "utf-8",
                        shell: true,
                        timeout: 300000,
                    });
                    if (result.error) {
                        flowIssues.push(createFlowIssue(flowName, `assert_command failed to start: ${result.error.message}`, { code: "assert_command_failed" }));
                    }
                    else if (result.status !== 0) {
                        flowIssues.push(createFlowIssue(flowName, `assert_command exited with status ${result.status}: ${String(result.stderr || result.stdout || "").trim()}`, {
                            code: "assert_command_failed",
                            actual: result.status,
                            details: String(result.stderr || result.stdout || "").trim(),
                        }));
                    }
                }
            }
            catch (error) {
                flowIssues.push(createFlowIssue(flowName, `Flow ${flowName} failed: ${error.message}`, { code: "flow_failed" }));
            }
            issues.push(...flowIssues);
            artifacts.push(...flowArtifacts);
            flows.push({
                name: flowName,
                status: flowIssues.length === 0 ? "passed" : "failed",
                issues: flowIssues,
                artifacts: flowArtifacts,
            });
            await page.close();
        }
    }
    finally {
        await browserContext.tracing.stop({ path: tracePath }).catch(() => undefined);
        if (await pathExists(tracePath)) {
            artifacts.push({
                path: tracePath,
                label: "flow check trace",
                type: "trace",
            });
        }
        await requestContext.dispose().catch(() => undefined);
        await browserContext.close();
        await browser.close();
    }
    return {
        status: issues.length === 0 ? "passed" : "failed",
        issues,
        flows,
        artifacts,
    };
}
function formatIssueScope(issue) {
    const parts = [];
    if (issue.route) {
        parts.push(`route:${issue.route}`);
    }
    if (issue.viewport) {
        parts.push(`viewport:${issue.viewport}`);
    }
    if (issue.flow) {
        parts.push(`flow:${issue.flow}`);
    }
    if (issue.selector) {
        parts.push(`selector:${issue.selector}`);
    }
    return parts.join(", ");
}
function formatIssueLabel(issue) {
    const category = firstString(issue?.category, "runtime");
    const severity = firstString(issue?.severity, "error");
    return `[${category}/${severity}]`;
}
function summarizeIssues(issues) {
    const entries = Array.isArray(issues) ? issues : [];
    const byCategory = {};
    const bySeverity = {};
    for (const issue of entries) {
        const category = firstString(issue?.category, "runtime");
        const severity = firstString(issue?.severity, "error");
        byCategory[category] = (byCategory[category] || 0) + 1;
        bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    }
    return {
        total: entries.length,
        byCategory,
        bySeverity,
    };
}
function buildSummary(result) {
    const overallIssueSummary = summarizeIssues(result.issues || []);
    const lines = [
        "# Checkpoint Summary",
        "",
        `- Status: ${result.status}`,
        `- Executed at: ${result.executed_at}`,
        `- Total issues: ${overallIssueSummary.total}`,
        "",
    ];
    if (overallIssueSummary.total > 0) {
        lines.push("## Issue Overview");
        lines.push("");
        lines.push("- By category:");
        Object.entries(overallIssueSummary.byCategory)
            .sort((left, right) => left[0].localeCompare(right[0]))
            .forEach(([category, count]) => {
            lines.push(`  - ${category}: ${count}`);
        });
        lines.push("- By severity:");
        Object.entries(overallIssueSummary.bySeverity)
            .sort((left, right) => left[0].localeCompare(right[0]))
            .forEach(([severity, count]) => {
            lines.push(`  - ${severity}: ${count}`);
        });
        lines.push("");
    }
    for (const [stepName, stepResult] of Object.entries(result.steps || {})) {
        const stepIssueSummary = summarizeIssues(stepResult.issues || []);
        lines.push(`## ${stepName}`);
        lines.push("");
        lines.push(`- Status: ${stepResult.status}`);
        lines.push(`- Issue count: ${stepIssueSummary.total}`);
        if (Array.isArray(stepResult.routes) && stepResult.routes.length > 0) {
            lines.push(`- Routes: ${stepResult.routes.length}`);
            lines.push("- Route results:");
            stepResult.routes.forEach(route => {
                lines.push(`  - ${route.name} [${route.viewport || "default"}]: ${route.status}`);
            });
        }
        if (Array.isArray(stepResult.flows) && stepResult.flows.length > 0) {
            lines.push(`- Flows: ${stepResult.flows.length}`);
            lines.push("- Flow results:");
            stepResult.flows.forEach(flow => {
                lines.push(`  - ${flow.name}: ${flow.status}`);
            });
        }
        if (Array.isArray(stepResult.issues) && stepResult.issues.length > 0) {
            lines.push("- Categories:");
            Object.entries(stepIssueSummary.byCategory)
                .sort((left, right) => left[0].localeCompare(right[0]))
                .forEach(([category, count]) => {
                lines.push(`  - ${category}: ${count}`);
            });
            lines.push("- Issues:");
            stepResult.issues.forEach(issue => {
                const scope = formatIssueScope(issue);
                lines.push(`  - ${formatIssueLabel(issue)}${scope ? ` ${scope}` : ""} ${issue.message}`);
            });
        }
        else {
            lines.push("- Issues: none");
        }
        lines.push("");
    }
    return lines.join("\n");
}
async function main() {
    const { changePath, projectPath } = parseArgs(process.argv);
    debugLog("main:start", changePath, projectPath);
    const executedAt = new Date().toISOString();
    const artifactPaths = {
        checkpointDir: path.join(changePath, "artifacts", "checkpoint"),
        screenshotsDir: process.env.OSPEC_CHECKPOINT_SCREENSHOTS_DIR || path.join(changePath, "artifacts", "checkpoint", "screenshots"),
        diffsDir: process.env.OSPEC_CHECKPOINT_DIFFS_DIR || path.join(changePath, "artifacts", "checkpoint", "diffs"),
        tracesDir: process.env.OSPEC_CHECKPOINT_TRACES_DIR || path.join(changePath, "artifacts", "checkpoint", "traces"),
    };
    await ensureDir(artifactPaths.checkpointDir);
    await ensureDir(artifactPaths.screenshotsDir);
    await ensureDir(artifactPaths.diffsDir);
    await ensureDir(artifactPaths.tracesDir);
    const config = await loadJson(path.join(projectPath, ".skillrc"));
    const checkpointConfig = config?.plugins?.checkpoint || {};
    const verification = (0, helpers_1.parseFrontmatterDocument)(await fsp.readFile(path.join(changePath, "verification.md"), "utf8"));
    const optionalSteps = Array.isArray(verification.data.optional_steps) ? verification.data.optional_steps : [];
    const activeSteps = optionalSteps.filter(step => step === "checkpoint_ui_review" || step === "checkpoint_flow_check");
    const result = {
        ok: false,
        status: "pending",
        executed_at: executedAt,
        issues: [],
        steps: {},
        metadata: {
            base_url: firstString(checkpointConfig?.runtime?.base_url),
            change_path: changePath,
            project_path: projectPath,
        },
        artifacts: [],
    };
    if (activeSteps.length === 0) {
        result.status = "failed";
        result.issues.push(createRuntimeIssue("No checkpoint steps are active for this change.", {
            code: "checkpoint_steps_missing",
            category: "config",
        }));
        result.summary_markdown = buildSummary(result);
        console.log(JSON.stringify(result));
        return;
    }
    const storageStatePath = resolveMaybePath(firstString(checkpointConfig?.runtime?.storage_state), projectPath, projectPath);
    const runtimeContext = {
        change_path: changePath,
        project_path: projectPath,
        ospec_package_path: path.resolve(__dirname, "..", ".."),
        base_url: firstString(checkpointConfig?.runtime?.base_url),
        storage_state_path: storageStatePath,
    };
    const startupLogPath = path.join(artifactPaths.tracesDir, "startup.log");
    const authLogPath = path.join(artifactPaths.tracesDir, "auth.log");
    debugLog("main:startup_begin");
    const startupState = await startRuntime(checkpointConfig?.runtime?.startup || {}, runtimeContext, startupLogPath).catch(error => ({
        started: false,
        child: null,
        logPath: "",
        error,
    }));
    try {
        if (startupState?.error) {
            throw startupState.error;
        }
        if (startupState?.logPath) {
            result.artifacts.push({
                path: startupState.logPath,
                label: "startup log",
                type: "log",
            });
        }
        debugLog("main:readiness_begin", firstString(checkpointConfig?.runtime?.readiness?.url, checkpointConfig?.runtime?.base_url));
        const readiness = await waitForReadiness(checkpointConfig?.runtime?.readiness || {}, firstString(checkpointConfig?.runtime?.base_url), startupState);
        debugLog("main:readiness_done", readiness.ok ? "ok" : "failed");
        if (!readiness.ok) {
            result.status = "failed";
            result.issues.push(createRuntimeIssue(readiness.message, { code: "readiness_failed" }));
            result.summary_markdown = buildSummary(result);
            console.log(JSON.stringify(result));
            return;
        }
        const authCommand = firstString(checkpointConfig?.runtime?.auth?.command);
        if (authCommand && !storageStatePath) {
            result.status = "failed";
            result.issues.push(createRuntimeIssue("runtime.auth is configured but runtime.storage_state is empty.", { code: "auth_storage_state_unconfigured" }));
            result.summary_markdown = buildSummary(result);
            console.log(JSON.stringify(result));
            return;
        }
        debugLog("main:auth_begin");
        const authState = await runAuthCommand(checkpointConfig?.runtime?.auth || {}, runtimeContext, storageStatePath, authLogPath).catch(error => ({
            ran: false,
            logPath: authLogPath,
            error,
        }));
        if (authState?.logPath) {
            result.artifacts.push({
                path: authState.logPath,
                label: "auth log",
                type: "log",
            });
        }
        if (authState?.error) {
            result.status = "failed";
            result.issues.push(createRuntimeIssue(authState.error.message || String(authState.error), { code: "auth_failed" }));
            result.summary_markdown = buildSummary(result);
            console.log(JSON.stringify(result));
            return;
        }
        if (authState?.ran) {
            debugLog("main:auth_done", "ran");
        }
        else {
            debugLog("main:auth_done", "skipped");
        }
        if (authState?.ran && storageStatePath && !(await pathExists(storageStatePath))) {
            result.status = "failed";
            result.issues.push(createRuntimeIssue(`Auth command completed but did not create the configured storage state file: ${storageStatePath}`, {
                code: "auth_storage_state_missing",
                path: storageStatePath,
            }));
            result.summary_markdown = buildSummary(result);
            console.log(JSON.stringify(result));
            return;
        }
        const playwright = resolveModule(projectPath, "playwright");
        if (!playwright) {
            result.status = "failed";
            result.issues.push(createRuntimeIssue("Playwright is not installed in the target project. Re-run \"ospec plugins enable checkpoint <project-path> --base-url <url>\" to auto-install checkpoint dependencies, or install \"playwright\", \"pixelmatch\", and \"pngjs\" in the project.", { code: "playwright_missing" }));
            result.summary_markdown = buildSummary(result);
            console.log(JSON.stringify(result));
            return;
        }
        const pixelmatchModule = resolveModule(projectPath, "pixelmatch");
        const pngjsModule = resolveModule(projectPath, "pngjs");
        const modules = {
            pixelmatch: pixelmatchModule ? (pixelmatchModule.default || pixelmatchModule) : null,
            PNG: pngjsModule?.PNG || null,
        };
        if (activeSteps.includes("checkpoint_ui_review")) {
            debugLog("main:run_ui_review");
            const uiReview = await runUiReview(playwright, modules, projectPath, checkpointConfig, artifactPaths, storageStatePath);
            result.steps.checkpoint_ui_review = uiReview;
            result.issues.push(...uiReview.issues);
            result.artifacts.push(...uiReview.artifacts);
            debugLog("main:ui_review_done", uiReview.status);
        }
        if (activeSteps.includes("checkpoint_flow_check")) {
            const flowCheck = await runFlowCheck(playwright, projectPath, checkpointConfig, artifactPaths, storageStatePath);
            result.steps.checkpoint_flow_check = flowCheck;
            result.issues.push(...flowCheck.issues);
            result.artifacts.push(...flowCheck.artifacts);
        }
        const hasFailedStep = activeSteps.some(step => normalizeStatus(result.steps?.[step]?.status, "failed") === "failed");
        result.status = hasFailedStep ? "failed" : "passed";
        result.ok = result.status === "passed";
        result.summary_markdown = buildSummary(result);
        debugLog("main:complete", result.status);
        console.log(JSON.stringify(result));
    }
    catch (error) {
        debugLog("main:error", error.message || String(error));
        result.status = "failed";
        result.ok = false;
        result.issues.push(createRuntimeIssue(error.message || String(error), { code: "checkpoint_runtime_failed" }));
        result.summary_markdown = buildSummary(result);
        console.log(JSON.stringify(result));
    }
    finally {
        await stopRuntime(checkpointConfig?.runtime?.shutdown || {}, startupState || {}, runtimeContext).catch(() => undefined);
    }
}
main().catch(error => {
    const fallback = {
        ok: false,
        status: "failed",
        executed_at: new Date().toISOString(),
        issues: [createRuntimeIssue(error.message || String(error), { code: "checkpoint_runtime_failed" })],
        steps: {},
        summary_markdown: `# Checkpoint Summary\n\n- Status: failed\n- Error: ${error.message || String(error)}\n`,
    };
    console.log(JSON.stringify(fallback));
});
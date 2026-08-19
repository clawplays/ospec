"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDocsObligationPort = registerDocsObligationPort;
exports.resetDocsObligationPort = resetDocsObligationPort;
exports.getDocsObligationPort = getDocsObligationPort;
exports.readDocsObligations = readDocsObligations;
exports.evaluateArchiveDocsObligations = evaluateArchiveDocsObligations;
exports.describeUnsatisfied = describeUnsatisfied;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const constants_1 = require("../core/constants");
let registeredPort = null;
let resolutionAttempted = false;
let resolvedPort = null;
function registerDocsObligationPort(port) {
    registeredPort = port;
    resolutionAttempted = false;
    resolvedPort = null;
}
function resetDocsObligationPort() {
    registerDocsObligationPort(null);
}
/**
 * Wrap B's class in this port's function shape.
 *
 * `projectRoot` matters: B hashes each obligation's target relative to it, so
 * passing the change directory instead would resolve `docs/features/auth.md`
 * inside the change and every obligation would evaluate against a file that is
 * not there. It is carried on the options bag the caller already passes.
 */
function adaptServiceModule(module) {
    return {
        async evaluateDocsObligations(changeDir, options) {
            const projectRoot = typeof options?.projectRoot === 'string'
                ? options.projectRoot
                : path.resolve(changeDir, '..', '..', '..');
            const obligations = await readDocsObligations(changeDir);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { fileService } = require('./FileService');
            const service = module.createDocsObligationService(fileService);
            const verdicts = await service.evaluate({ obligations, projectRoot });
            return {
                verdicts: verdicts.map(verdict => ({
                    id: verdict.id,
                    status: verdict.status,
                    // B's per-verdict message is the actionable half ("unchanged since
                    // the obligation was recorded, and no explicit confirmation was
                    // given"). Dropping it would leave the gate printing the
                    // obligation's generic reason instead.
                    detail: verdict.message,
                })),
            };
        },
    };
}
function getDocsObligationPort() {
    if (registeredPort)
        return registeredPort;
    if (!resolutionAttempted) {
        resolutionAttempted = true;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const candidate = require('./DocsObligationService');
            if (typeof candidate?.evaluateDocsObligations === 'function') {
                resolvedPort = candidate;
            }
            else if (typeof candidate?.createDocsObligationService === 'function') {
                resolvedPort = adaptServiceModule(candidate);
            }
            else {
                resolvedPort = null;
            }
        }
        catch {
            resolvedPort = null;
        }
    }
    return resolvedPort;
}
/**
 * The obligations recorded for a change, read from the ONE location B writes:
 * `state.json.docs_obligations`. Never from the task graph or the checklist.
 */
async function readDocsObligations(changeDir) {
    try {
        const raw = await fs_1.promises.readFile(path.join(changeDir, constants_1.FILE_NAMES.STATE), 'utf8');
        const state = JSON.parse(raw.replace(/^﻿/, ''));
        const obligations = state?.docs_obligations;
        if (!Array.isArray(obligations))
            return [];
        return obligations.filter(item => item && typeof item === 'object' && typeof item.id === 'string');
    }
    catch {
        return [];
    }
}
/**
 * A satisfied status, by B's vocabulary. Anything not recognised as satisfied
 * is treated as UNSATISFIED, which is the safe direction for a gate: an
 * unknown status must not read as a pass.
 */
function isSatisfied(status) {
    return ['satisfied', 'verified', 'verified_unchanged', 'done', 'complete'].includes(String(status || '').trim().toLowerCase());
}
/**
 * Verify the archive gate's documentation obligations.
 *
 * Returns the verdicts; the caller decides what to do with them. Never throws
 * and never recomputes satisfaction -- both are B's rules, and the second is
 * the one that keeps warn and strict reading the same field.
 */
async function evaluateArchiveDocsObligations(changeDir, mode = 'warn', projectRoot) {
    const obligations = await readDocsObligations(changeDir);
    const empty = {
        available: false,
        mode,
        obligations,
        verdicts: [],
        blocking: [],
        advisory: [],
        warnings: [],
    };
    if (obligations.length === 0)
        return empty;
    const port = getDocsObligationPort();
    if (!port) {
        // Obligations exist but nothing can evaluate them. Say so rather than
        // reporting a pass: a gate that cannot run must not look like a gate that
        // ran and was happy.
        return {
            ...empty,
            warnings: [
                `${obligations.length} documentation obligation(s) are recorded but the obligation engine is not available; they were not evaluated.`,
            ],
        };
    }
    try {
        const outcome = await port.evaluateDocsObligations(changeDir, { mode, projectRoot });
        // B may return the verdict array directly or wrap it. Both are read
        // without casting, because the wrapped form is a declared union member and
        // `mode` is optional on it.
        const wrapped = Array.isArray(outcome) ? null : outcome;
        const verdicts = Array.isArray(outcome)
            ? outcome
            : Array.isArray(wrapped?.verdicts)
                ? wrapped.verdicts
                : [];
        const reportedMode = wrapped?.mode === 'strict' || wrapped?.mode === 'warn'
            ? wrapped.mode
            : mode;
        const byId = new Map(obligations.map(item => [item.id, item]));
        const unsatisfied = verdicts.filter(verdict => !isSatisfied(verdict.status));
        return {
            available: true,
            mode: reportedMode,
            obligations,
            verdicts,
            blocking: unsatisfied.filter(v => byId.get(v.id)?.level === 'required'),
            advisory: unsatisfied.filter(v => byId.get(v.id)?.level !== 'required'),
            warnings: [],
        };
    }
    catch (error) {
        return {
            ...empty,
            warnings: [`documentation obligation evaluation failed: ${error?.message || error}`],
        };
    }
}
/**
 * One line per unsatisfied obligation, for the archive gate to print.
 *
 * Cites the obligation `id` -- B's stable key -- and the `path`/`section`
 * fields rather than splitting `target`, because a heading may contain '#'.
 */
function describeUnsatisfied(evaluation, verdicts) {
    const byId = new Map(evaluation.obligations.map(item => [item.id, item]));
    return verdicts.map(verdict => {
        const obligation = byId.get(verdict.id);
        if (!obligation)
            return `${verdict.id}: ${verdict.status}${verdict.detail ? ` -- ${verdict.detail}` : ''}`;
        const where = obligation.section
            ? `${obligation.path} (section "${obligation.section}")`
            : obligation.path;
        return `${obligation.id} [${obligation.level}] ${where}: ${verdict.detail || obligation.reason}`;
    });
}

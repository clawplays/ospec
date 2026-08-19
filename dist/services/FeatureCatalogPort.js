"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_CATALOG_RELATIVE_PATH = void 0;
exports.registerFeatureCatalogPort = registerFeatureCatalogPort;
exports.resetFeatureCatalogPort = resetFeatureCatalogPort;
exports.getFeatureCatalogPort = getFeatureCatalogPort;
exports.updateCatalogRows = updateCatalogRows;
exports.readCatalogRows = readCatalogRows;
const fs_1 = require("fs");
const FeatureCatalog_1 = require("./FeatureCatalog");
Object.defineProperty(exports, "FEATURE_CATALOG_RELATIVE_PATH", { enumerable: true, get: function () { return FeatureCatalog_1.FEATURE_CATALOG_RELATIVE_PATH; } });
function unavailable(warnings = []) {
    return {
        available: false,
        path: null,
        written: false,
        rows: 0,
        updated: [],
        missing: [],
        warnings,
    };
}
let registeredPort = null;
let resolutionAttempted = false;
let resolvedPort = null;
/** Tests and track A may install the module explicitly. */
function registerFeatureCatalogPort(port) {
    registeredPort = port;
    resolutionAttempted = false;
    resolvedPort = null;
}
function resetFeatureCatalogPort() {
    registerFeatureCatalogPort(null);
}
/**
 * Track A's module, or null before the merge.
 *
 * The require is wrapped because `./FeatureCatalog` genuinely does not exist on
 * this branch; a missing module here is the expected state, not a failure to
 * report. Resolution is attempted once and cached either way, so a project with
 * no catalogue does not pay a failed require per archive.
 */
function getFeatureCatalogPort() {
    if (registeredPort)
        return registeredPort;
    if (!resolutionAttempted) {
        resolutionAttempted = true;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const candidate = require('./FeatureCatalog');
            resolvedPort = typeof candidate?.updateFeatureCatalogRows === 'function'
                ? candidate
                : null;
        }
        catch {
            resolvedPort = null;
        }
    }
    return resolvedPort;
}
/**
 * Update the catalogue rows for `slugs` to point at `archiveName`.
 *
 * Never throws. A catalogue that could not be updated is a warning, not a
 * reason to refuse to archive finished work -- and A's primitive holds the same
 * rule on its side, so this is belt and braces rather than the only guard.
 */
async function updateCatalogRows(projectRoot, request) {
    const slugs = Array.from(new Set((request.slugs || []).map(slug => String(slug || '').trim()).filter(Boolean)));
    if (slugs.length === 0)
        return unavailable();
    const port = getFeatureCatalogPort();
    if (!port) {
        // No catalogue module. Correct for every project until 7.4 merges, and the
        // reason archiving must not require a catalogue row to exist.
        return unavailable();
    }
    try {
        const outcome = await port.updateFeatureCatalogRows(projectRoot, {
            slugs,
            archiveName: request.archiveName,
        });
        return {
            available: true,
            path: outcome.path ?? null,
            written: outcome.written === true,
            rows: Number(outcome.rows || 0),
            updated: Array.isArray(outcome.updated) ? outcome.updated : [],
            missing: Array.isArray(outcome.missing) ? outcome.missing : [],
            warnings: Array.isArray(outcome.warnings) ? outcome.warnings : [],
        };
    }
    catch (error) {
        return unavailable([`feature catalogue update failed: ${error?.message || error}`]);
    }
}
/**
 * The slugs the catalogue currently has a row for, or null when there is no
 * catalogue file. Used by the archive assertion, which must only require a row
 * when a catalogue actually exists.
 *
 * Reads the rendered rows rather than asking A for structure, because the only
 * question here is "does this slug have a row", and A's row format already
 * pins the slug in a code span as its first cell.
 *
 * Takes the ABSOLUTE catalogue path, not the project root. Before the merge
 * this joined `projectRoot` with the relative path directly, which is wrong for
 * a project on the managed `.ospec/` layout: A generates the catalogue at
 * `resolveManagedPath(root, FEATURE_CATALOG_RELATIVE_PATH, config)`, so a
 * root-relative join would read nothing, return null, and silently skip the
 * assertion for exactly the projects that have one. The caller already holds
 * the resolved config, so it resolves the path and there is one rule.
 */
async function readCatalogRows(catalogPath) {
    const absolute = catalogPath;
    let content;
    try {
        content = await fs_1.promises.readFile(absolute, 'utf8');
    }
    catch {
        return null;
    }
    const rows = new Map();
    for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\|\s*`([^`]+)`\s*\|/);
        if (match)
            rows.set(match[1], line);
    }
    return rows;
}

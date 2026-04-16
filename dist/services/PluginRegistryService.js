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
exports.PluginRegistryService = void 0;
exports.createPluginRegistryService = createPluginRegistryService;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const https = __importStar(require("https"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const OFFICIAL_PLUGIN_REGISTRY_URL = 'https://raw.githubusercontent.com/clawplays/ospec/main/plugins/registry.json';
function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function uniqueStrings(values, fallback = []) {
    if (!Array.isArray(values)) {
        return [...fallback];
    }
    return Array.from(new Set(values
        .map((entry) => normalizeString(entry))
        .filter(Boolean)));
}
function normalizeHookCommand(value) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const command = normalizeString(value.command);
    if (!command) {
        return undefined;
    }
    return {
        command,
        args: Array.isArray(value.args)
            ? value.args.map((entry) => String(entry))
            : [],
        cwd: normalizeString(value.cwd),
        timeout_ms: Number.isFinite(value.timeout_ms) && Number(value.timeout_ms) > 0
            ? Math.floor(Number(value.timeout_ms))
            : 300000,
        manages_own_artifacts: value.manages_own_artifacts === true,
        passthrough_stdio: value.passthrough_stdio === true,
    };
}
class PluginRegistryService {
    constructor(fileService) {
        this.fileService = fileService;
    }
    getBundledRegistryPath() {
        return path.resolve(__dirname, '..', '..', 'assets', 'plugins', 'registry.json');
    }
    getPluginsHome() {
        return path.join(os.homedir(), '.ospec', 'plugins');
    }
    getInstalledStatePath() {
        return path.join(this.getPluginsHome(), 'installed.json');
    }
    getKnowledgeCacheDir(pluginId) {
        return path.join(this.getPluginsHome(), 'knowledge', pluginId);
    }
    async getAvailablePlugins() {
        const officialEntries = await this.getOfficialRegistryEntries();
        const installedEntries = await this.getInstalledRegistryEntries();
        const merged = new Map();
        for (const entry of [...officialEntries, ...installedEntries]) {
            const existing = merged.get(entry.id);
            merged.set(entry.id, {
                ...existing,
                ...entry,
                official: entry.official === true || existing?.official === true,
                kinds: uniqueStrings([...(existing?.kinds || []), ...(entry.kinds || [])]),
            });
        }
        return Array.from(merged.values()).sort((left, right) => left.id.localeCompare(right.id));
    }
    async getPluginInfo(identifier) {
        const resolved = await this.resolvePluginReference(identifier);
        const installed = await this.getInstalledPluginRecord(resolved.id);
        const manifest = installed?.manifest || null;
        const npmMetadata = await this.readNpmPackageMetadata(resolved.packageName);
        return {
            id: resolved.id,
            packageName: resolved.packageName,
            displayName: npmMetadata.ospecPlugin?.displayName ||
                manifest?.displayName ||
                resolved.displayName,
            description: npmMetadata.description ||
                npmMetadata.ospecPlugin?.description ||
                manifest?.description ||
                resolved.description,
            official: resolved.official || installed?.official === true,
            kinds: npmMetadata.ospecPlugin?.kinds ||
                manifest?.kinds ||
                resolved.kinds,
            distTags: npmMetadata.distTags,
            latestVersion: npmMetadata.latestVersion || installed?.version || '',
            installed: installed || null,
            manifest: npmMetadata.ospecPlugin || manifest || null,
            installRange: npmMetadata.ospecPlugin?.installRange ||
                manifest?.installRange ||
                resolved.installRange ||
                '',
        };
    }
    async installPlugin(identifier) {
        const resolved = await this.resolvePluginReference(identifier);
        if (resolved.official) {
            return this.installOfficialPlugin(resolved.id, 'manual');
        }
        return this.installPackage(resolved.packageName, {
            pluginId: resolved.id,
            reason: 'manual',
            packageName: this.resolvePackageNameFromSpecifier(resolved.packageName),
        });
    }
    async inspectInstalledPluginUpgrade(pluginId) {
        const installed = await this.getInstalledPluginRecord(pluginId);
        if (!installed) {
            return {
                pluginId,
                packageName: '',
                installedVersion: '',
                targetVersion: '',
                official: false,
                status: 'missing',
                reason: 'plugin is not installed globally',
            };
        }
        const packageName = normalizeString(installed.package_name);
        const installedVersion = normalizeString(installed.version);
        const official = installed.official === true;
        if (!packageName) {
            return {
                pluginId,
                packageName,
                installedVersion,
                targetVersion: '',
                official,
                status: 'skip',
                reason: 'installed plugin record is missing package_name',
            };
        }
        if (!semver.valid(installedVersion)) {
            return {
                pluginId,
                packageName,
                installedVersion,
                targetVersion: '',
                official,
                status: 'skip',
                reason: `installed version is not valid semver: ${installedVersion || '(unknown)'}`,
            };
        }
        if (official) {
            try {
                const targetVersion = await this.resolveCompatibleOfficialVersion(pluginId);
                if (!semver.valid(targetVersion)) {
                    return {
                        pluginId,
                        packageName,
                        installedVersion,
                        targetVersion,
                        official,
                        status: 'skip',
                        reason: `compatible target version is not valid semver: ${targetVersion || '(unknown)'}`,
                    };
                }
                if (semver.gt(targetVersion, installedVersion)) {
                    return {
                        pluginId,
                        packageName,
                        installedVersion,
                        targetVersion,
                        official,
                        status: 'upgrade',
                        reason: '',
                    };
                }
                return {
                    pluginId,
                    packageName,
                    installedVersion,
                    targetVersion,
                    official,
                    status: 'current',
                    reason: semver.eq(targetVersion, installedVersion)
                        ? 'already on the latest compatible official version'
                        : `installed version ${installedVersion} is newer than the compatible target ${targetVersion}`,
                };
            }
            catch (error) {
                return {
                    pluginId,
                    packageName,
                    installedVersion,
                    targetVersion: '',
                    official,
                    status: 'skip',
                    reason: error instanceof Error ? error.message : String(error || 'unknown error'),
                };
            }
        }
        const npmMetadata = await this.readNpmPackageMetadata(packageName);
        const latestVersion = normalizeString(npmMetadata.latestVersion);
        if (!semver.valid(latestVersion)) {
            return {
                pluginId,
                packageName,
                installedVersion,
                targetVersion: '',
                official,
                status: 'skip',
                reason: `latest npm version is unavailable for ${packageName}`,
            };
        }
        const manifest = npmMetadata.ospecPlugin || installed.manifest || null;
        if (!manifest) {
            return {
                pluginId,
                packageName,
                installedVersion,
                targetVersion: '',
                official,
                status: 'skip',
                reason: `latest npm metadata for ${packageName} is missing ospecPlugin manifest data`,
            };
        }
        const cliVersion = this.getCurrentCliVersion();
        const compatibilityRange = normalizeString(manifest.compatibility?.ospec) || '*';
        if (cliVersion &&
            compatibilityRange &&
            !semver.satisfies(cliVersion, compatibilityRange, {
                includePrerelease: true,
            })) {
            return {
                pluginId,
                packageName,
                installedVersion,
                targetVersion: latestVersion,
                official,
                status: 'skip',
                reason: `latest version ${latestVersion} requires ospec ${compatibilityRange}`,
            };
        }
        if (semver.gt(latestVersion, installedVersion)) {
            return {
                pluginId,
                packageName,
                installedVersion,
                targetVersion: latestVersion,
                official,
                status: 'upgrade',
                reason: '',
            };
        }
        return {
            pluginId,
            packageName,
            installedVersion,
            targetVersion: latestVersion,
            official,
            status: 'current',
            reason: semver.eq(latestVersion, installedVersion)
                ? 'already on the latest npm version'
                : `installed version ${installedVersion} is newer than npm latest ${latestVersion}`,
        };
    }
    async upgradeInstalledPlugin(pluginId, reason = 'update') {
        const inspection = await this.inspectInstalledPluginUpgrade(pluginId);
        if (inspection.status !== 'upgrade') {
            throw new Error(inspection.reason ||
                `Plugin ${pluginId} does not have an available upgrade.`);
        }
        const current = inspection.official
            ? await this.installOfficialPlugin(pluginId, reason)
            : await this.installPackage(`${inspection.packageName}@${inspection.targetVersion}`, {
                pluginId,
                reason,
                resolvedVersion: inspection.targetVersion,
                packageName: inspection.packageName,
            });
        return {
            pluginId,
            packageName: inspection.packageName,
            previousVersion: inspection.installedVersion,
            current,
            official: inspection.official,
        };
    }
    async reinstallPluginPackage(pluginId, packageSpecifier, options = {}) {
        return this.installPackage(packageSpecifier, {
            pluginId,
            reason: options.reason || 'manual',
            resolvedVersion: options.resolvedVersion,
            packageName: options.packageName,
        });
    }
    async resolveCompatibleOfficialVersion(pluginId) {
        const resolved = await this.resolvePluginReference(pluginId);
        if (!resolved.official) {
            throw new Error(`Plugin ${pluginId} is not an official plugin.`);
        }
        const versionsJson = this.tryRunNpmJson(['view', resolved.packageName, 'versions', '--json']);
        const versions = Array.isArray(versionsJson)
            ? versionsJson.map((value) => normalizeString(value)).filter(Boolean)
            : normalizeString(versionsJson)
                ? [normalizeString(versionsJson)]
                : [];
        const compatibleVersions = versions.filter((version) => semver.valid(version) &&
            (resolved.installRange
                ? semver.satisfies(version, resolved.installRange)
                : true));
        const selected = semver.rsort(compatibleVersions)[0] || '';
        if (!selected) {
            throw new Error(`No compatible npm version found for ${resolved.packageName} with range ${resolved.installRange || '(any)'}.`);
        }
        return selected;
    }
    async installOfficialPlugin(pluginId, reason) {
        const resolved = await this.resolvePluginReference(pluginId);
        if (!resolved.official) {
            throw new Error(`Plugin ${pluginId} is not an official plugin.`);
        }
        const version = await this.resolveCompatibleOfficialVersion(pluginId);
        return this.installPackage(`${resolved.packageName}@${version}`, {
            pluginId: resolved.id,
            reason,
            resolvedVersion: version,
        });
    }
    async installPackage(packageSpecifier, options) {
        this.runNpm(['install', '-g', packageSpecifier]);
        const packageName = options.packageName || this.extractPublishedPackageName(packageSpecifier);
        const packagePath = await this.resolveInstalledPackagePath(packageName);
        const manifest = await this.readPluginManifestFromPackage(packagePath);
        await this.cacheKnowledgeBundle(manifest, packagePath);
        const state = await this.readInstalledState();
        const nextRecord = {
            id: options.pluginId || manifest.id,
            package_name: packageName,
            version: await this.readInstalledPackageVersion(packagePath),
            resolved_version: options.resolvedVersion || '',
            display_name: manifest.displayName,
            description: manifest.description,
            official: manifest.official === true,
            kinds: [...manifest.kinds],
            installed_at: new Date().toISOString(),
            installed_by: options.reason,
            manifest,
        };
        state.plugins[manifest.id] = nextRecord;
        await this.writeInstalledState(state);
        return nextRecord;
    }
    resolvePackageNameFromSpecifier(packageSpecifier) {
        const normalizedSpecifier = normalizeString(packageSpecifier);
        if (!normalizedSpecifier) {
            return '';
        }
        if (normalizedSpecifier.startsWith('.') ||
            normalizedSpecifier.startsWith('/') ||
            /^[A-Za-z]:[\\/]/.test(normalizedSpecifier)) {
            const resolvedPath = path.resolve(process.cwd(), normalizedSpecifier);
            if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
                const packageJsonPath = path.join(resolvedPath, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    try {
                        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                        return normalizeString(packageJson.name);
                    }
                    catch {
                        return '';
                    }
                }
            }
        }
        return '';
    }
    extractPublishedPackageName(packageSpecifier) {
        const normalizedSpecifier = normalizeString(packageSpecifier);
        if (!normalizedSpecifier) {
            return normalizedSpecifier;
        }
        if (normalizedSpecifier.split('@').length > 2) {
            return normalizedSpecifier.replace(/@[^@]+$/, '');
        }
        if (normalizedSpecifier.includes('@') && !normalizedSpecifier.startsWith('@')) {
            return normalizedSpecifier.replace(/@[^@]+$/, '');
        }
        return normalizedSpecifier;
    }
    async getInstalledPlugins() {
        const state = await this.readInstalledState();
        return Object.values(state.plugins).sort((left, right) => left.id.localeCompare(right.id));
    }
    async getInstalledPluginRecord(pluginId) {
        const state = await this.readInstalledState();
        const recordedPlugin = state.plugins[pluginId] || null;
        if (recordedPlugin) {
            const recordedPackageName = normalizeString(recordedPlugin.package_name);
            if (recordedPackageName) {
                const packagePath = await this.tryResolveInstalledPackagePath(recordedPackageName);
                if (packagePath) {
                    return recordedPlugin;
                }
            }
        }
        return this.findGlobalInstalledPluginRecord(pluginId);
    }
    async getInstalledPluginManifest(pluginId) {
        const record = await this.getInstalledPluginRecord(pluginId);
        if (!record) {
            return null;
        }
        const packagePath = await this.resolveInstalledPackagePath(record.package_name);
        const manifest = await this.readPluginManifestFromPackage(packagePath);
        return {
            record,
            packagePath,
            manifest,
        };
    }
    async findGlobalInstalledPluginRecord(pluginId) {
        const resolved = await this.resolvePluginReference(pluginId).catch(() => null);
        if (!resolved?.packageName) {
            return null;
        }
        const packagePath = await this.tryResolveInstalledPackagePath(resolved.packageName);
        if (!packagePath) {
            return null;
        }
        const manifest = await this.readPluginManifestFromPackage(packagePath).catch(() => null);
        if (!manifest) {
            return null;
        }
        if (manifest.id !== pluginId) {
            return null;
        }
        return {
            id: manifest.id,
            package_name: resolved.packageName,
            version: await this.readInstalledPackageVersion(packagePath),
            resolved_version: '',
            display_name: manifest.displayName,
            description: manifest.description,
            official: manifest.official === true,
            kinds: [...manifest.kinds],
            installed_at: '',
            installed_by: 'manual',
            manifest,
        };
    }
    async syncProjectPluginAssets(pluginId, projectPath, workspaceRoot) {
        const installed = await this.getInstalledPluginManifest(pluginId);
        if (!installed) {
            return [];
        }
        const createdPaths = [];
        await this.fileService.ensureDir(path.join(projectPath, workspaceRoot));
        await this.fileService.ensureDir(path.join(projectPath, workspaceRoot, 'docs'));
        for (const [locale, relativeSourcePath] of Object.entries(installed.manifest.docs.locales || {})) {
            const normalizedSourcePath = normalizeString(relativeSourcePath);
            if (!normalizedSourcePath) {
                continue;
            }
            const sourcePath = path.join(installed.packagePath, ...normalizedSourcePath.split('/'));
            if (!(await this.fileService.exists(sourcePath))) {
                continue;
            }
            const extension = path.extname(sourcePath) || '.md';
            const targetPath = path.join(projectPath, workspaceRoot, 'docs', `plugin.${locale}${extension}`);
            const created = !(await this.fileService.exists(targetPath));
            await this.fileService.copy(sourcePath, targetPath);
            if (created) {
                createdPaths.push(path.relative(projectPath, targetPath).replace(/\\/g, '/'));
            }
        }
        for (const entry of installed.manifest.scaffold.projectFiles || []) {
            const normalizedEntry = typeof entry === 'string'
                ? { from: entry, to: entry }
                : isPlainObject(entry)
                    ? {
                        from: normalizeString(entry.from),
                        to: normalizeString(entry.to),
                    }
                    : null;
            if (!normalizedEntry?.from || !normalizedEntry?.to) {
                continue;
            }
            const sourcePath = path.join(installed.packagePath, ...normalizedEntry.from.split('/'));
            if (!(await this.fileService.exists(sourcePath))) {
                continue;
            }
            const targetPath = path.join(projectPath, ...normalizedEntry.to.split('/'));
            const created = !(await this.fileService.exists(targetPath));
            await this.fileService.copy(sourcePath, targetPath);
            if (created) {
                createdPaths.push(path.relative(projectPath, targetPath).replace(/\\/g, '/'));
            }
        }
        return createdPaths.sort((left, right) => left.localeCompare(right));
    }
    createExternalPluginProjectConfig(packageName, version, manifest) {
        const defaults = isPlainObject(manifest.projectConfigDefaults)
            ? manifest.projectConfigDefaults
            : {};
        const defaultCapabilityConfig = isPlainObject(defaults.capabilities)
            ? defaults.capabilities
            : {};
        const workspaceRoot = normalizeString(defaults.workspace_root) || `.ospec/plugins/${manifest.id}`;
        return {
            enabled: defaults.enabled !== false,
            blocking: defaults.blocking !== false,
            source: normalizeString(defaults.source) || 'npm',
            package_name: packageName,
            version,
            workspace_root: workspaceRoot,
            display_name: manifest.displayName,
            description: manifest.description,
            official: manifest.official === true,
            kinds: [...manifest.kinds],
            settings: isPlainObject(defaults.settings) ? defaults.settings : {},
            docs: {
                locales: { ...manifest.docs.locales },
            },
            scaffold: {
                projectFiles: [...manifest.scaffold.projectFiles],
            },
            skills: {
                providers: { ...manifest.skills.providers },
            },
            knowledge: {
                bundle: manifest.knowledge.bundle,
            },
            hooks: {
                ...(manifest.hooks.enable ? { enable: { ...manifest.hooks.enable } } : {}),
                ...(manifest.hooks.doctor ? { doctor: { ...manifest.hooks.doctor } } : {}),
                ...(manifest.hooks.run ? { run: { ...manifest.hooks.run } } : {}),
                ...(manifest.hooks.approve ? { approve: { ...manifest.hooks.approve } } : {}),
                ...(manifest.hooks.reject ? { reject: { ...manifest.hooks.reject } } : {}),
            },
            status_fields: manifest.statusFields.map((item) => ({
                key: item.key,
                label: item.label,
                source: item.source,
            })),
            capabilities: Object.fromEntries(manifest.capabilities.map((capability) => {
                const capabilityDefaults = isPlainObject(defaultCapabilityConfig[capability.name])
                    ? defaultCapabilityConfig[capability.name]
                    : {};
                return [
                    capability.name,
                    {
                        enabled: capabilityDefaults.enabled !== false,
                        blocking: capabilityDefaults.blocking === false
                            ? false
                            : capability.blocking !== false,
                        step: normalizeString(capabilityDefaults.step) || capability.step,
                        activate_when_flags: uniqueStrings(capabilityDefaults.activate_when_flags, capability.activateWhenFlags),
                        execution: normalizeString(capabilityDefaults.execution) || capability.execution,
                    },
                ];
            })),
        };
    }
    async getOfficialRegistryEntries() {
        try {
            const remote = await this.fetchJson(OFFICIAL_PLUGIN_REGISTRY_URL);
            return this.normalizeRegistryEntries(remote);
        }
        catch {
            const bundled = await this.fileService.readJSON(this.getBundledRegistryPath());
            return this.normalizeRegistryEntries(bundled);
        }
    }
    async getInstalledRegistryEntries() {
        const installed = await this.getInstalledPlugins();
        return installed.map((entry) => ({
            id: entry.id,
            packageName: entry.package_name,
            displayName: entry.display_name,
            description: entry.description,
            official: entry.official === true,
            kinds: [...entry.kinds],
            docs: {
                locales: { ...(entry.manifest?.docs?.locales || {}) },
            },
        }));
    }
    normalizeRegistryEntries(input) {
        const registryObject = isPlainObject(input) && Array.isArray(input.plugins) ? input : null;
        const entries = Array.isArray(registryObject?.plugins)
            ? registryObject.plugins
            : Array.isArray(input)
                ? input
                : [];
        return entries
            .map((entry) => {
            if (!isPlainObject(entry)) {
                return null;
            }
            const id = normalizeString(entry.id);
            const packageName = normalizeString(entry.packageName) || normalizeString(entry.package_name);
            if (!id || !packageName) {
                return null;
            }
            return {
                id,
                packageName,
                displayName: normalizeString(entry.displayName) || id,
                description: normalizeString(entry.description),
                official: entry.official !== false,
                kinds: uniqueStrings(entry.kinds, ['runtime']),
                installRange: normalizeString(entry.installRange) || '>=1.0.0 <2.0.0',
                docs: isPlainObject(entry.docs)
                    ? {
                        locales: isPlainObject(entry.docs.locales)
                            ? Object.fromEntries(Object.entries(entry.docs.locales)
                                .map(([locale, value]) => [String(locale), normalizeString(value)])
                                .filter(([, value]) => value.length > 0))
                            : {},
                    }
                    : undefined,
            };
        })
            .filter(Boolean);
    }
    async resolvePluginReference(identifier) {
        const normalizedIdentifier = normalizeString(identifier).toLowerCase();
        const rawIdentifier = normalizeString(identifier);
        if (!normalizedIdentifier) {
            throw new Error('Plugin id or package name is required.');
        }
        const available = await this.getAvailablePlugins();
        const fromRegistry = available.find((entry) => entry.id.toLowerCase() === normalizedIdentifier ||
            entry.packageName.toLowerCase() === normalizedIdentifier);
        if (fromRegistry) {
            return fromRegistry;
        }
        const looksLikePath = rawIdentifier.startsWith('.') ||
            rawIdentifier.startsWith('/') ||
            /^[A-Za-z]:[\\/]/.test(rawIdentifier) ||
            rawIdentifier.includes('\\');
        if (normalizedIdentifier.startsWith('@') || normalizedIdentifier.includes('/') || looksLikePath) {
            const resolvedPackageName = this.resolvePackageNameFromSpecifier(rawIdentifier);
            const inferredId = normalizedIdentifier
                .replace(/^@clawplays\/ospec-plugin-/, '')
                .replace(/^@/, '')
                .replace(/[\\/]/g, '-')
                .replace(/\//g, '-');
            return {
                id: resolvedPackageName
                    ? resolvedPackageName
                        .replace(/^@clawplays\/ospec-plugin-/, '')
                        .replace(/^@/, '')
                        .replace(/[\\/]/g, '-')
                    : inferredId,
                packageName: rawIdentifier,
                displayName: inferredId,
                description: '',
                official: false,
                kinds: ['runtime'],
            };
        }
        return {
            id: normalizedIdentifier,
            packageName: `@clawplays/ospec-plugin-${normalizedIdentifier}`,
            displayName: normalizedIdentifier,
            description: '',
            official: false,
            kinds: ['runtime'],
        };
    }
    runNpm(args) {
        const result = process.platform === 'win32'
            ? (0, child_process_1.spawnSync)('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], {
                encoding: 'utf8',
                shell: false,
            })
            : (0, child_process_1.spawnSync)('npm', args, {
                encoding: 'utf8',
                shell: false,
            });
        if (result.status !== 0) {
            const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
            throw new Error(`npm ${args.join(' ')} failed${output ? `\n${output}` : ''}`);
        }
        return String(result.stdout || '').trim();
    }
    tryRunNpmJson(args) {
        const result = process.platform === 'win32'
            ? (0, child_process_1.spawnSync)('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], {
                encoding: 'utf8',
                shell: false,
            })
            : (0, child_process_1.spawnSync)('npm', args, {
                encoding: 'utf8',
                shell: false,
            });
        if (result.status !== 0) {
            return null;
        }
        const output = String(result.stdout || '').trim();
        if (!output) {
            return null;
        }
        try {
            return JSON.parse(output);
        }
        catch {
            return null;
        }
    }
    async resolveInstalledPackagePath(packageName) {
        const globalRoot = this.runNpm(['root', '-g']);
        const packagePath = path.join(globalRoot, ...packageName.split('/'));
        if (!(await this.fileService.exists(packagePath))) {
            throw new Error(`Installed package path not found for ${packageName}: ${packagePath}`);
        }
        return packagePath;
    }
    async tryResolveInstalledPackagePath(packageName) {
        try {
            return await this.resolveInstalledPackagePath(packageName);
        }
        catch {
            return '';
        }
    }
    async readInstalledPackageVersion(packagePath) {
        const packageJson = await this.fileService.readJSON(path.join(packagePath, 'package.json'));
        return normalizeString(packageJson.version);
    }
    async readPluginManifestFromPackage(packagePath) {
        const packageJson = await this.fileService.readJSON(path.join(packagePath, 'package.json'));
        return this.normalizePluginManifest(packageJson.ospecPlugin, packageJson.name);
    }
    normalizePluginManifest(input, packageName) {
        if (!isPlainObject(input)) {
            throw new Error(`Package ${packageName} is missing package.json ospecPlugin metadata.`);
        }
        const id = normalizeString(input.id);
        if (!id) {
            throw new Error(`Package ${packageName} has invalid ospecPlugin.id.`);
        }
        const capabilities = Array.isArray(input.capabilities) ? input.capabilities : [];
        return {
            id,
            displayName: normalizeString(input.displayName) || id,
            official: input.official !== false,
            description: normalizeString(input.description),
            kinds: uniqueStrings(input.kinds, ['runtime']),
            installRange: normalizeString(input.installRange) || '>=1.0.0 <2.0.0',
            compatibility: {
                ospec: normalizeString(input.compatibility?.ospec) ||
                    '*',
            },
            capabilities: capabilities
                .map((entry) => {
                if (!isPlainObject(entry)) {
                    return null;
                }
                const name = normalizeString(entry.name);
                const step = normalizeString(entry.step);
                if (!name || !step) {
                    return null;
                }
                return {
                    name,
                    step,
                    activateWhenFlags: uniqueStrings(entry.activateWhenFlags, []),
                    blocking: entry.blocking !== false,
                    execution: normalizeString(entry.execution) || 'runtime',
                };
            })
                .filter(Boolean),
            projectConfigDefaults: isPlainObject(input.projectConfigDefaults)
                ? input.projectConfigDefaults
                : {},
            docs: {
                locales: isPlainObject(input.docs?.locales)
                    ? Object.fromEntries(Object.entries(input.docs.locales)
                        .map(([locale, value]) => [String(locale), normalizeString(value)])
                        .filter(([, value]) => value.length > 0))
                    : {},
            },
            scaffold: {
                projectFiles: Array.isArray(input.scaffold?.projectFiles)
                    ? input.scaffold.projectFiles
                    : [],
            },
            skills: {
                providers: isPlainObject(input.skills?.providers)
                    ? Object.fromEntries(Object.entries(input.skills.providers)
                        .map(([provider, value]) => [String(provider), normalizeString(value)])
                        .filter(([, value]) => value.length > 0))
                    : {},
            },
            knowledge: {
                bundle: normalizeString(input.knowledge?.bundle),
            },
            hooks: {
                enable: normalizeHookCommand(input.hooks?.enable),
                doctor: normalizeHookCommand(input.hooks?.doctor),
                run: normalizeHookCommand(input.hooks?.run),
                approve: normalizeHookCommand(input.hooks?.approve),
                reject: normalizeHookCommand(input.hooks?.reject),
            },
            statusFields: Array.isArray(input.statusFields)
                ? input.statusFields
                    .map((entry) => {
                    if (!isPlainObject(entry)) {
                        return null;
                    }
                    const key = normalizeString(entry.key);
                    const label = normalizeString(entry.label);
                    const source = normalizeString(entry.source);
                    if (!key || !label || !source) {
                        return null;
                    }
                    return { key, label, source };
                })
                    .filter(Boolean)
                : [],
        };
    }
    async readInstalledState() {
        const statePath = this.getInstalledStatePath();
        if (!(await this.fileService.exists(statePath))) {
            return {
                version: 1,
                plugins: {},
            };
        }
        try {
            const parsed = await this.fileService.readJSON(statePath);
            return {
                version: Number.isFinite(parsed?.version) && Number(parsed.version) > 0
                    ? Math.floor(Number(parsed.version))
                    : 1,
                plugins: isPlainObject(parsed?.plugins) ? parsed.plugins : {},
            };
        }
        catch {
            return {
                version: 1,
                plugins: {},
            };
        }
    }
    async writeInstalledState(state) {
        await this.fileService.ensureDir(this.getPluginsHome());
        await this.fileService.writeJSON(this.getInstalledStatePath(), state);
    }
    async cacheKnowledgeBundle(manifest, packagePath) {
        const relativeBundlePath = normalizeString(manifest.knowledge.bundle);
        if (!relativeBundlePath) {
            return;
        }
        const sourcePath = path.join(packagePath, ...relativeBundlePath.split('/'));
        if (!(await this.fileService.exists(sourcePath))) {
            return;
        }
        const targetDir = this.getKnowledgeCacheDir(manifest.id);
        await this.fileService.remove(targetDir);
        await this.fileService.copy(sourcePath, targetDir);
    }
    getCurrentCliVersion() {
        try {
            const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            return normalizeString(packageJson.version);
        }
        catch {
            return '';
        }
    }
    async readNpmPackageMetadata(packageName) {
        const npmView = this.tryRunNpmJson(['view', packageName, '--json']);
        if (!npmView) {
            return {
                latestVersion: '',
                description: '',
                distTags: {},
                ospecPlugin: null,
            };
        }
        const normalized = Array.isArray(npmView) ? npmView[0] : npmView;
        return {
            latestVersion: normalizeString(normalized.version),
            description: normalizeString(normalized.description),
            distTags: isPlainObject(normalized['dist-tags'])
                ? Object.fromEntries(Object.entries(normalized['dist-tags'])
                    .map(([tag, value]) => [String(tag), normalizeString(value)])
                    .filter(([, value]) => value.length > 0))
                : {},
            ospecPlugin: normalized.ospecPlugin
                ? this.normalizePluginManifest(normalized.ospecPlugin, packageName)
                : null,
        };
    }
    async fetchJson(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                if (response.statusCode &&
                    response.statusCode >= 300 &&
                    response.statusCode < 400 &&
                    response.headers.location) {
                    response.resume();
                    this.fetchJson(response.headers.location).then(resolve).catch(reject);
                    return;
                }
                if (response.statusCode !== 200) {
                    response.resume();
                    reject(new Error(`Request failed with status ${response.statusCode}`));
                    return;
                }
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    body += chunk;
                });
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
            request.on('error', reject);
            request.end();
        });
    }
}
exports.PluginRegistryService = PluginRegistryService;
function createPluginRegistryService(fileService) {
    return new PluginRegistryService(fileService);
}

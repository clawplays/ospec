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
exports.PlanCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const BaseCommand_1 = require("./BaseCommand");
class PlanCommand extends BaseCommand_1.BaseCommand {
    async execute(...args) {
        try {
            if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
                this.printHelp();
                return;
            }
            const parsed = this.parseArgs(args);
            const result = await this.writePlan(parsed);
            this.printResult(result);
        }
        catch (error) {
            this.error(`Plan command failed: ${error}`);
            throw error;
        }
    }
    parseArgs(args) {
        let inputPath;
        let changePath;
        let fromBrainstorm;
        let output;
        let apply = false;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--change') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Plan requires a value after --change.');
                }
                changePath = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--change=')) {
                changePath = arg.slice('--change='.length);
                continue;
            }
            if (arg === '--from-brainstorm') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Plan requires a value after --from-brainstorm.');
                }
                fromBrainstorm = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--from-brainstorm=')) {
                fromBrainstorm = arg.slice('--from-brainstorm='.length);
                continue;
            }
            if (arg === '--output') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Plan requires a value after --output.');
                }
                output = value;
                index += 1;
                continue;
            }
            if (arg.startsWith('--output=')) {
                output = arg.slice('--output='.length);
                continue;
            }
            if (arg === '--apply') {
                apply = true;
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown plan flag: ${arg}`);
            }
            if (!inputPath) {
                inputPath = arg;
                continue;
            }
            throw new Error(`Unexpected plan argument: ${arg}`);
        }
        return { inputPath, changePath, fromBrainstorm, output, apply };
    }
    async writePlan(args) {
        const initialPath = path.resolve(args.inputPath || process.cwd());
        const changePath = args.changePath
            ? path.resolve(args.changePath)
            : await this.resolveChangePath(initialPath);
        const projectPath = changePath
            ? await this.findProjectRoot(changePath)
            : initialPath;
        await this.ensureInitialized(projectPath);
        const feature = changePath ? path.basename(changePath) : this.toFileSafeId(args.output || 'project-plan');
        const artifactDir = path.join(projectPath, '.ospec', 'plans', this.toFileSafeId(args.output || feature));
        const artifactPath = path.join(artifactDir, 'plan-draft.json');
        const reportPath = path.join(artifactDir, 'plan-draft.md');
        await services_1.services.fileService.ensureDir(artifactDir);
        const proposal = changePath ? await this.readOptional(path.join(changePath, constants_1.FILE_NAMES.PROPOSAL)) : '';
        const design = changePath ? await this.readOptional(path.join(changePath, constants_1.FILE_NAMES.DESIGN)) : '';
        const brainstorm = args.fromBrainstorm ? await this.readOptional(path.resolve(args.fromBrainstorm)) : '';
        const report = this.renderPlanDraft({
            feature,
            proposal,
            design,
            brainstorm,
            changePath,
        });
        const now = new Date().toISOString();
        const artifact = {
            version: '1.0',
            feature,
            createdAt: now,
            projectPath,
            changePath,
            fromBrainstorm: args.fromBrainstorm ? path.resolve(args.fromBrainstorm) : null,
            reportPath: path.relative(projectPath, reportPath).replace(/\\/g, '/'),
            appliedPath: args.apply && changePath ? path.join(changePath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN) : null,
        };
        await services_1.services.fileService.writeJSON(artifactPath, artifact);
        await services_1.services.fileService.writeFile(reportPath, report);
        let appliedPath = null;
        if (args.apply) {
            if (!changePath) {
                throw new Error('Plan --apply requires a change path or exactly one active change.');
            }
            appliedPath = path.join(changePath, constants_1.FILE_NAMES.IMPLEMENTATION_PLAN);
            await services_1.services.fileService.writeFile(appliedPath, report);
        }
        return {
            projectPath,
            changePath,
            artifactPath,
            reportPath,
            appliedPath,
            nextInstruction: appliedPath
                ? `Review ${appliedPath}, then derive artifacts/agents/task-graph.json and tasks.md.`
                : `Review ${reportPath}. Pass --apply to write it into implementation-plan.md when ready.`,
        };
    }
    async ensureInitialized(projectPath) {
        if (!await services_1.services.fileService.exists(path.join(projectPath, '.skillrc'))) {
            throw new Error(`OSpec project is not initialized at ${projectPath}. Run ospec init first.`);
        }
    }
    async resolveChangePath(inputPath) {
        if (await services_1.services.fileService.exists(path.join(inputPath, constants_1.FILE_NAMES.PROPOSAL))) {
            return inputPath;
        }
        const report = await services_1.services.projectService.getActiveChangeStatusReport(inputPath);
        if (report.changes.length === 1) {
            return report.changes[0].path;
        }
        return null;
    }
    async findProjectRoot(startPath) {
        let current = path.resolve(startPath);
        while (true) {
            if (await services_1.services.fileService.exists(path.join(current, '.skillrc'))) {
                return current;
            }
            const parent = path.dirname(current);
            if (parent === current) {
                return path.resolve(startPath);
            }
            current = parent;
        }
    }
    async readOptional(filePath) {
        return await services_1.services.fileService.exists(filePath)
            ? services_1.services.fileService.readFile(filePath)
            : '';
    }
    renderPlanDraft(input) {
        return [
            `# Implementation Plan Draft: ${input.feature}`,
            '',
            `- Change path: ${input.changePath || 'not bound to a change'}`,
            '- Source: generated by `ospec plan`',
            '',
            '## Source Summary',
            '',
            input.proposal ? this.summarizeSource('proposal.md', input.proposal) : '- `proposal.md`: not available',
            input.design ? this.summarizeSource('design.md', input.design) : '- `design.md`: not available',
            input.brainstorm ? this.summarizeSource('brainstorm', input.brainstorm) : '- Brainstorm: not attached',
            '',
            '## Execution Steps',
            '',
            '- [ ] Identify target files and ownership boundaries.',
            '- [ ] Implement the smallest coherent slice first.',
            '- [ ] Add or update focused tests for the changed behavior.',
            '- [ ] Run verification commands and record evidence.',
            '- [ ] Update task graph, tasks, and worker status artifacts.',
            '',
            '## Parallelization Notes',
            '',
            '- Independent documentation, test, and implementation tasks may be split only when target files do not conflict.',
            '- Use `ospec execute dispatch --limit N` after task graph entries are explicit.',
            '',
            '## Verification Commands',
            '',
            '- `npm test -- <focused-test>`',
            '- `npm run typecheck`',
            '',
            '## Open Questions',
            '',
            '- [ ] Which acceptance criteria are mandatory for the first slice?',
            '- [ ] Which risk should block dispatch until clarified?',
            '',
        ].join('\n');
    }
    summarizeSource(label, content) {
        const compact = content
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, 6)
            .join(' ');
        return `- \`${label}\`: ${compact.slice(0, 320)}${compact.length > 320 ? '...' : ''}`;
    }
    toFileSafeId(value) {
        return value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80) || `plan-${Date.now()}`;
    }
    printResult(result) {
        console.log('\nOSpec Plan Draft');
        console.log('================\n');
        console.log(`Project path: ${result.projectPath}`);
        console.log(`Change path: ${result.changePath || 'not bound'}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        if (result.appliedPath) {
            console.log(`Applied: ${result.appliedPath}`);
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printHelp() {
        console.log(`
Plan Commands:
  ospec plan [path] [--change change-path] [--from-brainstorm file] [--output id] [--apply]
`);
    }
}
exports.PlanCommand = PlanCommand;

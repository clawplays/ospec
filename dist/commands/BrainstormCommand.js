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
exports.BrainstormCommand = void 0;
const path = __importStar(require("path"));
const constants_1 = require("../core/constants");
const services_1 = require("../services");
const ProjectLayout_1 = require("../utils/ProjectLayout");
const BaseCommand_1 = require("./BaseCommand");
class BrainstormCommand extends BaseCommand_1.BaseCommand {
    async execute(...args) {
        try {
            if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
                this.printHelp();
                return;
            }
            const parsed = this.parseArgs(args);
            const result = await this.writeBrainstorm(parsed);
            this.printResult(result);
        }
        catch (error) {
            this.error(`Brainstorm command failed: ${error}`);
            throw error;
        }
    }
    parseArgs(args) {
        let projectPath;
        let topic = '';
        let changeName;
        let output;
        let visual = false;
        let decisionGates = false;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            if (arg === '--topic') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Brainstorm requires a value after --topic.');
                }
                topic = value.trim();
                index += 1;
                continue;
            }
            if (arg.startsWith('--topic=')) {
                topic = arg.slice('--topic='.length).trim();
                continue;
            }
            if (arg === '--change') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Brainstorm requires a value after --change.');
                }
                changeName = value.trim();
                index += 1;
                continue;
            }
            if (arg.startsWith('--change=')) {
                changeName = arg.slice('--change='.length).trim();
                continue;
            }
            if (arg === '--output') {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error('Brainstorm requires a value after --output.');
                }
                output = value.trim();
                index += 1;
                continue;
            }
            if (arg.startsWith('--output=')) {
                output = arg.slice('--output='.length).trim();
                continue;
            }
            if (arg === '--visual') {
                visual = true;
                continue;
            }
            if (arg === '--decision-gates') {
                decisionGates = true;
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown brainstorm flag: ${arg}`);
            }
            if (!projectPath) {
                projectPath = arg;
                continue;
            }
            throw new Error(`Unexpected brainstorm argument: ${arg}`);
        }
        if (!topic) {
            throw new Error('Brainstorm requires --topic "..." so the artifact has a stable problem statement.');
        }
        return {
            projectPath,
            topic,
            changeName,
            output,
            visual,
            decisionGates,
        };
    }
    async writeBrainstorm(args) {
        const projectPath = path.resolve(args.projectPath || process.cwd());
        await this.ensureInitialized(projectPath);
        const now = new Date().toISOString();
        const id = this.toFileSafeId(args.output || args.changeName || args.topic);
        const artifactDir = path.join(projectPath, '.ospec', 'brainstorms', id);
        const artifactPath = path.join(artifactDir, 'brainstorm.json');
        const reportPath = path.join(artifactDir, 'brainstorm.md');
        const visualPath = args.visual ? path.join(artifactDir, 'companion.html') : null;
        await services_1.services.fileService.ensureDir(artifactDir);
        const decisionGates = this.buildDecisionGates(args, null);
        const artifact = {
            version: '1.0',
            topic: args.topic,
            changeName: args.changeName || null,
            createdAt: now,
            projectPath,
            reportPath: path.relative(projectPath, reportPath).replace(/\\/g, '/'),
            visualPath: visualPath ? path.relative(projectPath, visualPath).replace(/\\/g, '/') : null,
            decisionAxes: [
                'user value',
                'scope boundaries',
                'architecture impact',
                'data and API impact',
                'risk and verification',
                'parallel execution candidates',
            ],
            decisionGates,
            nextInstruction: args.changeName
                ? `Create the change with ospec new ${args.changeName} ${projectPath}, then fold this brainstorm into proposal.md and design.md.`
                : 'Use this brainstorm to choose a change name, then run ospec new <change-name>.',
        };
        let decisionGateReports = [];
        if (args.decisionGates) {
            const changePath = await this.resolveDecisionGateChangePath(projectPath, args.changeName);
            artifact.decisionGates = this.buildDecisionGates(args, changePath);
            if (changePath) {
                decisionGateReports = await this.writeDecisionGates(changePath, artifact.decisionGates);
                artifact.nextInstruction = `Decision gates were written. Present ${path.relative(projectPath, path.join(changePath, 'artifacts', 'agents', 'decisions', 'index.md')).replace(/\\/g, '/')} before dispatch.`;
            }
            else {
                artifact.nextInstruction = 'Decision gate commands are recorded below. Create or select the change, then run the listed ospec execute decision commands before dispatch.';
            }
        }
        await services_1.services.fileService.writeJSON(artifactPath, artifact);
        await services_1.services.fileService.writeFile(reportPath, this.renderBrainstormReport(artifact));
        if (visualPath) {
            await services_1.services.fileService.writeFile(visualPath, this.renderVisualCompanion(artifact));
        }
        return {
            projectPath,
            artifactPath,
            reportPath,
            visualPath,
            decisionGateReports,
            nextInstruction: artifact.nextInstruction,
        };
    }
    async ensureInitialized(projectPath) {
        const skillrc = path.join(projectPath, '.skillrc');
        const ospecDir = path.join(projectPath, '.ospec');
        if (!await services_1.services.fileService.exists(skillrc) || !await services_1.services.fileService.exists(ospecDir)) {
            throw new Error(`OSpec project is not initialized at ${projectPath}. Run ospec init first.`);
        }
    }
    renderBrainstormReport(artifact) {
        const axes = artifact.decisionAxes.map(axis => `- [ ] ${axis}`).join('\n');
        const gates = artifact.decisionGates.length > 0
            ? artifact.decisionGates.map(gate => [
                `### ${gate.id}`,
                '',
                `- Required: ${gate.required ? 'yes' : 'no'}`,
                `- Question: ${gate.question}`,
                `- Recommended option: ${gate.recommendedOptionId}`,
                `- Report: ${gate.reportPath || 'not written yet'}`,
                '',
                'Options:',
                ...gate.options.map(option => `- ${option.id}: ${option.label} - ${option.description}`),
                '',
                'Command:',
                '',
                `\`${gate.command}\``,
            ].join('\n')).join('\n\n')
            : '- None';
        return [
            `# Brainstorm: ${artifact.topic}`,
            '',
            `- Created at: ${artifact.createdAt}`,
            `- Suggested change: ${artifact.changeName || 'not selected yet'}`,
            '',
            '## Problem Statement',
            '',
            artifact.topic,
            '',
            '## Candidate Directions',
            '',
            '- Direction A:',
            '- Direction B:',
            '- Direction C:',
            '',
            '## Decision Axes',
            '',
            axes,
            '',
            '## Questions To Resolve',
            '',
            '- [ ] What must be true for this to be useful?',
            '- [ ] What is explicitly out of scope?',
            '- [ ] Which files, modules, APIs, or user journeys are likely affected?',
            '- [ ] What verification would prove the direction is correct?',
            '',
            '## Decision Gates',
            '',
            gates,
            '',
            '## Recommended OSpec Follow-Up',
            '',
            artifact.nextInstruction,
            '',
        ].join('\n');
    }
    renderVisualCompanion(artifact) {
        const cards = artifact.decisionAxes
            .map(axis => `<section class="card"><h2>${this.escapeHtml(axis)}</h2><p>Capture options, tradeoffs, risks, and evidence for this axis.</p></section>`)
            .join('\n');
        return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OSpec Brainstorm Companion</title>
  <style>
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f3efe2; color: #211b12; }
    main { max-width: 1120px; margin: 0 auto; padding: 48px 24px; }
    h1 { font-size: clamp(2rem, 5vw, 4.5rem); line-height: 0.95; margin: 0 0 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
    .card { min-height: 160px; padding: 22px; border: 2px solid #211b12; background: #fffaf0; box-shadow: 8px 8px 0 #d77f32; }
    .next { margin-top: 28px; padding: 18px 22px; background: #211b12; color: #fffaf0; }
  </style>
</head>
<body>
  <main>
    <p>OSpec visual brainstorming companion</p>
    <h1>${this.escapeHtml(artifact.topic)}</h1>
    <div class="grid">${cards}</div>
    <div class="next">${this.escapeHtml(artifact.nextInstruction)}</div>
  </main>
</body>
</html>
`;
    }
    escapeHtml(value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    toFileSafeId(value) {
        return value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80) || `brainstorm-${Date.now()}`;
    }
    printResult(result) {
        console.log('\nOSpec Brainstorm');
        console.log('================\n');
        console.log(`Project path: ${result.projectPath}`);
        console.log(`Artifact: ${result.artifactPath}`);
        console.log(`Report: ${result.reportPath}`);
        if (result.visualPath) {
            console.log(`Visual companion: ${result.visualPath}`);
        }
        if (result.decisionGateReports.length > 0) {
            console.log('Decision gates:');
            for (const reportPath of result.decisionGateReports) {
                console.log(`  - ${reportPath}`);
            }
        }
        console.log('\nNext instruction:');
        console.log(`  ${result.nextInstruction}`);
        console.log('');
    }
    printHelp() {
        console.log(`
Brainstorm Commands:
  ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual] [--decision-gates]
`);
    }
    buildDecisionGates(args, changePath) {
        const changeArg = changePath ? this.quoteCommandArg(changePath) : '[change-path]';
        const gates = [
            {
                id: 'brainstorm-direction',
                required: true,
                question: `Which direction should the change pursue first for: ${args.topic}`,
                recommendedOptionId: 'smallest-scope',
                options: [
                    { id: 'smallest-scope', label: 'Smallest scope', description: 'Choose the narrowest direction that proves user value.' },
                    { id: 'architecture-first', label: 'Architecture first', description: 'Resolve architecture impact before task dispatch.' },
                    { id: 'explore-alternatives', label: 'Explore alternatives', description: 'Hold implementation until competing directions are compared.' },
                ],
            },
            {
                id: 'brainstorm-scope',
                required: true,
                question: 'Which scope boundary should be enforced before implementation?',
                recommendedOptionId: 'narrow',
                options: [
                    { id: 'narrow', label: 'Narrow', description: 'Implement only the core behavior required for this change.' },
                    { id: 'expanded', label: 'Expanded', description: 'Include adjacent workflow polish if it is low risk.' },
                    { id: 'split', label: 'Split', description: 'Split follow-up work into another change before dispatch.' },
                ],
            },
            {
                id: 'brainstorm-verification-risk',
                required: false,
                question: 'How should verification risk be handled for this brainstorm?',
                recommendedOptionId: 'standard',
                options: [
                    { id: 'standard', label: 'Standard', description: 'Use the normal verification commands from implementation-plan.md.' },
                    { id: 'extra-evidence', label: 'Extra evidence', description: 'Require additional debug, TDD, or checkpoint evidence before finish.' },
                    { id: 'block-until-tooling', label: 'Block until tooling', description: 'Do not dispatch until missing verification tooling is available.' },
                ],
            },
        ];
        return gates.map(gate => ({
            ...gate,
            command: [
                `ospec execute decision ${changeArg}`,
                `--id ${this.quoteCommandArg(gate.id)}`,
                `--question ${this.quoteCommandArg(gate.question)}`,
                ...gate.options.map(option => `--option ${this.quoteCommandArg(`${option.id}:${option.label}:${option.description}`)}`),
                `--recommended ${this.quoteCommandArg(gate.recommendedOptionId)}`,
                gate.required ? '--required' : '--optional',
            ].join(' '),
            reportPath: null,
        }));
    }
    async resolveDecisionGateChangePath(projectPath, changeName) {
        const config = await services_1.services.configManager.loadConfig(projectPath).catch(() => null);
        if (changeName) {
            const changePath = (0, ProjectLayout_1.getChangeDir)(projectPath, constants_1.DIR_NAMES.ACTIVE, changeName, config);
            return await services_1.services.fileService.exists(changePath) ? changePath : null;
        }
        const activeNames = await services_1.services.projectService.listActiveChangeNames(projectPath);
        if (activeNames.length !== 1) {
            return null;
        }
        const changePath = (0, ProjectLayout_1.getChangeDir)(projectPath, constants_1.DIR_NAMES.ACTIVE, activeNames[0], config);
        return await services_1.services.fileService.exists(changePath) ? changePath : null;
    }
    async writeDecisionGates(changePath, gates) {
        const reports = [];
        for (const gate of gates) {
            const result = await services_1.services.taskGraphExecutionService.recordUserDecision(changePath, {
                id: gate.id,
                question: gate.question,
                options: gate.options,
                recommendedOptionId: gate.recommendedOptionId,
                required: gate.required,
                summary: 'Created from brainstorm decision gates.',
            });
            gate.reportPath = result.reportPath;
            gate.command = gate.command.replace('[change-path]', this.quoteCommandArg(changePath));
            reports.push(result.reportPath);
        }
        return reports;
    }
    quoteCommandArg(value) {
        if (/^[A-Za-z0-9_./:@\\-]+$/.test(value)) {
            return value;
        }
        return `"${value.replace(/"/g, '\\"')}"`;
    }
}
exports.BrainstormCommand = BrainstormCommand;

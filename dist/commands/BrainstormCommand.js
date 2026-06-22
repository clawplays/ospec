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
            if (args[0] === 'resolve') {
                await this.resolve(args.slice(1));
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
        const language = await this.resolveBrainstormLanguage(projectPath);
        const decisionGates = this.buildDecisionGates(args, null, language);
        const askLadder = this.copy(language, '把每个决策门用你 harness 最好的交互方式呈现给用户——有原生问答 UI（Claude Code AskUserQuestion、Gemini ask_user）就用它，否则用 Plan/审批 UI（Codex Plan 模式），都没有就用纯聊天文字——一次问一个。**绝不要自动选"推荐项"：推荐只是给用户看的提示，必须等用户真正回答。**', 'Present each decision gate to the user with your harness\'s best interactive mechanism — a native question UI (Claude Code AskUserQuestion, Gemini ask_user) if available, otherwise your plan/approval UI (Codex Plan mode), otherwise plain chat text — and ask one at a time. NEVER auto-select the recommended option: "recommended" is only a hint to show the user; you must wait for the user\'s actual answer.');
        const recordHint = this.copy(language, `用户回答后，用 ospec brainstorm resolve ${projectPath} --brainstorm ${id} --gate <gate-id> --select <option-id> 记录每个选择。required 决策门未回答前，不要开始实现或派发。不要把这个 brainstorm 留成没答复的空模板。`, `After the user answers, record each choice with ospec brainstorm resolve ${projectPath} --brainstorm ${id} --gate <gate-id> --select <option-id>. Do not implement or dispatch while a required gate is unanswered. Do not leave this brainstorm as an unanswered template.`);
        const followUp = args.changeName
            ? this.copy(language, `然后用 ospec new ${args.changeName} ${projectPath} 创建 change，并把已解决的 brainstorm 融入 proposal.md 和 design.md。`, `Then create the change with ospec new ${args.changeName} ${projectPath} and fold the resolved brainstorm into proposal.md and design.md.`)
            : this.copy(language, '然后从已确定的方向选一个 change 名字，运行 ospec new <change-name>。', 'Then choose a change name from the resolved direction and run ospec new <change-name>.');
        const artifact = {
            version: '1.0',
            status: 'open',
            documentLanguage: language,
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
            nextInstruction: `${askLadder} ${recordHint} ${followUp}`,
        };
        let decisionGateReports = [];
        if (args.decisionGates) {
            const changePath = await this.resolveDecisionGateChangePath(projectPath, args.changeName);
            artifact.decisionGates = this.buildDecisionGates(args, changePath, language);
            if (changePath) {
                decisionGateReports = await this.writeDecisionGates(changePath, artifact.decisionGates);
                artifact.nextInstruction = `${askLadder} ${this.copy(language, `然后用 ospec execute decision ${changePath} --id <gate-id> --select <option-id> 记录每个答复（并用 ospec brainstorm resolve ${projectPath} --brainstorm ${id} --gate <gate-id> --select <option-id> 同步进本 brainstorm）。required 决策门回答前不要派发。`, `Then record each answer with ospec execute decision ${changePath} --id <gate-id> --select <option-id> (and mirror it into this brainstorm with ospec brainstorm resolve ${projectPath} --brainstorm ${id} --gate <gate-id> --select <option-id>). Do not dispatch until the required gates are answered.`)}`;
            }
            else {
                artifact.nextInstruction = `${askLadder} ${this.copy(language, `然后用 ospec brainstorm resolve ${projectPath} --brainstorm ${id} --gate <gate-id> --select <option-id> 记录每个答复。创建或选定 change，再在派发前运行列出的 ospec execute decision 命令。`, `Then record each answer with ospec brainstorm resolve ${projectPath} --brainstorm ${id} --gate <gate-id> --select <option-id>. Create or select the change, then re-run the listed ospec execute decision commands before dispatch.`)}`;
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
        const lang = artifact.documentLanguage || 'en-US';
        const c = (zh, en) => this.copy(lang, zh, en);
        const notSelected = c('尚未选择', 'not selected yet');
        const resolvedGate = (gate) => typeof gate.selectedOptionId === 'string' && gate.selectedOptionId.length > 0;
        const axes = artifact.decisionAxes.map(axis => `- ${this.localizeAxis(lang, axis)}`).join('\n');
        const gates = artifact.decisionGates.length > 0
            ? artifact.decisionGates.map(gate => [
                `### ${gate.id}`,
                '',
                `- ${c('必答', 'Required')}: ${gate.required ? c('是', 'yes') : c('否', 'no')}`,
                `- ${c('问题', 'Question')}: ${gate.question}`,
                `- ${c('推荐项', 'Recommended option')}: ${gate.recommendedOptionId}`,
                `- ${c('用户已选', 'Selected option')}: ${gate.selectedOptionId || notSelected}`,
                ...(gate.note ? [`- ${c('备注', 'Note')}: ${gate.note}`] : []),
                `- ${c('报告', 'Report')}: ${gate.reportPath || c('尚未写入', 'not written yet')}`,
                '',
                `${c('选项', 'Options')}:`,
                ...gate.options.map(option => `- [${option.id === gate.selectedOptionId ? 'x' : ' '}] ${option.id}: ${option.label} - ${option.description}`),
                '',
                `${c('命令', 'Command')}:`,
                '',
                `\`${gate.command}\``,
            ].join('\n')).join('\n\n')
            : c('- 无', '- None');
        const requiredGates = artifact.decisionGates.filter(gate => gate.required);
        const status = artifact.status || (requiredGates.length > 0 && requiredGates.every(resolvedGate) ? 'resolved' : 'open');
        return [
            `# ${c('头脑风暴', 'Brainstorm')}: ${artifact.topic}`,
            '',
            `- ${c('状态', 'Status')}: ${status}`,
            `- ${c('创建于', 'Created at')}: ${artifact.createdAt}`,
            `- ${c('建议的 change', 'Suggested change')}: ${artifact.changeName || notSelected}`,
            '',
            `## ${c('问题陈述', 'Problem Statement')}`,
            '',
            artifact.topic,
            '',
            `## ${c('候选方向', 'Candidate Directions')}`,
            '',
            `- ${c('方向', 'Direction')} A:`,
            `- ${c('方向', 'Direction')} B:`,
            `- ${c('方向', 'Direction')} C:`,
            '',
            `## ${c('决策维度（讨论时权衡，不是勾选项）', 'Decision Axes (weigh during discussion; not a checklist)')}`,
            '',
            axes,
            '',
            `## ${c('待解决的问题（讨论提示）', 'Questions To Resolve (discussion prompts)')}`,
            '',
            c('- 这件事要有用，必须满足什么？', '- What must be true for this to be useful?'),
            c('- 明确不做什么（范围外）？', '- What is explicitly out of scope?'),
            c('- 可能影响哪些文件、模块、API 或用户路径？', '- Which files, modules, APIs, or user journeys are likely affected?'),
            c('- 什么验证能证明这个方向是对的？', '- What verification would prove the direction is correct?'),
            '',
            `## ${c('决策门', 'Decision Gates')}`,
            '',
            gates,
            '',
            `## ${c('OSpec 后续建议', 'Recommended OSpec Follow-Up')}`,
            '',
            artifact.nextInstruction,
            '',
        ].join('\n');
    }
    renderVisualCompanion(artifact) {
        const lang = artifact.documentLanguage || 'en-US';
        const cardBody = this.copy(lang, '记录该维度的选项、取舍、风险与证据。', 'Capture options, tradeoffs, risks, and evidence for this axis.');
        const intro = this.copy(lang, 'OSpec 可视化头脑风暴伴侣', 'OSpec visual brainstorming companion');
        const cards = artifact.decisionAxes
            .map(axis => `<section class="card"><h2>${this.escapeHtml(this.localizeAxis(lang, axis))}</h2><p>${cardBody}</p></section>`)
            .join('\n');
        return `<!doctype html>
<html lang="${lang === 'zh-CN' ? 'zh-CN' : 'en'}">
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
    <p>${intro}</p>
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
    async resolveBrainstormLanguage(projectPath) {
        const config = await services_1.services.configManager.loadConfig(projectPath).catch(() => null);
        const lang = config?.documentLanguage;
        return lang === 'zh-CN' || lang === 'ja-JP' || lang === 'ar' || lang === 'en-US' ? lang : 'en-US';
    }
    /** Body-content localization mirrors OSpec change templates: zh-CN vs en-US, with ja-JP/ar on en. */
    copy(language, zh, en) {
        return language === 'zh-CN' ? zh : en;
    }
    localizeAxis(language, axis) {
        const map = {
            'user value': '用户价值',
            'scope boundaries': '范围边界',
            'architecture impact': '架构影响',
            'data and API impact': '数据与 API 影响',
            'risk and verification': '风险与验证',
            'parallel execution candidates': '可并行执行的候选',
        };
        return language === 'zh-CN' ? (map[axis] || axis) : axis;
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
    parseResolveArgs(args) {
        let projectPath;
        let brainstormId = '';
        let gateId = '';
        let optionId = '';
        let note;
        for (let index = 0; index < args.length; index += 1) {
            const arg = args[index];
            const takeValue = (flag) => {
                const value = args[index + 1];
                if (!value || value.startsWith('--')) {
                    throw new Error(`Brainstorm resolve requires a value after ${flag}.`);
                }
                index += 1;
                return value.trim();
            };
            if (arg === '--brainstorm') {
                brainstormId = takeValue('--brainstorm');
                continue;
            }
            if (arg.startsWith('--brainstorm=')) {
                brainstormId = arg.slice('--brainstorm='.length).trim();
                continue;
            }
            if (arg === '--gate') {
                gateId = takeValue('--gate');
                continue;
            }
            if (arg.startsWith('--gate=')) {
                gateId = arg.slice('--gate='.length).trim();
                continue;
            }
            if (arg === '--select') {
                optionId = takeValue('--select');
                continue;
            }
            if (arg.startsWith('--select=')) {
                optionId = arg.slice('--select='.length).trim();
                continue;
            }
            if (arg === '--note') {
                note = takeValue('--note');
                continue;
            }
            if (arg.startsWith('--note=')) {
                note = arg.slice('--note='.length).trim();
                continue;
            }
            if (arg.startsWith('--')) {
                throw new Error(`Unknown brainstorm resolve flag: ${arg}`);
            }
            if (!projectPath) {
                projectPath = arg;
                continue;
            }
            throw new Error(`Unexpected brainstorm resolve argument: ${arg}`);
        }
        if (!brainstormId) {
            throw new Error('Brainstorm resolve requires --brainstorm <id>.');
        }
        if (!gateId) {
            throw new Error('Brainstorm resolve requires --gate <gate-id>.');
        }
        if (!optionId) {
            throw new Error('Brainstorm resolve requires --select <option-id>.');
        }
        return { projectPath, brainstormId, gateId, optionId, note };
    }
    async resolve(args) {
        const parsed = this.parseResolveArgs(args);
        const projectPath = path.resolve(parsed.projectPath || process.cwd());
        await this.ensureInitialized(projectPath);
        const artifactDir = path.join(projectPath, '.ospec', 'brainstorms', parsed.brainstormId);
        const artifactPath = path.join(artifactDir, 'brainstorm.json');
        const reportPath = path.join(artifactDir, 'brainstorm.md');
        if (!await services_1.services.fileService.exists(artifactPath)) {
            throw new Error(`Brainstorm "${parsed.brainstormId}" not found at ${path.relative(projectPath, artifactPath).replace(/\\/g, '/')}. Create it first with ospec brainstorm --topic "...".`);
        }
        const artifact = await services_1.services.fileService.readJSON(artifactPath);
        const gates = Array.isArray(artifact.decisionGates) ? artifact.decisionGates : [];
        const gate = gates.find(item => item.id === parsed.gateId);
        if (!gate) {
            throw new Error(`Decision gate "${parsed.gateId}" not found in this brainstorm. Available: ${gates.map(item => item.id).join(', ') || 'none'}.`);
        }
        if (!gate.options.some(option => option.id === parsed.optionId)) {
            throw new Error(`Option "${parsed.optionId}" is not valid for gate "${parsed.gateId}". Valid options: ${gate.options.map(option => option.id).join(', ')}.`);
        }
        gate.selectedOptionId = parsed.optionId;
        gate.note = parsed.note ?? gate.note ?? null;
        const requiredGates = gates.filter(item => item.required);
        artifact.status = requiredGates.length > 0 && requiredGates.every(item => typeof item.selectedOptionId === 'string' && item.selectedOptionId.length > 0)
            ? 'resolved'
            : 'open';
        await services_1.services.fileService.writeJSON(artifactPath, artifact);
        await services_1.services.fileService.writeFile(reportPath, this.renderBrainstormReport(artifact));
        console.log('\nBrainstorm Resolved');
        console.log('===================\n');
        console.log(`Brainstorm: ${parsed.brainstormId}`);
        console.log(`Gate: ${parsed.gateId}`);
        console.log(`Selected: ${parsed.optionId}`);
        console.log(`Status: ${artifact.status}`);
        console.log(`Report: ${path.relative(projectPath, reportPath).replace(/\\/g, '/')}`);
        if (artifact.status === 'resolved') {
            this.success('All required decision gates are answered. This brainstorm now has a result.');
        }
        else {
            const pending = requiredGates.filter(item => !item.selectedOptionId).map(item => item.id);
            this.info(`Still pending required gates: ${pending.join(', ') || 'none'}.`);
        }
        console.log('');
    }
    printHelp() {
        console.log(`
Brainstorm Commands:
  ospec brainstorm [path] --topic "..." [--change name] [--output id] [--visual] [--decision-gates]
  ospec brainstorm resolve [path] --brainstorm <id> --gate <gate-id> --select <option-id> [--note "..."]
`);
    }
    buildDecisionGates(args, changePath, language = 'en-US') {
        const changeArg = changePath ? this.quoteCommandArg(changePath) : '[change-path]';
        const c = (zh, en) => this.copy(language, zh, en);
        const gates = [
            {
                id: 'brainstorm-direction',
                required: true,
                question: c(`这个 change 应该优先走哪个方向：${args.topic}`, `Which direction should the change pursue first for: ${args.topic}`),
                recommendedOptionId: 'smallest-scope',
                options: [
                    { id: 'smallest-scope', label: c('最小范围', 'Smallest scope'), description: c('选能验证用户价值的最窄方向。', 'Choose the narrowest direction that proves user value.') },
                    { id: 'architecture-first', label: c('架构优先', 'Architecture first'), description: c('在派发任务前先解决架构影响。', 'Resolve architecture impact before task dispatch.') },
                    { id: 'explore-alternatives', label: c('探索备选', 'Explore alternatives'), description: c('在对比完竞争方向前先不实现。', 'Hold implementation until competing directions are compared.') },
                ],
            },
            {
                id: 'brainstorm-scope',
                required: true,
                question: c('实现前应该锁定哪个范围边界？', 'Which scope boundary should be enforced before implementation?'),
                recommendedOptionId: 'narrow',
                options: [
                    { id: 'narrow', label: c('收窄', 'Narrow'), description: c('只实现这个 change 必需的核心行为。', 'Implement only the core behavior required for this change.') },
                    { id: 'expanded', label: c('扩展', 'Expanded'), description: c('在低风险时附带相邻的流程打磨。', 'Include adjacent workflow polish if it is low risk.') },
                    { id: 'split', label: c('拆分', 'Split'), description: c('派发前把后续工作拆成另一个 change。', 'Split follow-up work into another change before dispatch.') },
                ],
            },
            {
                id: 'brainstorm-verification-risk',
                required: false,
                question: c('这个 brainstorm 的验证风险该怎么处理？', 'How should verification risk be handled for this brainstorm?'),
                recommendedOptionId: 'standard',
                options: [
                    { id: 'standard', label: c('标准', 'Standard'), description: c('用 implementation-plan.md 里的常规验证命令。', 'Use the normal verification commands from implementation-plan.md.') },
                    { id: 'extra-evidence', label: c('额外证据', 'Extra evidence'), description: c('在 finish 前要求额外的 debug、TDD 或 checkpoint 证据。', 'Require additional debug, TDD, or checkpoint evidence before finish.') },
                    { id: 'block-until-tooling', label: c('阻塞至工具就绪', 'Block until tooling'), description: c('缺失的验证工具就位前不要派发。', 'Do not dispatch until missing verification tooling is available.') },
                ],
            },
        ];
        return gates.map(gate => ({
            ...gate,
            selectedOptionId: null,
            note: null,
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

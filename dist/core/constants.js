"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_STEPS = exports.DATETIME_FORMAT = exports.DATE_FORMAT = exports.NAMING_RULES = exports.DIR_NAMES = exports.FILE_NAMES = exports.CORE_REQUIRED_STEPS = exports.STATE_TRANSITIONS = void 0;
exports.STATE_TRANSITIONS = {
    queued: ['draft'],
    draft: ['proposed'],
    proposed: ['planned', 'draft'],
    planned: ['implementing', 'proposed'],
    implementing: ['verifying', 'planned'],
    verifying: ['ready_to_archive', 'implementing'],
    ready_to_archive: ['archived', 'verifying'],
    archived: [],
};
exports.CORE_REQUIRED_STEPS = [
    'proposal',
    'tasks',
    'state',
    'verification',
    'skill_update',
    'index_regenerated',
];
exports.FILE_NAMES = {
    SKILLRC: '.skillrc',
    SKILL_MD: 'SKILL.md',
    SKILL_INDEX: 'SKILL.index.json',
    README: 'README.md',
    BUILD_INDEX_SCRIPT: '.ospec/tools/build-index-auto.cjs',
    AI_GUIDE: 'ai-guide.md',
    EXECUTION_PROTOCOL: 'execution-protocol.md',
    PROPOSAL: 'proposal.md',
    TASKS: 'tasks.md',
    VERIFICATION: 'verification.md',
    STATE: 'state.json',
    REVIEW: 'review.md',
    INDEX: 'INDEX.json',
};
exports.DIR_NAMES = {
    CHANGES: 'changes',
    ACTIVE: 'active',
    QUEUED: 'queued',
    ARCHIVED: 'archived',
    RUNS: 'runs',
    HISTORY: 'history',
    LOGS: 'logs',
    FOR_AI: 'for-ai',
    DOCS: 'docs',
    PROJECT: 'project',
    DESIGN: 'design',
    PLANNING: 'planning',
    API: 'api',
    SRC: 'src',
    MODULES: 'modules',
    CORE: 'core',
    TESTS: 'tests',
    DIST: 'dist',
};
exports.NAMING_RULES = {
    FEATURE_NAME: /^[a-z0-9]+(-[a-z0-9]+)*$/,
    ARCHIVED_DIR: /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/,
};
exports.DATE_FORMAT = 'YYYY-MM-DD';
exports.DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';
exports.WORKFLOW_STEPS = [
    'proposal_complete',
    'tasks_complete',
    'implementation_complete',
    'skill_updated',
    'index_regenerated',
    'tests_passed',
    'verification_passed',
    'archived',
];
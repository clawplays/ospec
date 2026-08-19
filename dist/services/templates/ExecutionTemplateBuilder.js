"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionTemplateBuilder = void 0;
const TemplateBuilderBase_1 = require("./TemplateBuilderBase");
class ExecutionTemplateBuilder extends TemplateBuilderBase_1.TemplateBuilderBase {
    constructor(inputs) {
        super();
        this.inputs = inputs;
    }
    generateProposalTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        this.setReferenceDocumentContext(context.projectRoot, context.documentPath);
        try {
            const created = this.getCurrentDate();
            const projectDocs = context.projectContext.projectDocs ?? [];
            const moduleSkills = context.projectContext.moduleSkills ?? [];
            const apiDocs = context.projectContext.apiDocs ?? [];
            const designAndPlanningDocs = [
                ...(context.projectContext.designDocs ?? []),
                ...(context.projectContext.planningDocs ?? []),
            ];
            const zh = `## 背景

${context.background}

## 项目上下文

**项目文档：**
${this.formatReferenceList(projectDocs, '待补充')}

**关联模块技能：**
${this.formatReferenceList(moduleSkills, '待补充')}

**关联 API 文档：**
${this.formatReferenceList(apiDocs, '待补充')}

**关联设计 / 计划文档：**
${this.formatReferenceList(designAndPlanningDocs, '待补充')}

## 目标

${this.formatList(context.goals, '待补充')}

## 范围

**涉及：**
${this.formatList(context.inScope, '待补充')}

**不涉及：**
${this.formatList(context.outOfScope, '待补充')}

## 验收标准

${this.formatChecklist(context.acceptanceCriteria, '待补充')}`;
            const en = `## Background

${context.background}

## Project Context

**Project docs:**
${this.formatReferenceList(projectDocs, 'TBD')}

**Related module skills:**
${this.formatReferenceList(moduleSkills, 'TBD')}

**Related API docs:**
${this.formatReferenceList(apiDocs, 'TBD')}

**Related design / planning docs:**
${this.formatReferenceList(designAndPlanningDocs, 'TBD')}

## Goals

${this.formatList(context.goals, 'TBD')}

## Scope

**In scope:**
${this.formatList(context.inScope, 'TBD')}

**Out of scope:**
${this.formatList(context.outOfScope, 'TBD')}

## Acceptance Criteria

${this.formatChecklist(context.acceptanceCriteria, 'TBD')}`;
            const ja = `## 背景

${context.background}

## プロジェクト文脈

**プロジェクト文書:**
${this.formatReferenceList(projectDocs, '未定')}

**関連モジュール SKILL:**
${this.formatReferenceList(moduleSkills, '未定')}

**関連 API 文書:**
${this.formatReferenceList(apiDocs, '未定')}

**関連する設計 / 計画文書:**
${this.formatReferenceList(designAndPlanningDocs, '未定')}

## 目標

${this.formatList(context.goals, '未定')}

## 範囲

**対象:**
${this.formatList(context.inScope, '未定')}

**対象外:**
${this.formatList(context.outOfScope, '未定')}

## 受け入れ条件

${this.formatChecklist(context.acceptanceCriteria, '未定')}`;
            const ar = `## الخلفية

${context.background}

## سياق المشروع

**وثائق المشروع:**
${this.formatReferenceList(projectDocs, 'قيد التحديد')}

**ملفات SKILL للوحدات ذات الصلة:**
${this.formatReferenceList(moduleSkills, 'قيد التحديد')}

**وثائق API ذات الصلة:**
${this.formatReferenceList(apiDocs, 'قيد التحديد')}

**وثائق التصميم / التخطيط ذات الصلة:**
${this.formatReferenceList(designAndPlanningDocs, 'قيد التحديد')}

## الأهداف

${this.formatList(context.goals, 'قيد التحديد')}

## النطاق

**ضمن النطاق:**
${this.formatList(context.inScope, 'قيد التحديد')}

**خارج النطاق:**
${this.formatList(context.outOfScope, 'قيد التحديد')}

## معايير القبول

${this.formatChecklist(context.acceptanceCriteria, 'قيد التحديد')}`;
            return this.withFrontmatter({
                name: context.feature,
                status: context.placement === 'queued' ? 'queued' : 'active',
                created,
                affects: context.affects,
                // 7.5: the Phase 7 feature slugs this change touches. Emitted for
                // BOTH workflow profiles (unlike change_type below, which is
                // classic-only) because a goal touches features just as a change
                // does, and the index reads this list for either. Possibly empty --
                // no match is allowed and planning can fill it in.
                features: context.features,
                flags: context.flags,
                ...(context.workflowProfile === 'change'
                    ? {
                        change_type: 'pending',
                        documentation_impact: 'pending',
                        documentation_updates: [],
                        documentation_reason: '',
                    }
                    : {}),
            }, this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
    generateDesignTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        this.setReferenceDocumentContext(context.projectRoot, context.documentPath);
        try {
            const created = this.getCurrentDate();
            const projectDocs = context.projectContext.projectDocs ?? [];
            const moduleSkills = context.projectContext.moduleSkills ?? [];
            const linkedKnowledgeDocs = [
                ...(context.projectContext.apiDocs ?? []),
                ...(context.projectContext.designDocs ?? []),
                ...(context.projectContext.planningDocs ?? []),
            ];
            const zh = `## 设计目标

把 \`proposal.md\` 中的目标和范围转成可执行方案，先澄清边界、取舍和风险，再拆解 \`implementation-plan.md\`。

## 上下文引用

**项目文档：**
${this.formatReferenceList(projectDocs, '待补充')}

**模块技能：**
${this.formatReferenceList(moduleSkills, '待补充')}

**API / 设计 / 计划文档：**
${this.formatReferenceList(linkedKnowledgeDocs, '待补充')}

## 方案

**选定方案：**
- 待补充

**关键取舍：**
- 待补充

**数据 / API / UI 影响：**
- 待补充

## 风险与边界

- 待补充

## 设计检查清单

- [ ] 已回看 \`proposal.md\` 的目标、范围和验收标准
- [ ] 已选择实现方案并记录关键取舍
- [ ] 已确认数据、API、UI 或模块边界影响
- [ ] 已记录风险、限制和未决问题
- [ ] 可以据此拆解 \`implementation-plan.md\``;
            const en = `## Design Goal

Turn the goals and scope in \`proposal.md\` into an executable approach before breaking work into \`implementation-plan.md\`.

## Context References

**Project docs:**
${this.formatReferenceList(projectDocs, 'TBD')}

**Module skills:**
${this.formatReferenceList(moduleSkills, 'TBD')}

**API / design / planning docs:**
${this.formatReferenceList(linkedKnowledgeDocs, 'TBD')}

## Approach

**Selected approach:**
- TBD

**Key tradeoffs:**
- TBD

**Data / API / UI impact:**
- TBD

## Risks And Boundaries

- TBD

## Design Checklist

- [ ] Goals, scope, and acceptance criteria in \`proposal.md\` are reviewed
- [ ] Implementation approach is selected and key tradeoffs are recorded
- [ ] Data, API, UI, or module boundary impact is confirmed
- [ ] Risks, constraints, and open questions are recorded
- [ ] \`implementation-plan.md\` can be derived from this design`;
            const ja = `## 設計目標

\`proposal.md\` の目標と範囲を、\`implementation-plan.md\` に分解する前に実行可能な方針へ落とし込みます。

## 参照コンテキスト

**プロジェクト文書:**
${this.formatReferenceList(projectDocs, '未定')}

**モジュール SKILL:**
${this.formatReferenceList(moduleSkills, '未定')}

**API / 設計 / 計画文書:**
${this.formatReferenceList(linkedKnowledgeDocs, '未定')}

## 方針

**採用する方針:**
- 未定

**主なトレードオフ:**
- 未定

**データ / API / UI への影響:**
- 未定

## リスクと境界

- 未定

## 設計チェックリスト

- [ ] \`proposal.md\` の目標、範囲、受け入れ条件を確認した
- [ ] 実装方針を選び、主なトレードオフを記録した
- [ ] データ、API、UI、またはモジュール境界への影響を確認した
- [ ] リスク、制約、未解決事項を記録した
- [ ] この設計から \`implementation-plan.md\` を分解できる`;
            const ar = `## هدف التصميم

حوّل الأهداف والنطاق في \`proposal.md\` إلى نهج قابل للتنفيذ قبل تقسيم العمل في \`implementation-plan.md\`.

## مراجع السياق

**وثائق المشروع:**
${this.formatReferenceList(projectDocs, 'قيد التحديد')}

**ملفات SKILL للوحدات:**
${this.formatReferenceList(moduleSkills, 'قيد التحديد')}

**وثائق API / التصميم / التخطيط:**
${this.formatReferenceList(linkedKnowledgeDocs, 'قيد التحديد')}

## النهج

**النهج المختار:**
- قيد التحديد

**المفاضلات الرئيسية:**
- قيد التحديد

**أثر البيانات / API / UI:**
- قيد التحديد

## المخاطر والحدود

- قيد التحديد

## قائمة فحص التصميم

- [ ] تمت مراجعة الأهداف والنطاق ومعايير القبول في \`proposal.md\`
- [ ] تم اختيار نهج التنفيذ وتسجيل المفاضلات الرئيسية
- [ ] تم تأكيد أثر البيانات أو API أو UI أو حدود الوحدات
- [ ] تم تسجيل المخاطر والقيود والأسئلة المفتوحة
- [ ] يمكن اشتقاق \`implementation-plan.md\` من هذا التصميم`;
            return this.withFrontmatter({
                feature: context.feature,
                created,
                status: context.placement === 'queued' ? 'queued' : 'draft',
                optional_steps: context.optionalSteps,
            }, this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
    generateTasksTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        this.setReferenceDocumentContext(context.projectRoot, context.documentPath);
        try {
            const created = this.getCurrentDate();
            const projectDocs = context.projectContext.projectDocs ?? [];
            const moduleSkills = context.projectContext.moduleSkills ?? [];
            const optionalStepTasksZh = context.optionalSteps.length > 0
                ? context.optionalSteps
                    .map((step) => `- [ ] 完成可选步骤 \`${step}\` 的文档和验证`)
                    .join('\n')
                : '';
            const optionalStepTasksEn = context.optionalSteps.length > 0
                ? context.optionalSteps
                    .map((step) => `- [ ] Finish docs and verification for optional step \`${step}\``)
                    .join('\n')
                : '';
            const optionalStepTasksJa = context.optionalSteps.length > 0
                ? context.optionalSteps
                    .map((step) => `- [ ] オプション手順 \`${step}\` の文書と検証を完了する`)
                    .join('\n')
                : '';
            const optionalStepTasksAr = context.optionalSteps.length > 0
                ? context.optionalSteps
                    .map((step) => `- [ ] أكمل التوثيق والتحقق للخطوة الاختيارية \`${step}\``)
                    .join('\n')
                : '';
            const zh = `## 上下文引用

**项目文档：**
${this.formatReferenceList(projectDocs, '待补充')}

**模块技能：**
${this.formatReferenceList(moduleSkills, '待补充')}

## 任务清单

- [ ] task-1 完成实现
- [ ] 对齐项目规划文档与本次 change 的边界
- [ ] 更新涉及模块的 \`SKILL.md\`
- [ ] 更新相关 API / 设计 / 计划文档
- [ ] 重新生成 \`SKILL.index.json\`
- [ ] 执行验证并更新 \`verification.md\`
${optionalStepTasksZh}`.trim();
            const en = `## Context References

**Project docs:**
${this.formatReferenceList(projectDocs, 'TBD')}

**Module skills:**
${this.formatReferenceList(moduleSkills, 'TBD')}

## Task Checklist

- [ ] task-1 Implement the change
- [ ] Align project planning docs with this change boundary
- [ ] Update affected \`SKILL.md\` files
- [ ] Update related API / design / planning docs
- [ ] Rebuild \`SKILL.index.json\`
- [ ] Run verification and update \`verification.md\`
${optionalStepTasksEn}`.trim();
            const ja = `## 参照コンテキスト

**プロジェクト文書:**
${this.formatReferenceList(projectDocs, '未定')}

**モジュール SKILL:**
${this.formatReferenceList(moduleSkills, '未定')}

## タスクチェックリスト

- [ ] task-1 change を実装する
- [ ] この change の境界に合わせてプロジェクト計画文書を揃える
- [ ] 影響を受ける \`SKILL.md\` を更新する
- [ ] 関連する API / 設計 / 計画文書を更新する
- [ ] \`SKILL.index.json\` を再生成する
- [ ] 検証を実行して \`verification.md\` を更新する
${optionalStepTasksJa}`.trim();
            const ar = `## مراجع السياق

**وثائق المشروع:**
${this.formatReferenceList(projectDocs, 'قيد التحديد')}

**ملفات SKILL للوحدات:**
${this.formatReferenceList(moduleSkills, 'قيد التحديد')}

## قائمة المهام

- [ ] task-1 نفّذ التغيير
- [ ] وحّد وثائق تخطيط المشروع مع حدود هذا change
- [ ] حدّث ملفات \`SKILL.md\` المتأثرة
- [ ] حدّث وثائق API / التصميم / التخطيط ذات الصلة
- [ ] أعد بناء \`SKILL.index.json\`
- [ ] نفّذ التحقق وحدّث \`verification.md\`
${optionalStepTasksAr}`.trim();
            const changeZh = `## 快速任务清单

- [ ] 完成本次 change 的实现
- [ ] 运行与改动相关的测试或检查，并记录结果
- [ ] 按 proposal 中的 \`documentation_impact\` 同步真实文档，或确认无需更新的原因
- [ ] 更新 \`verification.md\`
- [ ] 完成当前 AI 的轻量 \`review.md\``;
            const changeEn = `## Fast Task Checklist

- [ ] Implement this change
- [ ] Run checks or tests relevant to the change and record the results
- [ ] Follow the proposal \`documentation_impact\` contract by updating real documentation or confirming why none is needed
- [ ] Update \`verification.md\`
- [ ] Complete the current AI's lightweight \`review.md\``;
            const changeJa = `## 高速タスクチェックリスト

- [ ] この change を実装する
- [ ] change に関連するテストまたはチェックを実行して結果を記録する
- [ ] proposal の \`documentation_impact\` に従って実文書を更新するか、更新不要の理由を確認する
- [ ] \`verification.md\` を更新する
- [ ] 現在の AI による軽量な \`review.md\` を完了する`;
            const changeAr = `## قائمة المهام السريعة

- [ ] نفّذ هذا change
- [ ] شغّل الاختبارات أو الفحوص ذات الصلة وسجّل النتائج
- [ ] اتبع عقد \`documentation_impact\` في proposal بتحديث وثائق حقيقية أو تأكيد سبب عدم الحاجة
- [ ] حدّث \`verification.md\`
- [ ] أكمل \`review.md\` الخفيفة بواسطة AI الحالي`;
            return this.withFrontmatter({
                feature: context.feature,
                created,
                optional_steps: context.optionalSteps,
            }, context.workflowProfile === 'change'
                ? this.copy(context.documentLanguage, changeZh, changeEn, changeJa, changeAr)
                : this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
    generateImplementationPlanTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        this.setReferenceDocumentContext(context.projectRoot, context.documentPath);
        try {
            const created = this.getCurrentDate();
            const projectDocs = context.projectContext.projectDocs ?? [];
            const moduleSkills = context.projectContext.moduleSkills ?? [];
            const linkedKnowledgeDocs = [
                ...(context.projectContext.apiDocs ?? []),
                ...(context.projectContext.designDocs ?? []),
                ...(context.projectContext.planningDocs ?? []),
            ];
            const optionalStepTasksZh = context.optionalSteps.length > 0
                ? context.optionalSteps
                    .map((step) => `- [ ] 为可选步骤 \`${step}\` 安排执行和验证证据`)
                    .join('\n')
                : '';
            const optionalStepTasksEn = context.optionalSteps.length > 0
                ? context.optionalSteps
                    .map((step) => `- [ ] Plan execution and verification evidence for optional step \`${step}\``)
                    .join('\n')
                : '';
            const optionalStepTasksJa = context.optionalSteps.length > 0
                ? context.optionalSteps
                    .map((step) => `- [ ] オプション手順 \`${step}\` の実行と検証証跡を計画する`)
                    .join('\n')
                : '';
            const optionalStepTasksAr = context.optionalSteps.length > 0
                ? context.optionalSteps
                    .map((step) => `- [ ] خطط للتنفيذ وأدلة التحقق للخطوة الاختيارية \`${step}\``)
                    .join('\n')
                : '';
            const zh = `## 计划目标

把 \`design.md\` 中的方案转成 agent 可执行的步骤，明确影响文件、验证命令和交付顺序，再拆解 \`tasks.md\`。

## 上下文引用

**项目文档：**
${this.formatReferenceList(projectDocs, '待补充')}

**模块技能：**
${this.formatReferenceList(moduleSkills, '待补充')}

**API / 设计 / 计划文档：**
${this.formatReferenceList(linkedKnowledgeDocs, '待补充')}

## 执行边界

**预计修改文件：**
- 待补充

**预计测试 / 验证命令：**
- 待补充

**依赖与顺序：**
- 待补充

## Agent 执行步骤

- [ ] 回看 \`proposal.md\` 和 \`design.md\`
- [ ] 列出每个步骤的目标文件和预期结果
- [ ] 明确每个步骤的验证命令或人工验收口径
- [ ] 标记可并行任务、依赖关系和冲突文件
- [ ] 据此生成或更新 \`tasks.md\`
${optionalStepTasksZh}`.trim();
            const en = `## Plan Goal

Turn the approach in \`design.md\` into agent-executable steps with affected files, verification commands, and delivery order before breaking work into \`tasks.md\`.

## Context References

**Project docs:**
${this.formatReferenceList(projectDocs, 'TBD')}

**Module skills:**
${this.formatReferenceList(moduleSkills, 'TBD')}

**API / design / planning docs:**
${this.formatReferenceList(linkedKnowledgeDocs, 'TBD')}

## Execution Boundary

**Expected files to change:**
- TBD

**Expected test / verification commands:**
- TBD

**Dependencies and order:**
- TBD

## Agent Execution Steps

- [ ] Review \`proposal.md\` and \`design.md\`
- [ ] List target files and expected result for each step
- [ ] Define verification commands or manual acceptance for each step
- [ ] Mark parallelizable tasks, dependencies, and conflicting files
- [ ] Generate or update \`tasks.md\` from this plan
${optionalStepTasksEn}`.trim();
            const ja = `## 計画目標

\`design.md\` の方針を、影響ファイル、検証コマンド、納品順序を含む agent 実行可能な手順へ変換してから \`tasks.md\` に分解します。

## 参照コンテキスト

**プロジェクト文書:**
${this.formatReferenceList(projectDocs, '未定')}

**モジュール SKILL:**
${this.formatReferenceList(moduleSkills, '未定')}

**API / 設計 / 計画文書:**
${this.formatReferenceList(linkedKnowledgeDocs, '未定')}

## 実行境界

**変更予定ファイル:**
- 未定

**テスト / 検証コマンド:**
- 未定

**依存関係と順序:**
- 未定

## Agent 実行手順

- [ ] \`proposal.md\` と \`design.md\` を確認する
- [ ] 各手順の対象ファイルと期待結果を列挙する
- [ ] 各手順の検証コマンドまたは手動受け入れ基準を定義する
- [ ] 並行可能な作業、依存関係、競合ファイルを示す
- [ ] この計画から \`tasks.md\` を作成または更新する
${optionalStepTasksJa}`.trim();
            const ar = `## هدف الخطة

حوّل النهج في \`design.md\` إلى خطوات قابلة للتنفيذ بواسطة agent مع الملفات المتأثرة وأوامر التحقق وترتيب التسليم قبل تقسيم العمل في \`tasks.md\`.

## مراجع السياق

**وثائق المشروع:**
${this.formatReferenceList(projectDocs, 'قيد التحديد')}

**ملفات SKILL للوحدات:**
${this.formatReferenceList(moduleSkills, 'قيد التحديد')}

**وثائق API / التصميم / التخطيط:**
${this.formatReferenceList(linkedKnowledgeDocs, 'قيد التحديد')}

## حدود التنفيذ

**الملفات المتوقع تغييرها:**
- قيد التحديد

**أوامر الاختبار / التحقق المتوقعة:**
- قيد التحديد

**الاعتماديات والترتيب:**
- قيد التحديد

## خطوات تنفيذ agent

- [ ] راجع \`proposal.md\` و\`design.md\`
- [ ] اذكر الملفات المستهدفة والنتيجة المتوقعة لكل خطوة
- [ ] حدد أوامر التحقق أو معيار القبول اليدوي لكل خطوة
- [ ] علّم المهام القابلة للتوازي والاعتماديات والملفات المتعارضة
- [ ] أنشئ \`tasks.md\` أو حدّثه من هذه الخطة
${optionalStepTasksAr}`.trim();
            return this.withFrontmatter({
                feature: context.feature,
                created,
                status: context.placement === 'queued' ? 'queued' : 'draft',
                optional_steps: context.optionalSteps,
            }, this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
    generateVerificationTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        this.setReferenceDocumentContext(context.projectRoot, context.documentPath);
        try {
            const created = this.getCurrentDate();
            const projectDocs = context.projectContext.projectDocs ?? [];
            const moduleSkills = context.projectContext.moduleSkills ?? [];
            const linkedKnowledgeDocs = [
                ...(context.projectContext.apiDocs ?? []),
                ...(context.projectContext.designDocs ?? []),
                ...(context.projectContext.planningDocs ?? []),
            ];
            const zh = `## 自动验证

- [ ] build 通过
- [ ] lint 通过
- [ ] test 通过
- [ ] 已用 \`ospec execute tdd\` 记录适用的 red/green/refactor 测试证据，或记录不适用原因
- [ ] 调试是本 change 的一部分时，已用 \`ospec execute debug\` 记录根因/修复证据，或记录不适用原因
- [ ] 索引已重新生成
- [ ] spec-check 通过
- [ ] 已用 \`ospec execute verify\` 记录最终验证证据

## 项目联动检查

${this.formatReferenceChecklist(projectDocs, '项目文档已回看')}

${this.formatReferenceChecklist(moduleSkills, '相关模块技能已回看')}

${this.formatReferenceChecklist(linkedKnowledgeDocs, '相关 API / 设计 / 计划文档已回看')}

## 需求验收

${this.formatChecklist(context.acceptanceCriteria, '验收项 1')}

## 结果

- [ ] 可以归档`;
            const en = `## Automated Checks

- [ ] build passed
- [ ] lint passed
- [ ] test passed
- [ ] applicable red/green/refactor test evidence recorded with \`ospec execute tdd\`, or a not-applicable reason recorded
- [ ] root-cause/fix evidence recorded with \`ospec execute debug\` when debugging was part of this change, or a not-applicable reason recorded
- [ ] index rebuilt
- [ ] spec-check passed
- [ ] final verification evidence recorded with \`ospec execute verify\`

## Project Sync Review

${this.formatReferenceChecklist(projectDocs, 'Project docs reviewed')}

${this.formatReferenceChecklist(moduleSkills, 'Related module skills reviewed')}

${this.formatReferenceChecklist(linkedKnowledgeDocs, 'Related API / design / planning docs reviewed')}

## Acceptance Review

${this.formatChecklist(context.acceptanceCriteria, 'Acceptance item 1')}

## Decision

- [ ] Ready to archive`;
            const ja = `## 自動検証

- [ ] build が通過した
- [ ] lint が通過した
- [ ] test が通過した
- [ ] 適用可能な red/green/refactor テスト証拠を \`ospec execute tdd\` で記録した、または適用外の理由を記録した
- [ ] debugging がこの change の一部だった場合、root-cause/fix evidence を \`ospec execute debug\` で記録した、または適用外の理由を記録した
- [ ] インデックスを再生成した
- [ ] spec-check が通過した
- [ ] \`ospec execute verify\` で最終検証証拠を記録した

## プロジェクト同期レビュー

${this.formatReferenceChecklist(projectDocs, 'プロジェクト文書を確認済み')}

${this.formatReferenceChecklist(moduleSkills, '関連モジュール SKILL を確認済み')}

${this.formatReferenceChecklist(linkedKnowledgeDocs, '関連する API / 設計 / 計画文書を確認済み')}

## 受け入れ確認

${this.formatChecklist(context.acceptanceCriteria, '受け入れ条件 1')}

## 判定

- [ ] archive 可能`;
            const ar = `## التحقق الآلي

- [ ] نجح build
- [ ] نجح lint
- [ ] نجح test
- [ ] سُجل دليل اختبار red/green/refactor المناسب باستخدام \`ospec execute tdd\` أو سُجل سبب عدم الانطباق
- [ ] سُجل root-cause/fix evidence باستخدام \`ospec execute debug\` عندما كان debugging جزءا من هذا change أو سُجل سبب عدم الانطباق
- [ ] أُعيد بناء الفهرس
- [ ] نجح spec-check
- [ ] سُجل دليل التحقق النهائي باستخدام \`ospec execute verify\`

## مراجعة مزامنة المشروع

${this.formatReferenceChecklist(projectDocs, 'تمت مراجعة وثائق المشروع')}

${this.formatReferenceChecklist(moduleSkills, 'تمت مراجعة ملفات SKILL ذات الصلة')}

${this.formatReferenceChecklist(linkedKnowledgeDocs, 'تمت مراجعة وثائق API / التصميم / التخطيط ذات الصلة')}

## مراجعة القبول

${this.formatChecklist(context.acceptanceCriteria, 'معيار قبول 1')}

## القرار

- [ ] جاهز للأرشفة`;
            const changeZh = `## 相关验证

- [ ] 已记录实际运行的测试或检查命令及其结果
- [ ] 验收标准已逐项确认
- [ ] proposal 声明的真实文档更新已完成，或已确认 \`documentation_impact: none\`
- [ ] 没有未解决的阻塞问题
- [ ] 可以归档

## 命令与结果

- 待补充`;
            const changeEn = `## Relevant Verification

- [ ] Actual test or check commands and their results are recorded
- [ ] Acceptance criteria are confirmed
- [ ] Real documentation updates declared by the proposal are complete, or \`documentation_impact: none\` is confirmed
- [ ] No blocking issue remains
- [ ] Ready to archive

## Commands And Results

- TBD`;
            const changeJa = `## 関連する検証

- [ ] 実行したテストまたはチェックコマンドと結果を記録した
- [ ] 受け入れ条件を確認した
- [ ] proposal で宣言した実文書の更新を完了した、または \`documentation_impact: none\` を確認した
- [ ] 未解決の blocker がない
- [ ] archive 可能

## コマンドと結果

- 未定`;
            const changeAr = `## التحقق ذو الصلة

- [ ] سُجلت أوامر الاختبار أو الفحص الفعلية ونتائجها
- [ ] تم تأكيد معايير القبول
- [ ] اكتملت تحديثات الوثائق الحقيقية المعلنة في proposal أو تم تأكيد \`documentation_impact: none\`
- [ ] لا توجد مشكلة حاجبة غير محلولة
- [ ] جاهز للأرشفة

## الأوامر والنتائج

- قيد التحديد`;
            return this.withFrontmatter({
                feature: context.feature,
                created,
                status: context.placement === 'queued' ? 'queued' : 'verifying',
                optional_steps: context.optionalSteps,
                passed_optional_steps: [],
            }, context.workflowProfile === 'change'
                ? this.copy(context.documentLanguage, changeZh, changeEn, changeJa, changeAr)
                : this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
    generateTaskGraphTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        const taskGraph = {
            version: '1.0',
            contract_version: '1.9.0',
            feature: context.feature,
            status: 'pending',
            optional_steps: context.optionalSteps,
            global_constraints: [],
            generated_from: [
                'proposal.md',
                'design.md',
                'implementation-plan.md',
                'tasks.md',
            ],
            tasks: [
                {
                    id: 'task-1',
                    title: 'Implement the change',
                    status: 'PENDING',
                    depends_on: [],
                    parallelizable: false,
                    serial_reason: 'Template placeholder; replace with a concrete dependency, conflict, or parallel task split before review.',
                    scope_reason: null,
                    conflicts_with: [],
                    target_files: [],
                    verification_commands: [],
                    expected_result: 'TBD',
                    context: 'TBD',
                    interfaces: [],
                    documentation_updates: [],
                    worker_role: 'implementer',
                },
            ],
        };
        return `${JSON.stringify(taskGraph, null, 2)}\n`;
    }
    generateAgentWorkerStatusTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        this.setReferenceDocumentContext(context.projectRoot, context.documentPath);
        try {
            const created = this.getCurrentDate();
            const zh = `## Worker 状态协议

允许状态：
- \`DONE\`：任务完成，没有阻断问题
- \`DONE_WITH_CONCERNS\`：任务完成，但有需要 controller 评估的风险或遗留问题
- \`NEEDS_CONTEXT\`：缺少继续执行所需的上下文
- \`BLOCKED\`：被外部条件、冲突或失败阻断
- \`PENDING\`：尚未执行

## Implementer 结果

- Status: \`PENDING\`
- Worker: 待补充
- Scope: 待补充
- Changed files: 待补充
- Verification run: 待补充
- Concerns: 待补充

## Combined Review

- Status: \`PENDING\`
- Reviewer: 待补充
- Decision: 待补充
- Findings: 待补充（一次检查 spec compliance 与 code quality）

## Controller Decision

- Status: \`PENDING\`
- Decision: 待补充
- Follow-up required: 待补充

## Checklist

- [ ] Implementer 已给出 \`DONE\` 或 \`DONE_WITH_CONCERNS\`
- [ ] Combined review 已完成（spec compliance + code quality）
- [ ] Controller 已处理 concerns、context request 或 blocker
- [ ] 最终验证命令已写入 \`verification.md\``;
            const en = `## Worker Status Protocol

Allowed statuses:
- \`DONE\`: work completed with no blocking issue
- \`DONE_WITH_CONCERNS\`: work completed, but risks or residual issues require controller judgment
- \`NEEDS_CONTEXT\`: more context is required before work can continue
- \`BLOCKED\`: work is blocked by an external condition, conflict, or failure
- \`PENDING\`: work has not run yet

## Implementer Result

- Status: \`PENDING\`
- Worker: TBD
- Scope: TBD
- Changed files: TBD
- Verification run: TBD
- Concerns: TBD

## Combined Review

- Status: \`PENDING\`
- Reviewer: TBD
- Decision: TBD
- Findings: TBD (spec compliance and code quality in one pass)

## Controller Decision

- Status: \`PENDING\`
- Decision: TBD
- Follow-up required: TBD

## Checklist

- [ ] Implementer returned \`DONE\` or \`DONE_WITH_CONCERNS\`
- [ ] Combined review completed (spec compliance + code quality)
- [ ] Controller resolved concerns, context requests, or blockers
- [ ] Final verification commands are recorded in \`verification.md\``;
            const ja = `## Worker 状態プロトコル

許可される状態:
- \`DONE\`: 阻害要因なく作業が完了した
- \`DONE_WITH_CONCERNS\`: 作業は完了したが、controller 判断が必要なリスクまたは残課題がある
- \`NEEDS_CONTEXT\`: 継続に追加コンテキストが必要
- \`BLOCKED\`: 外部条件、競合、失敗によりブロックされている
- \`PENDING\`: まだ実行されていない

## Implementer Result

- Status: \`PENDING\`
- Worker: 未定
- Scope: 未定
- Changed files: 未定
- Verification run: 未定
- Concerns: 未定

## Combined Review

- Status: \`PENDING\`
- Reviewer: 未定
- Decision: 未定
- Findings: 未定（spec compliance と code quality を一度に確認）

## Controller Decision

- Status: \`PENDING\`
- Decision: 未定
- Follow-up required: 未定

## Checklist

- [ ] Implementer が \`DONE\` または \`DONE_WITH_CONCERNS\` を返した
- [ ] Combined review が完了した（spec compliance + code quality）
- [ ] Controller が concerns、context request、blocker を解決した
- [ ] 最終検証コマンドを \`verification.md\` に記録した`;
            const ar = `## بروتوكول حالة worker

الحالات المسموحة:
- \`DONE\`: اكتمل العمل بلا مشكلة حاجبة
- \`DONE_WITH_CONCERNS\`: اكتمل العمل، لكن توجد مخاطر أو مسائل متبقية تحتاج قرار controller
- \`NEEDS_CONTEXT\`: يلزم سياق إضافي قبل متابعة العمل
- \`BLOCKED\`: العمل محجوب بسبب شرط خارجي أو تعارض أو فشل
- \`PENDING\`: لم يبدأ التنفيذ بعد

## نتيجة implementer

- Status: \`PENDING\`
- Worker: قيد التحديد
- Scope: قيد التحديد
- Changed files: قيد التحديد
- Verification run: قيد التحديد
- Concerns: قيد التحديد

## مراجعة موحدة

- Status: \`PENDING\`
- Reviewer: قيد التحديد
- Decision: قيد التحديد
- Findings: قيد التحديد (مطابقة المواصفة وجودة الكود في مراجعة واحدة)

## قرار controller

- Status: \`PENDING\`
- Decision: قيد التحديد
- Follow-up required: قيد التحديد

## قائمة الفحص

- [ ] أعاد implementer الحالة \`DONE\` أو \`DONE_WITH_CONCERNS\`
- [ ] اكتملت المراجعة الموحدة لمطابقة المواصفة وجودة الكود
- [ ] عالج controller المخاوف أو طلبات السياق أو الحواجز
- [ ] سُجلت أوامر التحقق النهائية في \`verification.md\``;
            return this.withFrontmatter({
                feature: context.feature,
                created,
                status: 'pending',
                implementer_status: 'PENDING',
                spec_reviewer_status: 'PENDING',
                quality_reviewer_status: 'PENDING',
                controller_status: 'PENDING',
                allowed_worker_statuses: [
                    'DONE',
                    'DONE_WITH_CONCERNS',
                    'NEEDS_CONTEXT',
                    'BLOCKED',
                    'PENDING',
                ],
            }, this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
    generateReviewTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        this.setReferenceDocumentContext(context.projectRoot, context.documentPath);
        try {
            const created = this.getCurrentDate();
            const projectDocs = context.projectContext.projectDocs ?? [];
            const moduleSkills = context.projectContext.moduleSkills ?? [];
            const linkedKnowledgeDocs = [
                ...(context.projectContext.apiDocs ?? []),
                ...(context.projectContext.designDocs ?? []),
                ...(context.projectContext.planningDocs ?? []),
            ];
            const affects = context.affects.length > 0 ? context.affects.join(', ') : 'TBD';
            const affectsJa = context.affects.length > 0 ? context.affects.join(', ') : '未定';
            const affectsAr = context.affects.length > 0 ? context.affects.join(', ') : 'قيد التحديد';
            const zh = `## 评审范围

- Change: \`${context.feature}\`
- Mode: \`${context.mode}\`
- Affects: ${context.affects.length > 0 ? context.affects.join(', ') : '待补充'}

## 上下文引用

**项目文档：**
${this.formatReferenceList(projectDocs, '待补充')}

**模块技能：**
${this.formatReferenceList(moduleSkills, '待补充')}

**API / 设计 / 计划文档：**
${this.formatReferenceList(linkedKnowledgeDocs, '待补充')}

## Review Checklist

- [ ] 实现是否符合 proposal 中的背景、目标和范围
- [ ] 关联模块技能是否已同步
- [ ] API / 设计 / 计划文档是否需要更新
- [ ] 验证项是否覆盖主要风险
- [ ] 是否存在回归风险、边界遗漏或未决问题

## Findings

- [ ] 待补充

## Decision

- [ ] 可以继续实现
- [ ] 需要补充修改
- [ ] 可以进入验证 / 归档流程`;
            const en = `## Review Scope

- Change: \`${context.feature}\`
- Mode: \`${context.mode}\`
- Affects: ${affects}

## Context References

**Project docs:**
${this.formatReferenceList(projectDocs, 'TBD')}

**Module skills:**
${this.formatReferenceList(moduleSkills, 'TBD')}

**API / design / planning docs:**
${this.formatReferenceList(linkedKnowledgeDocs, 'TBD')}

## Review Checklist

- [ ] Implementation matches proposal background, goals, and scope
- [ ] Related module skills are updated
- [ ] API / design / planning docs are aligned
- [ ] Verification covers the main risks
- [ ] Regressions, gaps, and open questions are tracked

## Findings

- [ ] TBD

## Decision

- [ ] Continue implementation
- [ ] Require follow-up changes
- [ ] Ready for verification / archive`;
            const ja = `## レビュー範囲

- Change: \`${context.feature}\`
- Mode: \`${context.mode}\`
- Affects: ${affectsJa}

## 参照コンテキスト

**プロジェクト文書:**
${this.formatReferenceList(projectDocs, '未定')}

**モジュール SKILL:**
${this.formatReferenceList(moduleSkills, '未定')}

**API / 設計 / 計画文書:**
${this.formatReferenceList(linkedKnowledgeDocs, '未定')}

## レビューチェックリスト

- [ ] 実装が proposal の背景、目標、範囲に一致している
- [ ] 関連モジュールの SKILL が更新されている
- [ ] API / 設計 / 計画文書が揃っている
- [ ] 検証が主要リスクをカバーしている
- [ ] リグレッション、境界漏れ、未解決事項が追跡されている

## 指摘事項

- [ ] 未定

## 判定

- [ ] 実装を継続できる
- [ ] 追補修正が必要
- [ ] 検証 / archive に進める`;
            const ar = `## نطاق المراجعة

- Change: \`${context.feature}\`
- Mode: \`${context.mode}\`
- Affects: ${affectsAr}

## مراجع السياق

**وثائق المشروع:**
${this.formatReferenceList(projectDocs, 'قيد التحديد')}

**ملفات SKILL للوحدات:**
${this.formatReferenceList(moduleSkills, 'قيد التحديد')}

**وثائق API / التصميم / التخطيط:**
${this.formatReferenceList(linkedKnowledgeDocs, 'قيد التحديد')}

## قائمة فحص المراجعة

- [ ] التنفيذ يطابق الخلفية والأهداف والنطاق في proposal
- [ ] تم تحديث ملفات SKILL ذات الصلة
- [ ] وثائق API / التصميم / التخطيط متوافقة
- [ ] يغطي التحقق المخاطر الرئيسية
- [ ] تم تتبع الارتدادات والثغرات والأسئلة المفتوحة

## الملاحظات

- [ ] قيد التحديد

## القرار

- [ ] يمكن متابعة التنفيذ
- [ ] يلزم إجراء تعديلات إضافية
- [ ] جاهز للانتقال إلى التحقق / الأرشفة`;
            const changeZh = `## 轻量 Review

- [ ] 实现符合 proposal 的目标、范围和验收标准
- [ ] 已检查相关测试结果和主要回归风险
- [ ] 已核对 \`documentation_impact\` 与实际文档更新
- [ ] 已记录 concern、未决问题或确认没有发现
- [ ] 已把最终判定写入 frontmatter 的 \`decision\`

## Findings

- 未发现；如有问题在此记录`;
            const changeEn = `## Lightweight Review

- [ ] Implementation matches the proposal goals, scope, and acceptance criteria
- [ ] Relevant test results and primary regression risks are checked
- [ ] \`documentation_impact\` matches the actual documentation updates
- [ ] Concerns or open issues are recorded, or their absence is confirmed
- [ ] The final decision is written to the frontmatter \`decision\`

## Findings

- None found; record any issue here`;
            const changeJa = `## 軽量 Review

- [ ] 実装が proposal の目標、範囲、受け入れ条件に一致する
- [ ] 関連するテスト結果と主要な回帰リスクを確認した
- [ ] \`documentation_impact\` が実際の文書更新と一致する
- [ ] concern や未解決事項を記録した、または存在しないことを確認した
- [ ] 最終判定を frontmatter の \`decision\` に記録した

## Findings

- なし。問題があればここに記録する`;
            const changeAr = `## مراجعة خفيفة

- [ ] يطابق التنفيذ أهداف proposal ونطاقها ومعايير القبول
- [ ] تمت مراجعة نتائج الاختبارات ذات الصلة ومخاطر التراجع الرئيسية
- [ ] يطابق \`documentation_impact\` تحديثات الوثائق الفعلية
- [ ] سُجلت concerns أو المسائل المفتوحة أو تم تأكيد عدم وجودها
- [ ] كُتب القرار النهائي في frontmatter الحقل \`decision\`

## Findings

- لا توجد؛ سجّل أي مشكلة هنا`;
            return this.withFrontmatter({
                feature: context.feature,
                created,
                status: 'pending_review',
                ...(context.workflowProfile === 'change'
                    ? {
                        reviewer_mode: 'current_ai',
                        decision: 'PENDING',
                    }
                    : {}),
            }, context.workflowProfile === 'change'
                ? this.copy(context.documentLanguage, changeZh, changeEn, changeJa, changeAr)
                : this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
}
exports.ExecutionTemplateBuilder = ExecutionTemplateBuilder;

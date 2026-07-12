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
                flags: context.flags,
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
                risk_level: 'pending',
                risk_flags: [],
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

- [ ] 完成实现
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

- [ ] Implement the change
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

- [ ] change を実装する
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

- [ ] نفّذ التغيير
- [ ] وحّد وثائق تخطيط المشروع مع حدود هذا change
- [ ] حدّث ملفات \`SKILL.md\` المتأثرة
- [ ] حدّث وثائق API / التصميم / التخطيط ذات الصلة
- [ ] أعد بناء \`SKILL.index.json\`
- [ ] نفّذ التحقق وحدّث \`verification.md\`
${optionalStepTasksAr}`.trim();
            return this.withFrontmatter({
                feature: context.feature,
                created,
                optional_steps: context.optionalSteps,
            }, this.copy(context.documentLanguage, zh, en, ja, ar));
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
                risk_level: 'pending',
                risk_flags: [],
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
            return this.withFrontmatter({
                feature: context.feature,
                created,
                status: context.placement === 'queued' ? 'queued' : 'verifying',
                optional_steps: context.optionalSteps,
                passed_optional_steps: [],
            }, this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
    generateTaskGraphTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        const taskGraph = {
            version: '1.0',
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
    generateSpecComplianceReviewTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        this.setReferenceDocumentContext(context.projectRoot, context.documentPath);
        try {
            const created = this.getCurrentDate();
            const zh = `## Review 目标

先确认实现是否符合 \`proposal.md\`、\`design.md\` 和 \`implementation-plan.md\`，再进入代码质量 review。

## 判定值

- \`APPROVED\`：符合规格，可以进入 code quality review
- \`APPROVED_WITH_CONCERNS\`：基本符合规格，但有需要 controller 接受的 concern
- \`NEEDS_CHANGES\`：实现偏离规格，需要返工
- \`BLOCKED\`：缺少判断所需上下文或证据
- \`PENDING\`：尚未 review

## Review 范围

- Proposal: \`proposal.md\`
- Design: \`design.md\`
- Implementation plan: \`implementation-plan.md\`
- Tasks: \`tasks.md\`
- Implementation evidence: 待补充

## Findings

- 待补充

## Checklist

- [ ] 已核对实现是否满足 proposal 的验收标准
- [ ] 已核对实现是否符合 design 的方案和边界
- [ ] 已核对实现是否覆盖 implementation-plan 的目标文件和验证口径
- [ ] 已记录所有偏离、concern 或 blocker
- [ ] 已把最终判定写入 frontmatter 的 \`decision\``;
            const en = `## Review Goal

Confirm the implementation matches \`proposal.md\`, \`design.md\`, and \`implementation-plan.md\` before code quality review begins.

## Decision Values

- \`APPROVED\`: spec-compliant and ready for code quality review
- \`APPROVED_WITH_CONCERNS\`: mostly compliant, with concerns for the controller to accept
- \`NEEDS_CHANGES\`: implementation deviates from the spec and needs rework
- \`BLOCKED\`: missing context or evidence needed for review
- \`PENDING\`: review has not run yet

## Review Scope

- Proposal: \`proposal.md\`
- Design: \`design.md\`
- Implementation plan: \`implementation-plan.md\`
- Tasks: \`tasks.md\`
- Implementation evidence: TBD

## Findings

- TBD

## Checklist

- [ ] Acceptance criteria from proposal are checked against the implementation
- [ ] Design approach and boundaries are checked against the implementation
- [ ] Implementation-plan target files and verification expectations are checked
- [ ] Deviations, concerns, or blockers are recorded
- [ ] Final decision is written to frontmatter \`decision\``;
            const ja = `## Review 目的

code quality review の前に、実装が \`proposal.md\`、\`design.md\`、\`implementation-plan.md\` に合っているか確認します。

## 判定値

- \`APPROVED\`: 仕様に適合し、code quality review に進める
- \`APPROVED_WITH_CONCERNS\`: 概ね適合しているが、controller が受け入れるべき concern がある
- \`NEEDS_CHANGES\`: 仕様から外れており、修正が必要
- \`BLOCKED\`: review に必要な文脈または証拠が不足している
- \`PENDING\`: まだ review していない

## Review 範囲

- Proposal: \`proposal.md\`
- Design: \`design.md\`
- Implementation plan: \`implementation-plan.md\`
- Tasks: \`tasks.md\`
- Implementation evidence: 未定

## Findings

- 未定

## Checklist

- [ ] proposal の受け入れ条件を実装と照合した
- [ ] design の方針と境界を実装と照合した
- [ ] implementation-plan の対象ファイルと検証条件を確認した
- [ ] 逸脱、concern、blocker を記録した
- [ ] 最終判定を frontmatter の \`decision\` に書いた`;
            const ar = `## هدف المراجعة

تأكد أولاً من أن التنفيذ يطابق \`proposal.md\` و\`design.md\` و\`implementation-plan.md\` قبل بدء مراجعة جودة الكود.

## قيم القرار

- \`APPROVED\`: مطابق للمواصفة وجاهز لمراجعة جودة الكود
- \`APPROVED_WITH_CONCERNS\`: مطابق غالباً، مع concerns يجب أن يقبلها controller
- \`NEEDS_CHANGES\`: التنفيذ ينحرف عن المواصفة ويحتاج إلى تعديل
- \`BLOCKED\`: تنقصه سياقات أو أدلة لازمة للمراجعة
- \`PENDING\`: لم تُنفذ المراجعة بعد

## نطاق المراجعة

- Proposal: \`proposal.md\`
- Design: \`design.md\`
- Implementation plan: \`implementation-plan.md\`
- Tasks: \`tasks.md\`
- Implementation evidence: قيد التحديد

## Findings

- قيد التحديد

## Checklist

- [ ] قورنت معايير القبول في proposal مع التنفيذ
- [ ] قورنت خطة design وحدوده مع التنفيذ
- [ ] فُحصت ملفات implementation-plan المستهدفة وتوقعات التحقق
- [ ] سُجلت أي انحرافات أو concerns أو blockers
- [ ] كُتب القرار النهائي في frontmatter الحقل \`decision\``;
            return this.withFrontmatter({
                feature: context.feature,
                created,
                status: context.placement === 'queued' ? 'queued' : 'pending_review',
                reviewer_role: 'spec_compliance_reviewer',
                decision: 'PENDING',
                optional_steps: context.optionalSteps,
            }, this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
    generateCodeQualityReviewTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        this.setReferenceDocumentContext(context.projectRoot, context.documentPath);
        try {
            const created = this.getCurrentDate();
            const zh = `## Review 目标

在 spec compliance review 通过后，检查代码质量、测试覆盖、可维护性和回归风险。

## 判定值

- \`APPROVED\`：质量可接受，可以进入最终验证
- \`APPROVED_WITH_CONCERNS\`：质量基本可接受，但有需要 controller 接受的 concern
- \`NEEDS_CHANGES\`：存在必须修复的问题
- \`BLOCKED\`：缺少判断所需上下文或验证证据
- \`PENDING\`：尚未 review

## Review 范围

- Changed files: 待补充
- Tests reviewed: 待补充
- TDD evidence: 待补充
- Verification evidence: 待补充

## Findings

- 待补充

## Checklist

- [ ] 已检查实现是否清晰、局部、可维护
- [ ] 已检查测试或验证证据是否覆盖关键路径
- [ ] 已检查明显回归、边界条件和错误处理
- [ ] 已记录必须修复项、concern 或 blocker
- [ ] 已把最终判定写入 frontmatter 的 \`decision\``;
            const en = `## Review Goal

After spec compliance review passes, check code quality, test coverage, maintainability, and regression risk.

## Decision Values

- \`APPROVED\`: quality is acceptable and ready for final verification
- \`APPROVED_WITH_CONCERNS\`: quality is mostly acceptable, with concerns for the controller to accept
- \`NEEDS_CHANGES\`: issues must be fixed
- \`BLOCKED\`: missing context or verification evidence needed for review
- \`PENDING\`: review has not run yet

## Review Scope

- Changed files: TBD
- Tests reviewed: TBD
- TDD evidence: TBD
- Verification evidence: TBD

## Findings

- TBD

## Checklist

- [ ] Implementation is clear, localized, and maintainable
- [ ] Tests or verification evidence cover the critical path
- [ ] Obvious regressions, edge cases, and error handling are checked
- [ ] Required fixes, concerns, or blockers are recorded
- [ ] Final decision is written to frontmatter \`decision\``;
            const ja = `## Review 目的

spec compliance review の通過後に、コード品質、テスト範囲、保守性、回帰リスクを確認します。

## 判定値

- \`APPROVED\`: 品質は受け入れ可能で、最終検証に進める
- \`APPROVED_WITH_CONCERNS\`: 概ね受け入れ可能だが、controller が受け入れるべき concern がある
- \`NEEDS_CHANGES\`: 修正必須の問題がある
- \`BLOCKED\`: review に必要な文脈または検証証拠が不足している
- \`PENDING\`: まだ review していない

## Review 範囲

- Changed files: 未定
- Tests reviewed: 未定
- TDD evidence: 未定
- Verification evidence: 未定

## Findings

- 未定

## Checklist

- [ ] 実装が明確で局所的かつ保守可能である
- [ ] テストまたは検証証拠が重要経路を覆っている
- [ ] 明らかな回帰、境界条件、エラー処理を確認した
- [ ] 必須修正、concern、blocker を記録した
- [ ] 最終判定を frontmatter の \`decision\` に書いた`;
            const ar = `## هدف المراجعة

بعد نجاح spec compliance review، افحص جودة الكود وتغطية الاختبارات وقابلية الصيانة ومخاطر التراجع.

## قيم القرار

- \`APPROVED\`: الجودة مقبولة وجاهزة للتحقق النهائي
- \`APPROVED_WITH_CONCERNS\`: الجودة مقبولة غالباً، مع concerns يجب أن يقبلها controller
- \`NEEDS_CHANGES\`: توجد مشاكل يجب إصلاحها
- \`BLOCKED\`: تنقصه سياقات أو أدلة تحقق لازمة للمراجعة
- \`PENDING\`: لم تُنفذ المراجعة بعد

## نطاق المراجعة

- Changed files: قيد التحديد
- Tests reviewed: قيد التحديد
- TDD evidence: قيد التحديد
- Verification evidence: قيد التحديد

## Findings

- قيد التحديد

## Checklist

- [ ] التنفيذ واضح ومحدود وقابل للصيانة
- [ ] الاختبارات أو أدلة التحقق تغطي المسار الأساسي
- [ ] فُحصت مخاطر التراجع الواضحة والحالات الحدية ومعالجة الأخطاء
- [ ] سُجلت الإصلاحات المطلوبة أو concerns أو blockers
- [ ] كُتب القرار النهائي في frontmatter الحقل \`decision\``;
            return this.withFrontmatter({
                feature: context.feature,
                created,
                status: context.placement === 'queued' ? 'queued' : 'pending_review',
                reviewer_role: 'code_quality_reviewer',
                decision: 'PENDING',
                optional_steps: context.optionalSteps,
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
            return this.withFrontmatter({
                feature: context.feature,
                created,
                status: 'pending_review',
            }, this.copy(context.documentLanguage, zh, en, ja, ar));
        }
        finally {
            this.clearReferenceDocumentContext();
        }
    }
}
exports.ExecutionTemplateBuilder = ExecutionTemplateBuilder;

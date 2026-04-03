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
    generateTasksTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
        const created = this.getCurrentDate();
        const projectDocs = context.projectContext.projectDocs ?? [];
        const moduleSkills = context.projectContext.moduleSkills ?? [];
        const optionalStepTasksZh = context.optionalSteps.length > 0
            ? context.optionalSteps
                .map((step, index) => `- [ ] ${index + 7}. 完成可选步骤 \`${step}\` 的文档和验证`)
                .join('\n')
            : '';
        const optionalStepTasksEn = context.optionalSteps.length > 0
            ? context.optionalSteps
                .map((step, index) => `- [ ] ${index + 7}. Finish docs and verification for optional step \`${step}\``)
                .join('\n')
            : '';
        const optionalStepTasksJa = context.optionalSteps.length > 0
            ? context.optionalSteps
                .map((step, index) => `- [ ] ${index + 7}. オプション手順 \`${step}\` の文書と検証を完了する`)
                .join('\n')
            : '';
        const optionalStepTasksAr = context.optionalSteps.length > 0
            ? context.optionalSteps
                .map((step, index) => `- [ ] ${index + 7}. أكمل التوثيق والتحقق للخطوة الاختيارية \`${step}\``)
                .join('\n')
            : '';
        const zh = `## 上下文引用

**项目文档：**
${this.formatReferenceList(projectDocs, '待补充')}

**模块技能：**
${this.formatReferenceList(moduleSkills, '待补充')}

## 任务清单

- [ ] 1. 完成实现
- [ ] 2. 对齐项目规划文档与本次 change 的边界
- [ ] 3. 更新涉及模块的 \`SKILL.md\`
- [ ] 4. 更新相关 API / 设计 / 计划文档
- [ ] 5. 重新生成 \`SKILL.index.json\`
- [ ] 6. 执行验证并更新 \`verification.md\`
${optionalStepTasksZh}`.trim();
        const en = `## Context References

**Project docs:**
${this.formatReferenceList(projectDocs, 'TBD')}

**Module skills:**
${this.formatReferenceList(moduleSkills, 'TBD')}

## Task Checklist

- [ ] 1. Implement the change
- [ ] 2. Align project planning docs with this change boundary
- [ ] 3. Update affected \`SKILL.md\` files
- [ ] 4. Update related API / design / planning docs
- [ ] 5. Rebuild \`SKILL.index.json\`
- [ ] 6. Run verification and update \`verification.md\`
${optionalStepTasksEn}`.trim();
        const ja = `## 参照コンテキスト

**プロジェクト文書:**
${this.formatReferenceList(projectDocs, '未定')}

**モジュール SKILL:**
${this.formatReferenceList(moduleSkills, '未定')}

## タスクチェックリスト

- [ ] 1. change を実装する
- [ ] 2. この change の境界に合わせてプロジェクト計画文書を揃える
- [ ] 3. 影響を受ける \`SKILL.md\` を更新する
- [ ] 4. 関連する API / 設計 / 計画文書を更新する
- [ ] 5. \`SKILL.index.json\` を再生成する
- [ ] 6. 検証を実行して \`verification.md\` を更新する
${optionalStepTasksJa}`.trim();
        const ar = `## مراجع السياق

**وثائق المشروع:**
${this.formatReferenceList(projectDocs, 'قيد التحديد')}

**ملفات SKILL للوحدات:**
${this.formatReferenceList(moduleSkills, 'قيد التحديد')}

## قائمة المهام

- [ ] 1. نفّذ التغيير
- [ ] 2. وحّد وثائق تخطيط المشروع مع حدود هذا change
- [ ] 3. حدّث ملفات \`SKILL.md\` المتأثرة
- [ ] 4. حدّث وثائق API / التصميم / التخطيط ذات الصلة
- [ ] 5. أعد بناء \`SKILL.index.json\`
- [ ] 6. نفّذ التحقق وحدّث \`verification.md\`
${optionalStepTasksAr}`.trim();
        return this.withFrontmatter({
            feature: context.feature,
            created,
            optional_steps: context.optionalSteps,
        }, this.copy(context.documentLanguage, zh, en, ja, ar));
    }
    generateVerificationTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
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
- [ ] 索引已重新生成
- [ ] spec-check 通过

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
- [ ] index rebuilt
- [ ] spec-check passed

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
- [ ] インデックスを再生成した
- [ ] spec-check が通過した

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
- [ ] أُعيد بناء الفهرس
- [ ] نجح spec-check

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
    generateReviewTemplate(input) {
        const context = this.inputs.normalizeFeatureTemplateInput(input);
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
}
exports.ExecutionTemplateBuilder = ExecutionTemplateBuilder;
//# sourceMappingURL=ExecutionTemplateBuilder.js.map

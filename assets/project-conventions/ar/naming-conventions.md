---
name: project-naming-conventions
title: اتفاقيات تسمية المشروع
tags: [conventions, naming, ospec]
---

# اتفاقيات التسمية

## الهدف

هذا الملف هو النسخة المعتمدة داخل المشروع من مواصفة OSpec الأم. وهو يثبت قواعد التسمية داخل المشروع حتى لا يخترع الذكاء الاصطناعي أو البشر أنماط تسمية عشوائية.

## القواعد الأساسية

- تستخدم أسماء الأدلة والوحدات وchanges صيغة kebab-case الصغيرة
- تستخدم flags وoptional steps صيغة snake_case الصغيرة
- تحتفظ ملفات بروتوكول workflow بأسمائها الثابتة
- تستخدم وثائق API أسماء semantic بصيغة kebab-case

## أسماء change

- استخدم `changes/active/<change-name>/`
- مثال: `add-token-refresh`
- تجنب التواريخ والمسافات والأحرف الكبيرة والتسميات غير الدلالية

## أسماء الوحدات

- تستخدم أدلة الوحدات أسماء إنجليزية دلالية
- مثال: `src/modules/auth`, `src/modules/content`
- تحتفظ كل وحدة بملف `SKILL.md` في جذرها

## أسماء الوثائق

- وثائق المشروع في `docs/project/`
- وثائق التصميم في `docs/design/`
- وثائق التخطيط في `docs/planning/`
- وثائق API في `docs/api/`

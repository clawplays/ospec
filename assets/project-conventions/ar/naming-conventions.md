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
- وثائق الميزات الحية في `docs/features/`

## أسماء slug الميزات

- تستخدم slugs الميزات صيغة kebab-case صغيرة وتطابق `^[a-z0-9]+(-[a-z0-9]+)*$`
- الـ slug فريد على مستوى المشروع كله، والتكرار يُفشل `ospec index build` ويسمي الموقعين معاً
- يُعلن الـ slug داخل القسم: في أول سطر غير فارغ تحت عنوان `##` داخل `docs/features/<domain>.md` بالشكل `<!-- ospec:feature <slug> code:src/a/,src/b/ -->`
- سمِّ السلوك لا الـ change: `login-timeout` وليس `fix-login-bug-2026`
- القسم بلا إعلان ليس ميزة ببساطة، وهذا مسموح

## ملفات البروتوكول الثابتة

- `proposal.md`
- `tasks.md`
- `state.json`
- `verification.md`
- `review.md`

## متطلبات التنفيذ

- راجع هذا الملف قبل إضافة أي دليل أو وحدة أو change أو flag جديد في workflow
- إذا انحرف التنفيذ عن هذا الملف، فأعِد الكود والوثائق إلى التوافق أولاً


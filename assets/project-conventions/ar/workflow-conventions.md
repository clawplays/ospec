---
name: project-workflow-conventions
title: اتفاقيات تنفيذ workflow
tags: [conventions, workflow, change, ospec]
---

# اتفاقيات تنفيذ workflow

## الهدف

تثبت هذه الوثيقة مسار تنفيذ OSpec داخل المشروع حتى تنتقل المتطلبات عبر planning وimplementation وverification وarchive مع بوابات متسقة.

## الترتيب القياسي

1. توضيح سياق المشروع ونطاق التأثير
2. إنشاء `proposal.md` أو تحديثه
3. إنشاء `tasks.md` أو تحديثه
4. دفع التنفيذ وفق `state.json`
5. تحديث `SKILL.md` ذي الصلة
6. إعادة بناء `SKILL.index.json`
7. إكمال `verification.md`
8. الأرشفة فقط بعد اجتياز جميع البوابات

## قيود الحالة

- استخدم `state.json` كمصدر الحقيقة لحالة التنفيذ
- لا يستبدل `verification.md` ملف `state.json`
- إذا اختلفت ملفات الحالة وملفات التنفيذ، أصلح الحالة أولاً

## لغة الوثائق

- حافظ على `proposal.md` و`tasks.md` و`verification.md` و`review.md` باللغة المعتمدة للمشروع
- قد تختلف لغة واجهة المنتج عن لغة وثائق OSpec الخاصة بالchange؛ لا تستنتج إحداهما من الأخرى
- إذا أُنشىء change بالصينية، فاستمر بالصينية ما لم تتطلب قواعد المشروع التحويل إلى الإنجليزية صراحةً

## optional steps

- يتم التحكم في تفعيل optional steps عبر `.skillrc.workflow`
- يجب أن تبقى proposal flags متوافقة مع إعدادات workflow
- يجب أن تظهر optional steps المفعلة في `tasks.md` و`verification.md`

## Plugin Gates

- يتم التحكم في قدرات الإضافات عبر `.skillrc.plugins`
- عند التعامل مع تثبيت Stitch أو Checkpoint أو تبديل provider أو إصلاح doctor أو إعداد MCP أو المصادقة أو تفعيل الإضافة، يجب قراءة مواصفة الإضافة المحلية المطابقة للغة الوثائق المعتمدة للمشروع أولاً
- لا يتم الرجوع إلى ملف مواصفة بلغة أخرى إلا إذا كان الملف المحلي لتلك اللغة غير موجود

# تطوير الإضافات

يجب أن تحتوي كل حزمة إضافة رسمية لـ OSpec على:

- `package.json` مع `ospecPlugin`
- وثائق مترجمة إلى `en-US` و `zh-CN` و `ja-JP` و `ar`
- مجلد `skills/` اختياري
- مجلد `knowledge/` اختياري
- أصول `scaffold/` يتم نسخها إلى `.ospec/plugins/<id>/`
- runtime hooks معلنة في `ospecPlugin.hooks`

## قواعد البيانات الوصفية

- يجب أن يطابق `ospecPlugin.id` اسم المجلد `plugins/<id>/`
- يجب أن يكون اسم الحزمة `@clawplays/ospec-plugin-<id>`
- أسماء capability هي معرفات ثابتة
- أسماء step هي معرفات optional step المواجهة للـ workflow

## قواعد runtime

- يجب أن تُخرج runtime hooks بيانات JSON
- يقرأ OSpec مخرجات hook ثم يكتب `gate.json` و `result.json` و `summary.md`
- يجب أن تنتهي الخطوات الحاجبة بحالة `passed` أو `approved`

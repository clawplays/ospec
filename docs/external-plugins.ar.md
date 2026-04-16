# الإضافات الخارجية

يدعم OSpec الإضافات الخارجية التي يتم تثبيتها عبر npm.

## تدفق الاستخدام

1. استخدم `ospec plugins list` لاكتشاف الإضافات
2. استخدم `ospec plugins info <id>` لعرض التفاصيل
3. استخدم `ospec plugins install <id>` للتثبيت العام
4. استخدم `ospec plugins enable <id> <project-path>` لتفعيلها داخل المشروع
5. استخدم `ospec plugins doctor <id> <project-path>` للتحقق
6. استخدم `ospec plugins run <id> <change-path>` للتشغيل
7. استخدم `ospec plugins update <id>` لتحديث إضافة واحدة مثبتة
8. استخدم `ospec plugins update --all` لتحديث كل الإضافات المثبتة

## نطاق التحديث

- `ospec update [path]` يعمل على نطاق المشروع ويحدّث فقط الإضافات المفعلة داخل ذلك المشروع
- `ospec plugins update --all` يعمل على نطاق الجهاز ويحدّث كل الإضافات المثبتة المسجلة لدى OSpec
- إذا كانت حزمة إضافة مثبتة قد حُذفت يدويا، فإن `ospec plugins update --all` يحاول استعادتها قبل الترقية
- يجب على مسارات AI / `/ospec` تشغيل `ospec plugins update --all` فقط عندما يطلب المستخدم صراحة تحديث جميع الإضافات المثبتة

## نموذج الحزمة

- يتم توزيع الإضافات كحزم npm
- تستخدم الحزم الاسم `@clawplays/ospec-plugin-<id>`
- تبقى أداة CLI الرئيسية في `@clawplays/ospec-cli`
- كل الإضافات الرسمية أصبحت حزم npm يتم تثبيتها خارجياً وليست مدمجة داخل CLI نفسه
- يكتشف CLI الإضافات الرسمية أولاً من لقطة `assets/plugins/registry.json` المضمنة معه
- وعند توفرها، يقوم CLI أيضاً بجلب أحدث بيانات الإضافات الرسمية من `plugins/registry.json` المنشور عبر `clawplays/ospec`
- تصبح الإضافات الرسمية الجديدة قابلة للاكتشاف من قبل نسخ CLI الحالية فور تحديث لقطة الـ registry العامة هذه، من دون انتظار إصدار npm جديد للـ CLI الرئيسي

## نموذج الأصول

- `runtime`: منطق تنفيذ أو مراجعة قابل للتشغيل
- `skill`: حزم توجيه لـ Codex و Claude
- `knowledge`: وثائق أو أصول جاهزة مستقبلاً لـ RAG

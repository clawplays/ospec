# نشر الإضافات

يتم نشر الحزم الرسمية للإضافات عبر تدفق النشر الرسمي للإضافات وبشكل منفصل عن تدفق نشر حزمة CLI الرئيسية.

## نموذج الأتمتة الموصى به

بالنسبة للإضافات الرسمية، النموذج الموصى به على المدى الطويل هو:

1. استخدام `.github/workflows/publish-plugin.yml` كمسار مشترك
2. ضبط `NPM_TOKEN` واحد قابل لإعادة الاستخدام داخل `clawplays/ospec-src`
3. نشر كل الإضافات عبر نفس الـ workflow

هذا هو المسار العملي الوحيد للأتمتة الكاملة عند النشر الأول لإضافة جديدة، لأن npm Trusted Publishing يُضبط عادةً لكل حزمة بعد أن تصبح الحزمة موجودة فعلاً.

يبقي الـ workflow أيضاً على `id-token: write` حتى تتمكن الحزم الموجودة لاحقاً من استخدام npm OIDC trust إذا أردتم ذلك، لكن المسار القياسي لإصدارات الإضافات يجب أن يفترض أن `NPM_TOKEN` هو قناة الأتمتة الأساسية.

## إعداد GitHub Actions

1. أنشئ granular npm token لنطاق `@clawplays` بحيث يكون:
   - `Read and write`
   - مع تفعيل `bypass 2FA`
   - ويغطي الإضافات الرسمية المستقبلية
2. أضف هذا token كـ GitHub secret باسم `NPM_TOKEN`
3. حافظ على صحة بيانات حزمة الإضافة:
   - `name`
   - `version`
   - `repository`
   - `homepage`
   - `bugs`
4. تأكد من دمج تغييرات الـ workflow إلى `main`

إذا كان مستودع المصدر private، فسيقوم الـ workflow بالنشر تلقائياً من دون `--provenance` لأن npm provenance يتطلب حالياً مستودع GitHub عاماً.

## التدفق المحلي

1. حدّث `plugins/<id>/`
2. شغّل `npm run plugins:check -- --plugin <id>`
3. شغّل اختيارياً `npm run plugins:pack -- --plugin <id>` لمراجعة محتوى الحزمة
4. أنشئ الوسم `plugin-<id>@<version>`
5. انشر عبر الـ workflow الرسمي للإضافات أو باستخدام `npm run plugins:publish -- --plugin <id>`

## تدفق GitHub Actions

1. ادفع تغييرات الإضافة إلى المستودع
2. ادفع وسمًا بالصيغة `plugin-<id>@<version>`
3. سيتحقق GitHub Actions من بيانات الإضافة ثم ينشر الحزمة إلى npm
4. يدعم نفس الـ workflow أيضاً `workflow_dispatch` لإعادة التشغيل اليدوي

يمكن تمرير القيم التالية مع `workflow_dispatch`:

- `plugin_id`
- `expected_version` (اختياري)
- `ref` (اختياري)

## عند إضافة Plugin رسمي جديد

1. أنشئ `plugins/<id>/package.json`
2. أضف الإدخال إلى `plugins/catalog.json`
3. شغّل `npm run plugins:sync`
4. شغّل `npm run plugins:check -- --plugin <id>`
5. شغّل اختيارياً `npm run plugins:pack -- --plugin <id>` لمراجعة الحزمة
6. ادمج التغيير إلى `main`
7. انشر الإصدار الأول عبر الـ workflow المشترك باستخدام `NPM_TOKEN`
8. أبقِ لقطة plugin registry العامة في `clawplays/ospec/plugins/registry.json` متزامنة حتى تتمكن نسخ CLI الحالية من اكتشاف الإضافة الرسمية الجديدة من دون انتظار إصدار npm جديد للـ CLI الرئيسي

ما دامت الإضافة تتبع هيكل `plugins/<id>` ونمط الوسوم `plugin-<id>@<version>` فلن تحتاج إلى أي تعديل إضافي على الـ workflow.

## حدود الحزمة الرئيسية

- تحتفظ `@clawplays/ospec-cli` بمسار نشر الحزمة الرئيسية الحالي
- تبقى شجرة مصادر الإضافات خارج export الخاص بـ release repo
- لكن `plugins/registry.json` يُنشر الآن داخل release repo العام حتى يمكن تحديث بيانات الإضافات الرسمية بشكل مستقل عن نشر حزم الإضافات نفسها

# بروتوكول Classic Change

استخدم هذا البروتوكول المختصر عندما يختار المستخدم OSpec change. اختيار profile للمستخدم؛ لا ترقِّ change تلقائياً إلى Goal ولا ترفضها أو تستبدلها بسبب التعقيد أو flags أو عدد الملفات أو حجم الدفعة.

## السياق

في البداية اقرأ `.skillrc` والعناصر ذات الصلة من `SKILL.index.json` و`proposal.md` و`tasks.md` و`state.json` فقط. اقرأ `verification.md` عند التحقق و`review.md` عند closeout. اقرأ `ai-guide.md` أو `execution-protocol.md` الكامل فقط عند غياب هذا الملف أو تفعيل plugin حاجب أو وجود قاعدة محددة غامضة.

## دورة الحياة

1. أنشئ العمل الجديد عبر `ospec change <change-name> [path]`، ويبقى `ospec new` alias للتوافق.
2. إذا وُجد active change مطابق فتابعه ولا تنشئ نسخة مكررة.
3. تدخل تغييرات batch إلى queue وتُنفذ بالتتابع في worktree المشترك. يجب استخدام worktree تسلسلياً: يُحظر الإغلاق (verify/finalize/archive) عند وجود ملفات غير مودعة خارج نطاق `affects` وعقد التوثيق في proposal، لذا أودع أو خزّن أو اعزل التغييرات غير المنسوبة، وصرّح بـ `affects` بصدق، ولا تدع تعديلات جلسة متزامنة تنزلق إلى الأرشيف.
4. حافظ فقط على `proposal.md` و`tasks.md` و`state.json` و`verification.md` و`review.md`، ولا تنشئ design أو plan أو task graph أو worker أو review provenance artifacts الخاصة بـ Goal.
5. شغّل فحوص المشروع المرتبطة فعلاً بالتغيير وسجّل الأوامر والنتائج في `verification.md`، ولا تفرض build أو lint أو test أو TDD أو debug غير ذي صلة.
6. ينفذ AI الحالي مراجعة خفيفة واحدة. يمكن إغلاق `APPROVED` و`APPROVED_WITH_CONCERNS` تلقائياً، بينما توقف `PENDING` و`NEEDS_CHANGES` و`BLOCKED` الإغلاق.
7. شغّل `ospec verify` عند الحاجة إلى preview صريح. بعد اكتمال التنفيذ والتحقق وسياسة الوثائق وplugin gates والمراجعة، شغّل `ospec finalize` فوراً لمزامنة classic state والأرشفة بشكل ذري.

## سياسة الوثائق

اضبط `change_type` على `bugfix` أو `feature` أو `maintenance` أو `docs`، واضبط `documentation_impact` على `none` أو `required`.

- يمكن للـ bugfix استخدام `none` مع `documentation_reason` واضح، إلا إذا غيّر سلوك المستخدم أو API أو عقد التشغيل.
- يجب أن تستخدم feature أو docs change القيمة `required` وأن تسجل وثيقة مشروع أو module أو API أو user حقيقية واحدة على الأقل في `documentation_updates`.
- لا يُحتسب ملخص `docs/project/changes/...` المولد تلقائياً كوثائق feature.
- حدّث `SKILL.md` فقط عند تغير قواعد module أو تعليمات AI أو عقود الاستخدام.
- يعاد بناء `SKILL.index.json` تلقائياً بعد archive وليس task يدوية.

توقف فقط لقرار مستخدم حقيقي أو فشل تحقق أو review غير محلولة أو plugin gate حاجب أو pause صريح.

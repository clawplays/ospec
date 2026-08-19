---
name: project-ai-guide
title: دليل الذكاء الاصطناعي
tags: [ai, guide, ospec]
---

# دليل الذكاء الاصطناعي

## ما هذه الوثيقة

هي مدخل التوجيه إلى القواعد المعتمدة داخل المشروع، المنسوخة من مواصفة OSpec الأم. اتبع القواعد المعتمدة تحت `for-ai/` بدلاً من الارتجال انطلاقاً من المستودع الأم؛ وعند الاختلاف عن المواصفة الأم تكون الأولوية للقواعد المعتمدة داخل المشروع. هذه الوثيقة موجِّه: كل قاعدة تسميها مذكورة كاملة في وثيقة البروتوكول الخاصة بـ profile الذي تعمل به، وهي لا ترسلك أبداً إلى وثيقة يمنعها مسارك.

## من يقرأ ماذا

- **classic change** (`workflow_profile_id: change`، `ospec change` / `ospec-change`): اقرأ `for-ai/change-protocol.md`. هو التدفق كاملاً — `proposal.md` و`tasks.md` والتنفيذ و`verification.md` و`review.md` و`state.json` — ويبقى كذلك بغض النظر عن التعقيد أو flags أو عدد الملفات أو المخاطر أو حجم الدفعة. ولا تقرأ ولا تشغّل طبقة التحكم `ospec execute …`.
- **Goal** (`workflow_profile_id: goal`، `ospec goal` / `ospec-goal`، وأي عمل عبر `ospec execute …` / `ospec loop …`): مهارة `ospec-goal` تحمل القواعد التشغيلية — session brief والتصميم والخطة وtask graph وdispatch وlaunch وreview والأدلة والإغلاق وبوابات الأرشفة. أما `for-ai/execution-protocol.md` فهو التفصيل الموثوق خلفها؛ افتحه عندما تحتاج حالة محددة بالاسم إلى ذلك التفصيل، لا كخطوة من خطوات الدخول إلى الطبقة.
- **قواعد المشروع**، تُحمَّل عند الحاجة لا مسبقاً: `for-ai/naming-conventions.md` و`for-ai/skill-conventions.md` و`for-ai/workflow-conventions.md` و`for-ai/development-guide.md`.

## ترتيب العمل

1. اقرأ `.skillrc` للتعرف على البنية ولغة الوثائق وسياسة سير العمل وmodel profiles.
2. وجّه بحثك عبر `ospec index query <كلمات...>`. ولا تقرأ `SKILL.index.json` كاملاً أبداً لأنه ينمو بلا حد مع أرشفة التغييرات.
3. اقرأ session brief أو bootstrap أو dispatch أو review أو repair packet الحالي، ثم افتح فقط change artifacts والملفات المستهدفة والوثائق المفهرسة التي سمّاها ذلك packet.
4. اتبع المهارة الموافقة للـ profile الحالي. ولا تفتح وثيقة البروتوكول المذكورة أعلاه إلا عندما تحتاج حالة محددة بالاسم إلى التفصيل خلف قاعدة ما.

اكتب كل وثيقة change وbrainstorm تنشئها بلغة وثائق المشروع (`documentLanguage` في `.skillrc`)، ولا تستنتجها من نصوص المنتج أو لغة الموقع أو متطلب «English-first»، ولا تخلط اللغات داخل change واحد.

هناك عقدان يحتاجهما كل profile — سلّم بوابات القرار والأرشفة القسرية — وهما مذكوران كاملين في الوثيقة التي يقرأها مسارك أصلاً، فاقرأهما هناك فقط: `for-ai/change-protocol.md` لـ classic change، و`for-ai/execution-protocol.md` للـ goal. تتطلب الأرشفة القسرية دائماً قبولاً صريحاً من المستخدم ولا تحدث تلقائياً أبداً.

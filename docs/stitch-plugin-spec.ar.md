# وثيقة مواصفات إضافة Stitch

توضح هذه الوثيقة أولاً كيفية استخدام المستخدمين لـ `stitch` ، تليها المواصفات الفنية التفصيلية.

## نظرة عامة

تُستخدم `stitch` لمراجعة تصميم الصفحات والتعاون في المعاينة.

السيناريوهات المناسبة:

- صفحات الهبوط، صفحات التسويق، صفحات الأنشطة
- متطلبات الصفحات ذات التغييرات الكبيرة في واجهة المستخدم
- التغييرات التي تتطلب معاينة التصميم قبل تحديد ما إذا كان سيتم الاستمرار في التطوير

وظائفها الأساسية هي:

- توليد أو تقديم معاينات الصفحة
- انتظار الموافقة اليدوية
- منع `verify / archive / finalize` قبل الموافقة

## كيفية تفعيل الإضافة

عبر محادثة الذكاء الاصطناعي:

<pre dir="rtl" lang="ar"><code>استخدم <span dir="ltr">OSpec</span> لمساعدتي في فتح إضافة <span dir="ltr">Stitch</span>.</code></pre>

عبر المهارة (Skill):

<pre dir="rtl" lang="ar"><code>استخدم <span dir="ltr">$ospec</span> لمساعدتي في فتح إضافة <span dir="ltr">Stitch</span>.</code></pre>

عبر سطر الأوامر:

```bash
ospec plugins enable stitch .
```

## ماذا تحتاج لتكوينه بعد الفتح

بعد تمكين `stitch` ، عادة ما تحتاج إلى إكمال هذه الأمور الثلاثة:

1. اختيار المزود (provider)
2. تكوين مصادقة Stitch
3. تشغيل فحص التشخيص (doctor) للتأكد من جاهزية الجهاز المحلي والمشروع

### 1. اختيار المزود

المزود الافتراضي هو `gemini` ، ولكن يمكن التبديل إلى `codex` .

معظم المستخدمين لا يحتاجون لتغيير المشغل (runner)؛ فقط تأكد من المزود المستخدم في `.skillrc.plugins.stitch.provider` .

### 2. تكوين مصادقة Stitch

إذا كنت تستخدم `gemini` :

- قم بتكوين `stitch` MCP في `~/.gemini/settings.json` 
- أضف `X-Goog-Api-Key` 

مثال:

```json
{
  "mcpServers": {
    "stitch": {
      "httpUrl": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "your-stitch-api-key"
      }
    }
  }
}
```

إذا كنت تستخدم `codex` :

- قم بتكوين `stitch` MCP في `~/.codex/config.toml` 
- يتطلب أيضاً `X-Goog-Api-Key` 

مثال:

```toml
[mcp_servers.stitch]
type = "http"
url = "https://stitch.googleapis.com/mcp"
headers = { X-Goog-Api-Key = "your-stitch-api-key" }

[mcp_servers.stitch.http_headers]
X-Goog-Api-Key = "your-stitch-api-key"
```

### 3. تشغيل فحص التشخيص

```bash
ospec plugins doctor stitch .
```

يتحقق هذا الأمر من:

- تمكين الإضافة
- تكوين المزود
- توفر CLI المحلي
- جاهزية Stitch MCP والمصادقة

## ماذا سيتم إنتاجه بعد الفتح

بعد التمكين، تظهر هذه العناصر المتعلقة بـ Stitch في المشروع:

- `.skillrc.plugins.stitch`
- `.ospec/plugins/stitch/project.json`
- `.ospec/plugins/stitch/exports/`
- `.ospec/plugins/stitch/baselines/`
- `.ospec/plugins/stitch/cache/`

توضع مخرجات الموافقة المرتبطة بتغيير معين في:

- `changes/active/<change>/artifacts/stitch/`

## سير العمل الموصى به

1. تهيئة المشروع: `ospec init .`
2. فتح Stitch: `ospec plugins enable stitch .`
3. تكوين المزود والمصادقة: `ospec plugins doctor stitch .`
4. إنشاء تغيير في واجهة المستخدم
5. تشغيل Stitch: `ospec plugins run stitch <change-path>`
6. إرسال `preview_url` المولد للمراجع
7. بعد الموافقة، نفذ: `ospec plugins approve stitch <change-path>`
8. تابع باستخدام `ospec verify` و `ospec finalize`

## متى تستخدم هذه الإضافة

يوصى بها لهذه الأنواع من التغييرات:

- `ui_change`
- `page_design`
- `feature_flow`
- `api_change`
- `backend_change`
- `integration_change`

## المواصفات الفنية التفصيلية

تحدد هذه الوثيقة الأهداف وعقود التشغيل وحدود التنفيذ لإضافة `stitch` في OSpec.

## 1. الخلفية

في تسليم المشاريع، يتطلب تطوير الصفحات غالباً مراجعة يدوية. توفر `stitch` الجسر لهذه العملية، مما يضمن طلب الموافقة اليدوية قبل أرشفة التغيير.

## 2. القرارات المؤكدة

1. اسم هذه الإضافة هو `stitch` .
2. المزود الافتراضي هو `gemini` .
3. يمكن للتغييرات تفعيل الخطوة الاختيارية `stitch_design_review` .
4. تستخدم `stitch` مساحة عمل على مستوى المشروع: `.ospec/plugins/stitch/` .
5. تُخزن آثار البوابة في `changes/active/<change>/artifacts/stitch/` .
6. تحترم أوامر `verify / archive / finalize` بوابة `stitch` .

## 6. اتفاقية هيكل الدليل

- تكوين المشروع: `.skillrc.plugins.stitch`
- مساحة عمل المشروع: `.ospec/plugins/stitch/`
- مخرجات التغيير: `changes/active/<change>/artifacts/stitch/`

### 6.1 دليل عمل `stitch` على مستوى المشروع

```text
.ospec/plugins/stitch/
  project.json
  exports/
  baselines/
  cache/
```

- `project.json`: معرف مشروع Stitch وتكوينه.
- `exports/`: لقطات الشاشة المصدرة أو ملفات التصميم للمقارنة.
- `baselines/`: أسس التصميم المرجعية.
- `cache/`: ذاكرة تخزين مؤقت للبيانات الوسيطة.

### 6.2 دليل مخرجات التغيير لـ `stitch` 

```text
changes/active/<change>/artifacts/stitch/
  approval.json
  summary.md
  result.json
```

- `approval.json`: حالة الموافقة (`pending`, `approved`, `rejected`).
- `summary.md`: ملخص المراجعة للقراءة البشرية.
- `result.json`: نتيجة التنفيذ المهيكلة بما في ذلك `preview_url` .

## 14. أوامر CLI

- `ospec plugins status`
- `ospec plugins enable stitch`
- `ospec plugins doctor stitch`
- `ospec plugins run stitch <change-path>`
- `ospec plugins approve stitch <change-path>`
- `ospec plugins reject stitch <change-path>`

## 17. مواصفات جسر وقت التشغيل (Runtime Bridge)

يطبق الإصدار الحالي جسر وقت تشغيل Stitch بالاتفاقيات التالية:

### 17.1 تكوين المشروع

دعم مدمج لمسارات `Gemini CLI + stitch MCP` أو `Codex CLI + stitch MCP` .

تكوين المشغل الافتراضي (إذا لم يتم تجاوزه):

```json
{
  "mode": "command",
  "command": "node",
  "args": [
    "${ospec_package_path}/dist/adapters/gemini-stitch-adapter.js",
    "--change",
    "{change_path}",
    "--project",
    "{project_path}"
  ],
  "cwd": "{project_path}",
  "timeout_ms": 900000
}
```

### 17.1.1 اختيار المزود

اختر بين `gemini` و `codex` في `.skillrc.plugins.stitch.provider` .

### 17.6 مخرجات التنفيذ

يحتوي `result.json` على:

- طابع وقت التنفيذ
- أمر المشغل والمعلمات
- `preview_url` المحلل
- `screen_mapping` للمقارنة البصرية

### 17.7 التعاون مع Checkpoint

إذا كانت `checkpoint` مفعلة أيضاً وكانت `checkpoint_ui_review` نشطة:

1. يجب أن تصدر `stitch` لقطات شاشة قابلة للمقارنة إلى `.ospec/plugins/stitch/exports/` .
2. يجب أن يربط `result.json` هذه الصادرات بالمسارات/السمات.
3. بدون هذه الصادرات، لا يمكن لـ `checkpoint` إجراء فحوصات آلية لاتساق البصري.

## 18. الغرض من التنفيذ

عند تنفيذ أو توسيع إضافة Stitch ، اتبع هذه الوثيقة لضمان الحفاظ على الحدود وعدم فقدان تفاصيل التصميم عبر جولات الحوار.

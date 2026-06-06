/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, computed } from "vue";
import { createSource, checkDuplicateSource } from "@/lib/api";
import { useToast } from "@/composables/useToast";
import SourceVerifyDialog from "@/components/SourceVerifyDialog.vue";
const props = defineProps();
const emit = defineEmits();
const toast = useToast();
const sourceType = ref("rss");
const sourceIdentity = ref("");
const displayName = ref("");
const domainTags = ref([]);
const sourceRole = ref("official");
const contentTopics = ref([]);
const attentionLevel = ref("regular");
const notes = ref("");
const submitting = ref(false);
const showVerify = ref(false);
// 可用性状态控制：身份字段的可编辑性
// 创建阶段始终可编辑
const identityEditable = computed(() => true);
const DOMAIN_TAG_OPTIONS = [
    { value: "AI", label: "AI" },
    { value: "财经", label: "财经" },
    { value: "开源", label: "开源" },
    { value: "科技", label: "科技" },
    { value: "其他", label: "其他" },
];
const ROLE_OPTIONS = [
    { value: "official", label: "官方" },
    { value: "media", label: "媒体" },
    { value: "kol", label: "KOL" },
    { value: "community", label: "社区" },
    { value: "paper_institute", label: "论文机构" },
    { value: "other", label: "其他" },
];
const ATTENTION_OPTIONS = [
    { value: "core", label: "核心" },
    { value: "regular", label: "常规" },
    { value: "observe", label: "观察" },
];
function toggleDomainTag(tag) {
    if (domainTags.value.includes(tag)) {
        domainTags.value = domainTags.value.filter(t => t !== tag);
    }
    else {
        domainTags.value = [...domainTags.value, tag];
    }
}
async function doSubmit() {
    if (!sourceIdentity.value.trim()) {
        toast.error("请输入来源身份");
        return;
    }
    if (!displayName.value.trim()) {
        toast.error("请输入展示名称");
        return;
    }
    if (domainTags.value.length === 0) {
        toast.error("请选择至少一个领域标签");
        return;
    }
    // 去重检查
    try {
        const dup = await checkDuplicateSource({
            type: sourceType.value,
            source_identity: sourceIdentity.value.trim(),
        });
        if (dup.is_duplicate) {
            toast.error("该来源已存在，请勿重复创建");
            return;
        }
    }
    catch { /* 检查失败不阻塞创建 */ }
    submitting.value = true;
    try {
        const source = await createSource({
            type: sourceType.value,
            source_identity: sourceIdentity.value.trim(),
            display_name: displayName.value.trim(),
            domain_tags: domainTags.value,
            source_role: sourceRole.value,
            content_topics: contentTopics.value,
            attention_level: attentionLevel.value,
            notes: notes.value.trim() || undefined,
        });
        toast.success("信息源已创建");
        emit("created", source.id);
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
    }
    finally {
        submitting.value = false;
    }
}
function onVerified(result) {
    showVerify.value = false;
    // 验证成功后可以自动填充展示名称
    if (!displayName.value && result.account_name) {
        displayName.value = result.account_name;
    }
    if (!displayName.value && result.site_title) {
        displayName.value = result.site_title;
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['option-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['option-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['textarea']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "create-form" },
});
/** @type {__VLS_StyleScopedClasses['create-form']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "form-title" },
});
/** @type {__VLS_StyleScopedClasses['form-title']} */ ;
(__VLS_ctx.entryPoint === 'library' ? '新建信息源' : '添加信息源');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-row" },
});
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-label" },
});
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.sourceType),
    ...{ class: "select" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['select']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "rss",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "x_twitter",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-label" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ class: "input" },
    placeholder: (__VLS_ctx.sourceType === 'x_twitter' ? 'X 用户名 (如 @OpenAI)' : 'RSS URL'),
    disabled: (!__VLS_ctx.identityEditable),
});
(__VLS_ctx.sourceIdentity);
/** @type {__VLS_StyleScopedClasses['input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-row" },
});
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-label" },
    ...{ style: {} },
});
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ class: "input" },
    placeholder: "显示在页面上的名称",
});
(__VLS_ctx.displayName);
/** @type {__VLS_StyleScopedClasses['input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showVerify = true;
            // @ts-ignore
            [entryPoint, sourceType, sourceType, identityEditable, sourceIdentity, displayName, showVerify,];
        } },
    ...{ class: "btn verify-btn" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['verify-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-group" },
});
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "form-label-text" },
});
/** @type {__VLS_StyleScopedClasses['form-label-text']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "pill-options" },
});
/** @type {__VLS_StyleScopedClasses['pill-options']} */ ;
for (const [opt] of __VLS_vFor((__VLS_ctx.DOMAIN_TAG_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleDomainTag(opt.value);
                // @ts-ignore
                [DOMAIN_TAG_OPTIONS, toggleDomainTag,];
            } },
        key: (opt.value),
        ...{ class: "option-pill" },
        ...{ class: ({ active: __VLS_ctx.domainTags.includes(opt.value) }) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['option-pill']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (opt.label);
    // @ts-ignore
    [domainTags,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-group" },
});
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "form-label-text" },
});
/** @type {__VLS_StyleScopedClasses['form-label-text']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "pill-options" },
});
/** @type {__VLS_StyleScopedClasses['pill-options']} */ ;
for (const [opt] of __VLS_vFor((__VLS_ctx.ROLE_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.sourceRole = opt.value;
                // @ts-ignore
                [ROLE_OPTIONS, sourceRole,];
            } },
        key: (opt.value),
        ...{ class: "option-pill" },
        ...{ class: ({ active: __VLS_ctx.sourceRole === opt.value }) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['option-pill']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (opt.label);
    // @ts-ignore
    [sourceRole,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-group" },
});
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "form-label-text" },
});
/** @type {__VLS_StyleScopedClasses['form-label-text']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "pill-options" },
});
/** @type {__VLS_StyleScopedClasses['pill-options']} */ ;
for (const [opt] of __VLS_vFor((__VLS_ctx.ATTENTION_OPTIONS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.attentionLevel = opt.value;
                // @ts-ignore
                [ATTENTION_OPTIONS, attentionLevel,];
            } },
        key: (opt.value),
        ...{ class: "option-pill" },
        ...{ class: ({ active: __VLS_ctx.attentionLevel === opt.value }) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['option-pill']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (opt.label);
    // @ts-ignore
    [attentionLevel,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-group" },
});
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "form-label-text" },
});
/** @type {__VLS_StyleScopedClasses['form-label-text']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "free-input-row" },
});
/** @type {__VLS_StyleScopedClasses['free-input-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onKeydown: ((e) => {
            const v = e.target.value.trim();
            if (v && !__VLS_ctx.contentTopics.includes(v))
                __VLS_ctx.contentTopics.push(v);
            e.target.value = '';
        }) },
    ...{ class: "input" },
    placeholder: "输入主题后按回车添加",
});
/** @type {__VLS_StyleScopedClasses['input']} */ ;
if (__VLS_ctx.contentTopics.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "free-tags" },
    });
    /** @type {__VLS_StyleScopedClasses['free-tags']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.contentTopics))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (t),
            ...{ class: "free-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['free-tag']} */ ;
        (t);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.contentTopics.length > 0))
                        return;
                    __VLS_ctx.contentTopics = __VLS_ctx.contentTopics.filter(x => x !== t);
                    // @ts-ignore
                    [contentTopics, contentTopics, contentTopics, contentTopics, contentTopics, contentTopics,];
                } },
            ...{ class: "free-tag-remove" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['free-tag-remove']} */ ;
        // @ts-ignore
        [];
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-group" },
});
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "form-label-text" },
});
/** @type {__VLS_StyleScopedClasses['form-label-text']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
    ...{ class: "textarea" },
    value: (__VLS_ctx.notes),
    placeholder: "关于该来源的备注信息…",
    rows: "2",
});
/** @type {__VLS_StyleScopedClasses['textarea']} */ ;
if (__VLS_ctx.entryPoint === 'space_management') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "form-target" },
    });
    /** @type {__VLS_StyleScopedClasses['form-target']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "muted" },
    });
    /** @type {__VLS_StyleScopedClasses['muted']} */ ;
    if (__VLS_ctx.targetChannelId) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "muted" },
        ...{ style: {} },
    });
    /** @type {__VLS_StyleScopedClasses['muted']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-actions" },
});
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('cancel');
            // @ts-ignore
            [entryPoint, notes, targetChannelId, emit,];
        } },
    ...{ class: "btn" },
    disabled: (__VLS_ctx.submitting),
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.doSubmit) },
    ...{ class: "btn primary" },
    disabled: (__VLS_ctx.submitting),
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
(__VLS_ctx.submitting ? '创建中…' : '创建信息源');
if (__VLS_ctx.showVerify) {
    const __VLS_0 = SourceVerifyDialog;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onClose': {} },
        ...{ 'onVerified': {} },
        sourceType: (__VLS_ctx.sourceType),
        sourceIdentity: (__VLS_ctx.sourceIdentity),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClose': {} },
        ...{ 'onVerified': {} },
        sourceType: (__VLS_ctx.sourceType),
        sourceIdentity: (__VLS_ctx.sourceIdentity),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = ({ close: {} },
        { onClose: (...[$event]) => {
                if (!(__VLS_ctx.showVerify))
                    return;
                __VLS_ctx.showVerify = false;
                // @ts-ignore
                [sourceType, sourceIdentity, showVerify, showVerify, submitting, submitting, submitting, doSubmit,];
            } });
    const __VLS_7 = ({ verified: {} },
        { onVerified: (__VLS_ctx.onVerified) });
    var __VLS_3;
    var __VLS_4;
}
// @ts-ignore
[onVerified,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};

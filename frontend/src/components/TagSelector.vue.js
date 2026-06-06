/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, ref } from "vue";
const props = withDefaults(defineProps(), {
    allowFreeInput: false,
    placeholder: "输入标签…",
});
const emit = defineEmits();
const freeInput = ref("");
const selectedSet = computed(() => {
    if (props.mode === "single")
        return new Set(props.modelValue ? [props.modelValue] : []);
    return new Set(props.modelValue || []);
});
function toggleOption(val) {
    if (props.mode === "single") {
        emit("update:modelValue", selectedSet.value.has(val) ? "" : val);
    }
    else {
        const next = new Set(selectedSet.value);
        if (next.has(val))
            next.delete(val);
        else
            next.add(val);
        emit("update:modelValue", [...next]);
    }
}
function addFreeInput() {
    const v = freeInput.value.trim();
    if (!v)
        return;
    if (selectedSet.value.has(v)) {
        freeInput.value = "";
        return;
    }
    if (props.mode === "single") {
        emit("update:modelValue", v);
    }
    else {
        emit("update:modelValue", [...selectedSet.value, v]);
    }
    freeInput.value = "";
}
function removeFreeTag(tag) {
    if (props.mode === "single") {
        emit("update:modelValue", "");
        return;
    }
    const next = [...selectedSet.value].filter(t => t !== tag);
    emit("update:modelValue", next);
}
const freeTags = computed(() => {
    const optionValues = new Set(props.options.map(o => o.value));
    return [...selectedSet.value].filter(v => !optionValues.has(v));
});
const __VLS_defaults = {
    allowFreeInput: false,
    placeholder: "输入标签…",
};
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
/** @type {__VLS_StyleScopedClasses['tag-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['tag-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['free-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "tag-selector" },
});
/** @type {__VLS_StyleScopedClasses['tag-selector']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "tag-options" },
});
/** @type {__VLS_StyleScopedClasses['tag-options']} */ ;
for (const [opt] of __VLS_vFor((__VLS_ctx.options))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleOption(opt.value);
                // @ts-ignore
                [options, toggleOption,];
            } },
        key: (opt.value),
        ...{ class: "tag-pill" },
        ...{ class: ({ active: __VLS_ctx.selectedSet.has(opt.value) }) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['tag-pill']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (opt.label);
    // @ts-ignore
    [selectedSet,];
}
if (__VLS_ctx.freeTags.length > 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "free-tags" },
    });
    /** @type {__VLS_StyleScopedClasses['free-tags']} */ ;
    for (const [t] of __VLS_vFor((__VLS_ctx.freeTags))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            key: (t),
            ...{ class: "free-tag" },
        });
        /** @type {__VLS_StyleScopedClasses['free-tag']} */ ;
        (t);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.freeTags.length > 0))
                        return;
                    __VLS_ctx.removeFreeTag(t);
                    // @ts-ignore
                    [freeTags, freeTags, removeFreeTag,];
                } },
            ...{ class: "free-tag-remove" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['free-tag-remove']} */ ;
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.allowFreeInput) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "free-input-row" },
    });
    /** @type {__VLS_StyleScopedClasses['free-input-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onKeydown: (__VLS_ctx.addFreeInput) },
        ...{ class: "free-input" },
        placeholder: (__VLS_ctx.placeholder),
    });
    (__VLS_ctx.freeInput);
    /** @type {__VLS_StyleScopedClasses['free-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.addFreeInput) },
        ...{ class: "btn-sm" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
}
// @ts-ignore
[allowFreeInput, addFreeInput, addFreeInput, placeholder, freeInput,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __defaults: __VLS_defaults,
    __typeProps: {},
});
export default {};
